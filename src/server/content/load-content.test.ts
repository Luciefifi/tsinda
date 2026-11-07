import path from "node:path";
import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { loadContent } from "./load-content";
import { contentHash, readContent, type ContentTree } from "./read-content";

const readValid = () => readContent(path.join(__dirname, "__fixtures__", "valid"));

// Changes the prompt of the first question, as an edit to its file would.
function editFirstQuestion(content: ContentTree): ContentTree {
  const edited = structuredClone(content);
  const question = edited.units[0].topics[0].questions[0];
  question.parts[0].prompt = "Calculate ½ + ¼. Show your working.";
  // JSON skips undefined values, so this hashes the question without its old hash.
  question.hash = contentHash({ ...question, hash: undefined });
  return edited;
}

describe("loadContent", () => {
  it("saves the whole tree on the first load", async () => {
    const report = await loadContent(prisma, readValid());

    expect(report).toMatchObject({ created: 3, updated: 0, unchanged: 0 });
    expect(await prisma.subject.count()).toBe(2);
    expect(await prisma.topic.count()).toBe(2);

    const question = await prisma.question.findUniqueOrThrow({
      where: { key: "math-p6-u04-t01-q1" },
      include: { parts: { orderBy: { sortOrder: "asc" } } },
    });
    expect(question).toMatchObject({ source: "PAST_PAPER", status: "DRAFT" });
    expect(question.parts.map((p) => [p.label, p.answerType, p.marks])).toEqual([
      ["a", "NUMBER", 2],
      ["b", "TRUE_FALSE", 1],
    ]);
    expect(question.parts[0].answerSpec).toEqual({ type: "number", answer: "3/4", acceptEquivalent: true });
  });

  it("reports coverage per unit", async () => {
    const report = await loadContent(prisma, readValid());

    expect(report.units).toEqual([
      {
        unitKey: "math-p6-u04",
        subjectKey: "mathematics",
        grade: 6,
        number: 4,
        title: "Operations on fractions",
        topics: 2,
        lessons: 1,
        questionsBySource: { past_paper: 1, pupil_book: 1 },
        marks: 4,
        needsPicture: ["math-p6-u04-t01-q2"],
      },
    ]);
  });

  it("leaves unchanged content alone when loaded again", async () => {
    await loadContent(prisma, readValid());
    const second = await loadContent(prisma, readValid());

    expect(second).toMatchObject({ created: 0, updated: 0, unchanged: 3 });
  });

  it("sends published content back to draft when its file changes", async () => {
    await loadContent(prisma, readValid());
    await prisma.question.update({
      where: { key: "math-p6-u04-t01-q1" },
      data: { status: "PUBLISHED", reviewedAt: new Date() },
    });

    const report = await loadContent(prisma, editFirstQuestion(readValid()));

    expect(report).toMatchObject({ updated: 1, sentBackToDraft: ["math-p6-u04-t01-q1"] });
    const question = await prisma.question.findUniqueOrThrow({
      where: { key: "math-p6-u04-t01-q1" },
      include: { parts: { orderBy: { sortOrder: "asc" } } },
    });
    expect(question).toMatchObject({ status: "DRAFT", reviewedAt: null });
    expect(question.parts[0].prompt).toBe("Calculate ½ + ¼. Show your working.");
  });

  it("reports, but never deletes, questions that left the files", async () => {
    await loadContent(prisma, readValid());
    const fewer = structuredClone(readValid());
    fewer.units[0].topics[0].questions.pop();

    const report = await loadContent(prisma, fewer);

    expect(report.missingFromFiles).toEqual(["math-p6-u04-t01-q2"]);
    expect(await prisma.question.count()).toBe(2);
  });

  it("keeps questions in file order, and reordering needs no new review", async () => {
    await loadContent(prisma, readValid());
    await prisma.question.update({
      where: { key: "math-p6-u04-t01-q1" },
      data: { status: "PUBLISHED", reviewedAt: new Date() },
    });

    const swapped = structuredClone(readValid());
    swapped.units[0].topics[0].questions.reverse();
    const report = await loadContent(prisma, swapped);

    expect(report).toMatchObject({ updated: 0, sentBackToDraft: [] });
    const questions = await prisma.question.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, status: true } });
    expect(questions).toEqual([
      { key: "math-p6-u04-t01-q2", status: "DRAFT" },
      { key: "math-p6-u04-t01-q1", status: "PUBLISHED" },
    ]);
  });
});
