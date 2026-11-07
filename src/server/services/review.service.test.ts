import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, type Actor } from "@/server/auth/access";
import { loadContent } from "@/server/content/load-content";
import { readContent } from "@/server/content/read-content";
import { prisma } from "@/server/db";
import { actorFor, createAdult, createStudent } from "@/test/factories";
import {
  approveLesson,
  approveQuestion,
  getReviewOverview,
  getTopicForReview,
  listOpenNotes,
  requestChange,
  resolveNote,
  ReviewError,
} from "./review.service";

const fixture = path.join(__dirname, "..", "content", "__fixtures__", "valid");

let reviewer: Actor;
let admin: Actor;

beforeEach(async () => {
  await loadContent(prisma, readContent(fixture));
  reviewer = await actorFor((await createAdult("+250788000001", ["reviewer"])).id);
  admin = await actorFor((await createAdult("+250788000002", ["admin"])).id);
});

describe("reading content for review", () => {
  it("counts what is still to review in each unit", async () => {
    const [mathematics] = await getReviewOverview(reviewer);

    expect(mathematics.units).toEqual([
      { key: "math-p6-u04", grade: 6, number: 4, title: "Operations on fractions", toReview: 3, approved: 0 },
    ]);
  });

  it("shows a topic's lesson and questions, in file order", async () => {
    const topic = await getTopicForReview(reviewer, "math-p6-u04-t01");

    expect(topic?.lessons.map((l) => l.key)).toEqual(["math-p6-u04-t01-lesson"]);
    expect(topic?.questions.map((q) => q.key)).toEqual(["math-p6-u04-t01-q1", "math-p6-u04-t01-q2"]);
  });

  it("is only for people who may review", async () => {
    const pupil = await actorFor((await createStudent("keza", "4821")).id);

    await expect(getReviewOverview(pupil)).rejects.toThrow(ForbiddenError);
  });
});

describe("approving", () => {
  it("publishes a lesson and records who approved it", async () => {
    await approveLesson(reviewer, "math-p6-u04-t01-lesson");

    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { key: "math-p6-u04-t01-lesson" } });
    expect(lesson.status).toBe("PUBLISHED");
    expect(lesson.reviewedById).toBe(reviewer.userId);
  });

  it("does not publish a question that still needs its picture", async () => {
    await expect(approveQuestion(reviewer, "math-p6-u04-t01-q2")).rejects.toThrow(ReviewError);
    const question = await prisma.question.findUniqueOrThrow({ where: { key: "math-p6-u04-t01-q2" } });
    expect(question.status).toBe("DRAFT");
  });
});

describe("asking for a change", () => {
  it("records the note and takes published content back to draft", async () => {
    await approveQuestion(reviewer, "math-p6-u04-t01-q1");
    await requestChange(reviewer, { kind: "question", key: "math-p6-u04-t01-q1" }, "  The answer should be 3/4.  ");

    const question = await prisma.question.findUniqueOrThrow({ where: { key: "math-p6-u04-t01-q1" } });
    expect(question).toMatchObject({ status: "DRAFT", reviewedById: null });

    const [note] = await listOpenNotes(admin);
    expect(note).toMatchObject({ note: "The answer should be 3/4.", question: { key: "math-p6-u04-t01-q1" } });
  });

  it("needs some text", async () => {
    await expect(requestChange(reviewer, { kind: "lesson", key: "math-p6-u04-t01-lesson" }, "   ")).rejects.toThrow(
      ReviewError,
    );
  });

  it("lets the admin resolve a note once the file is fixed", async () => {
    await requestChange(reviewer, { kind: "lesson", key: "math-p6-u04-t01-lesson" }, "Use simpler words.");
    const [note] = await listOpenNotes(admin);

    await resolveNote(admin, note.id);

    expect(await listOpenNotes(admin)).toEqual([]);
  });

  it("keeps the notes list for people who may edit content", async () => {
    const pupil = await actorFor((await createStudent("keza", "4821")).id);

    await expect(listOpenNotes(pupil)).rejects.toThrow(ForbiddenError);
  });
});
