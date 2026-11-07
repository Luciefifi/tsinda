import "server-only";

import {
  ContentStatus,
  type AnswerType,
  type Prisma,
  type PrismaClient,
  type QuestionSource,
  type StimulusKind,
} from "@/generated/prisma/client";
import type { ContentQuestion, ContentTree, ContentUnit } from "./read-content";

// Saves checked content (from readContent) to the database. Everything is
// matched by its stable key: new items are created, changed items updated,
// unchanged items left alone. A changed item that was PUBLISHED goes back to
// DRAFT so a reviewer checks it again. Nothing is ever deleted here: items
// missing from the files are only reported.

export type UnitReport = {
  unitKey: string;
  subjectKey: string;
  grade: number;
  number: number;
  title: string;
  topics: number;
  lessons: number;
  questionsBySource: Record<string, number>;
  marks: number;
  needsPicture: string[];
};

export type LoadReport = {
  created: number;
  updated: number;
  unchanged: number;
  sentBackToDraft: string[];
  missingFromFiles: string[];
  units: UnitReport[];
};

type Tx = Prisma.TransactionClient;
type Counts = Pick<LoadReport, "created" | "updated" | "unchanged" | "sentBackToDraft">;

export async function loadContent(prisma: PrismaClient, content: ContentTree): Promise<LoadReport> {
  const counts: Counts = { created: 0, updated: 0, unchanged: 0, sentBackToDraft: [] };

  // Subjects first: units point to them.
  const subjectIds = new Map<string, string>();
  for (const [index, subject] of content.subjects.entries()) {
    const saved = await prisma.subject.upsert({
      where: { key: subject.key },
      create: { key: subject.key, name: subject.name, sortOrder: index },
      update: { name: subject.name, sortOrder: index },
    });
    subjectIds.set(subject.key, saved.id);
  }

  // One transaction per unit: a unit is saved completely or not at all.
  for (const unit of content.units) {
    await prisma.$transaction((tx) => saveUnit(tx, unit, subjectIds.get(unit.subjectKey)!, counts), {
      timeout: 60_000,
    });
  }

  const questionKeysInFiles = content.units.flatMap((u) => u.topics.flatMap((t) => t.questions.map((q) => q.key)));
  const missing = await prisma.question.findMany({
    where: { key: { notIn: questionKeysInFiles } },
    select: { key: true },
  });

  return {
    ...counts,
    missingFromFiles: missing.map((q) => q.key),
    units: content.units.map(unitReport),
  };
}

async function saveUnit(tx: Tx, unit: ContentUnit, subjectId: string, counts: Counts): Promise<void> {
  const unitData = {
    subjectId,
    grade: unit.grade,
    number: unit.number,
    title: unit.title,
    keyCompetence: unit.keyCompetence ?? null,
  };
  const savedUnit = await tx.unit.upsert({
    where: { key: unit.key },
    create: { key: unit.key, ...unitData },
    update: unitData,
  });

  const stimulusIds = new Map<string, string>();
  for (const stimulus of unit.stimuli) {
    const data = {
      kind: stimulus.kind.toUpperCase() as StimulusKind,
      title: stimulus.title ?? null,
      body: stimulus.body,
    };
    const saved = await tx.stimulus.upsert({
      where: { key: stimulus.key },
      create: { key: stimulus.key, ...data },
      update: data,
    });
    stimulusIds.set(stimulus.key, saved.id);
  }

  for (const topic of unit.topics) {
    const topicData = { unitId: savedUnit.id, number: topic.number, title: topic.title };
    const savedTopic = await tx.topic.upsert({
      where: { key: topic.key },
      create: { key: topic.key, ...topicData },
      update: topicData,
    });

    if (topic.lesson) {
      await saveLesson(tx, savedTopic.id, `${topic.key}-lesson`, topic.title, topic.lesson, counts);
    }
    for (const question of topic.questions) {
      const stimulusId = question.stimulus ? stimulusIds.get(question.stimulus)! : null;
      await saveQuestion(tx, savedTopic.id, stimulusId, question, counts);
    }
  }
}

async function saveLesson(
  tx: Tx,
  topicId: string,
  key: string,
  title: string,
  lesson: { body: string; hash: string },
  counts: Counts,
): Promise<void> {
  const existing = await tx.lesson.findUnique({ where: { key }, select: { contentHash: true, status: true } });

  if (!existing) {
    await tx.lesson.create({ data: { key, topicId, sortOrder: 0, title, body: lesson.body, contentHash: lesson.hash } });
    counts.created++;
    return;
  }
  if (existing.contentHash === lesson.hash) {
    counts.unchanged++;
    return;
  }

  await tx.lesson.update({
    where: { key },
    data: { title, body: lesson.body, contentHash: lesson.hash, ...backToDraft() },
  });
  counts.updated++;
  if (existing.status === ContentStatus.PUBLISHED) counts.sentBackToDraft.push(key);
}

async function saveQuestion(
  tx: Tx,
  topicId: string,
  stimulusId: string | null,
  question: ContentQuestion,
  counts: Counts,
): Promise<void> {
  const data = {
    topicId,
    stimulusId,
    source: question.source.toUpperCase() as QuestionSource,
    sourceRef: question.sourceRef,
    instructions: question.instructions ?? null,
    needsPicture: question.needsPicture,
    contentHash: question.hash,
  };
  const parts = question.parts.map((part, index) => ({
    label: part.label,
    sortOrder: index,
    prompt: part.prompt,
    marks: part.marks,
    answerType: part.answer.type.toUpperCase() as AnswerType,
    answerSpec: part.answer,
    markingScheme: part.markingScheme ?? null,
    modelAnswer: part.modelAnswer ?? null,
    explanation: part.explanation ?? null,
  }));

  const existing = await tx.question.findUnique({
    where: { key: question.key },
    select: { id: true, contentHash: true, status: true },
  });

  if (!existing) {
    await tx.question.create({ data: { key: question.key, ...data, parts: { create: parts } } });
    counts.created++;
    return;
  }
  if (existing.contentHash === question.hash) {
    counts.unchanged++;
    return;
  }

  // The parts are replaced as a whole. That is safe while no student answers
  // point to them; once study sessions store answers, this must update parts
  // in place instead.
  await tx.questionPart.deleteMany({ where: { questionId: existing.id } });
  await tx.question.update({
    where: { id: existing.id },
    data: { ...data, ...backToDraft(), parts: { create: parts } },
  });
  counts.updated++;
  if (existing.status === ContentStatus.PUBLISHED) counts.sentBackToDraft.push(question.key);
}

// Changed content must be reviewed again before students see it.
function backToDraft() {
  return { status: ContentStatus.DRAFT, reviewedById: null, reviewedAt: null };
}

function unitReport(unit: ContentUnit): UnitReport {
  const questions = unit.topics.flatMap((t) => t.questions);
  const questionsBySource: Record<string, number> = {};
  for (const question of questions) {
    questionsBySource[question.source] = (questionsBySource[question.source] ?? 0) + 1;
  }

  return {
    unitKey: unit.key,
    subjectKey: unit.subjectKey,
    grade: unit.grade,
    number: unit.number,
    title: unit.title,
    topics: unit.topics.length,
    lessons: unit.topics.filter((t) => t.lesson).length,
    questionsBySource,
    marks: questions.flatMap((q) => q.parts).reduce((sum, part) => sum + part.marks, 0),
    needsPicture: questions.filter((q) => q.needsPicture).map((q) => q.key),
  };
}
