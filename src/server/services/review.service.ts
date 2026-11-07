import "server-only";

import { ContentStatus } from "@/generated/prisma/client";
import { assertCan, type Actor } from "@/server/auth/access";
import { prisma } from "@/server/db";

// Reviewing content: reviewers read lessons and questions exactly as pupils
// will, then approve them (DRAFT -> PUBLISHED) or ask for a change with a
// note. Admins see the notes, fix the content files and resolve the notes.

// Thrown when a review action is not possible, with a message for the reviewer.
export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

export type ReviewCounts = { toReview: number; approved: number };

export type UnitOverview = ReviewCounts & {
  key: string;
  grade: number;
  number: number;
  title: string;
};

export type SubjectOverview = { key: string; name: string; units: UnitOverview[] };

type StatusRow = { status: ContentStatus };

function countStatuses(rows: StatusRow[]): ReviewCounts {
  const approved = rows.filter((row) => row.status === ContentStatus.PUBLISHED).length;
  return { toReview: rows.length - approved, approved };
}

const statusesOfTopic = {
  lessons: { select: { status: true } },
  questions: { select: { status: true } },
} as const;

// Every subject with its units, and how much of each unit is still to review.
export async function getReviewOverview(actor: Actor): Promise<SubjectOverview[]> {
  assertCan(actor, "content:review");

  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      key: true,
      name: true,
      units: {
        orderBy: [{ grade: "desc" }, { number: "asc" }],
        select: { key: true, grade: true, number: true, title: true, topics: { select: statusesOfTopic } },
      },
    },
  });

  return subjects.map((subject) => ({
    key: subject.key,
    name: subject.name,
    units: subject.units.map(({ topics, ...unit }) => ({
      ...unit,
      ...countStatuses(topics.flatMap((topic) => [...topic.lessons, ...topic.questions])),
    })),
  }));
}

// One unit with its topics, for choosing what to review next.
export async function getUnitForReview(actor: Actor, unitKey: string) {
  assertCan(actor, "content:review");

  const unit = await prisma.unit.findUnique({
    where: { key: unitKey },
    select: {
      key: true,
      grade: true,
      number: true,
      title: true,
      subject: { select: { name: true } },
      topics: {
        orderBy: { number: "asc" },
        select: { key: true, number: true, title: true, ...statusesOfTopic },
      },
    },
  });
  if (!unit) return null;

  return {
    ...unit,
    topics: unit.topics.map(({ lessons, questions, ...topic }) => ({
      ...topic,
      ...countStatuses([...lessons, ...questions]),
    })),
  };
}

const openNotes = {
  where: { resolvedAt: null },
  orderBy: { createdAt: "asc" },
  select: { id: true, note: true, createdAt: true, author: { select: { fullName: true } } },
} as const;

const reviewedBy = { select: { fullName: true } } as const;

// Everything in one topic, as the reviewer needs to see it.
export async function getTopicForReview(actor: Actor, topicKey: string) {
  assertCan(actor, "content:review");

  return prisma.topic.findUnique({
    where: { key: topicKey },
    select: {
      key: true,
      number: true,
      title: true,
      unit: { select: { key: true, grade: true, number: true, title: true, subject: { select: { name: true } } } },
      lessons: {
        orderBy: { sortOrder: "asc" },
        select: {
          key: true,
          title: true,
          body: true,
          status: true,
          reviewedAt: true,
          reviewedBy,
          reviewNotes: openNotes,
        },
      },
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          key: true,
          source: true,
          sourceRef: true,
          instructions: true,
          needsPicture: true,
          status: true,
          reviewedAt: true,
          reviewedBy,
          stimulus: { select: { title: true, body: true } },
          parts: {
            orderBy: { sortOrder: "asc" },
            select: {
              label: true,
              prompt: true,
              marks: true,
              answerSpec: true,
              markingScheme: true,
              modelAnswer: true,
              explanation: true,
            },
          },
          reviewNotes: openNotes,
        },
      },
    },
  });
}

export type TopicForReview = NonNullable<Awaited<ReturnType<typeof getTopicForReview>>>;

function approval(actor: Actor) {
  return { status: ContentStatus.PUBLISHED, reviewedById: actor.userId, reviewedAt: new Date() };
}

// Content that needs changing must not stay visible to pupils.
const backToDraft = { status: ContentStatus.DRAFT, reviewedById: null, reviewedAt: null };

export async function approveLesson(actor: Actor, lessonKey: string): Promise<void> {
  assertCan(actor, "content:review");
  const { count } = await prisma.lesson.updateMany({ where: { key: lessonKey }, data: approval(actor) });
  if (count === 0) throw new ReviewError("This lesson no longer exists.");
}

export async function approveQuestion(actor: Actor, questionKey: string): Promise<void> {
  assertCan(actor, "content:review");

  const question = await prisma.question.findUnique({ where: { key: questionKey }, select: { needsPicture: true } });
  if (!question) throw new ReviewError("This question no longer exists.");
  if (question.needsPicture) {
    throw new ReviewError("This question still needs its picture, so it cannot be approved yet.");
  }

  await prisma.question.update({ where: { key: questionKey }, data: approval(actor) });
}

export type ReviewTarget = { kind: "lesson" | "question"; key: string };

// Records what needs changing, and takes the item back to draft.
export async function requestChange(actor: Actor, target: ReviewTarget, note: string): Promise<void> {
  assertCan(actor, "content:review");

  const text = note.trim();
  if (!text) throw new ReviewError("Please write what needs to change.");

  await prisma.$transaction(async (tx) => {
    if (target.kind === "lesson") {
      const lesson = await tx.lesson.update({ where: { key: target.key }, data: backToDraft, select: { id: true } });
      await tx.reviewNote.create({ data: { lessonId: lesson.id, authorId: actor.userId, note: text } });
    } else {
      const question = await tx.question.update({ where: { key: target.key }, data: backToDraft, select: { id: true } });
      await tx.reviewNote.create({ data: { questionId: question.id, authorId: actor.userId, note: text } });
    }
  });
}

// The admin's "Changes to make" list: open notes, oldest first.
export async function listOpenNotes(actor: Actor) {
  assertCan(actor, "content:edit");

  return prisma.reviewNote.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      note: true,
      createdAt: true,
      author: { select: { fullName: true } },
      lesson: { select: { key: true, title: true, topic: { select: { key: true } } } },
      question: { select: { key: true, sourceRef: true, topic: { select: { key: true } } } },
    },
  });
}

export async function resolveNote(actor: Actor, noteId: string): Promise<void> {
  assertCan(actor, "content:edit");
  await prisma.reviewNote.updateMany({
    where: { id: noteId, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedById: actor.userId },
  });
}
