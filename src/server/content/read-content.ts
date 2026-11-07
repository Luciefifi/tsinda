import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import {
  questionsFileSchema,
  stimuliFileSchema,
  subjectsFileSchema,
  unitFileSchema,
  type QuestionsFile,
  type StimuliFile,
  type SubjectsFile,
  type UnitFile,
} from "./content-files";

// Reads every content file, checks it, and returns the whole content as one
// tree. Nothing touches the database here, so a mistake anywhere stops the
// load before anything is saved.

export type ContentQuestion = QuestionsFile[number] & { hash: string };

export type ContentTopic = UnitFile["topics"][number] & {
  lesson: { body: string; hash: string } | null;
  questions: ContentQuestion[];
};

export type ContentUnit = Omit<UnitFile, "topics"> & {
  subjectKey: string;
  stimuli: StimuliFile;
  topics: ContentTopic[];
};

export type ContentTree = {
  subjects: SubjectsFile;
  units: ContentUnit[];
};

export type ContentProblem = { file: string; message: string };

// Thrown when any file is wrong. Lists every problem found, not just the first.
export class ContentError extends Error {
  readonly problems: ContentProblem[];

  constructor(problems: ContentProblem[]) {
    super(`Found ${problems.length} problem(s) in the content files.`);
    this.name = "ContentError";
    this.problems = problems;
  }
}

// A fingerprint of a lesson or question. If the content changes, so does the hash.
export function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function readContent(contentDir: string): ContentTree {
  const problems: ContentProblem[] = [];
  const relative = (file: string) => path.relative(contentDir, file).replaceAll("\\", "/");

  // Reads and checks one JSON file. Returns null (and records why) if it is wrong.
  function readJson<T extends z.ZodType>(file: string, schema: T): z.infer<T> | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      problems.push({ file: relative(file), message: `Not valid JSON: ${(error as Error).message}` });
      return null;
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        problems.push({ file: relative(file), message: `${issue.path.join(".") || "(file)"}: ${issue.message}` });
      }
      return null;
    }
    return result.data;
  }

  const subjects = readJson(path.join(contentDir, "subjects.json"), subjectsFileSchema);
  if (!subjects) {
    throw new ContentError(problems);
  }

  const units: ContentUnit[] = [];
  const questionFiles = new Map<string, string>(); // question key -> file, to find duplicates

  for (const subject of subjects) {
    const subjectDir = path.join(contentDir, subject.key);
    if (!existsSync(subjectDir)) continue; // No content for this subject yet.

    for (const unitFolder of readdirSync(subjectDir, { withFileTypes: true })) {
      const unitDir = path.join(subjectDir, unitFolder.name);
      const unitFile = path.join(unitDir, "unit.json");
      if (!unitFolder.isDirectory() || !existsSync(unitFile)) continue;

      const unit = readJson(unitFile, unitFileSchema);
      if (!unit) continue;

      const stimuliFile = path.join(unitDir, "stimuli.json");
      const stimuli = existsSync(stimuliFile) ? (readJson(stimuliFile, stimuliFileSchema) ?? []) : [];
      const stimulusKeys = new Set(stimuli.map((s) => s.key));

      const topics: ContentTopic[] = [];
      for (const topic of unit.topics) {
        const topicDir = path.join(unitDir, topic.folder);
        if (!existsSync(topicDir)) {
          problems.push({ file: relative(unitFile), message: `Topic folder "${topic.folder}" does not exist.` });
          continue;
        }

        const lessonFile = path.join(topicDir, "lesson.md");
        // Windows and Linux end lines differently (\r\n or \n). Treat them the
        // same, so checking a file out on another computer doesn't change it.
        const lessonBody = existsSync(lessonFile)
          ? readFileSync(lessonFile, "utf8").replace(/\r\n/g, "\n").trim()
          : null;

        const questionsFile = path.join(topicDir, "questions.json");
        const questions = existsSync(questionsFile) ? (readJson(questionsFile, questionsFileSchema) ?? []) : [];

        for (const question of questions) {
          const seenIn = questionFiles.get(question.key);
          if (seenIn) {
            problems.push({ file: relative(questionsFile), message: `Question key "${question.key}" is also used in ${seenIn}.` });
          }
          questionFiles.set(question.key, relative(questionsFile));

          if (question.stimulus && !stimulusKeys.has(question.stimulus)) {
            problems.push({
              file: relative(questionsFile),
              message: `Question "${question.key}" uses stimulus "${question.stimulus}", which is not in this unit's stimuli.json.`,
            });
          }
        }

        topics.push({
          ...topic,
          lesson: lessonBody ? { body: lessonBody, hash: contentHash({ title: topic.title, body: lessonBody }) } : null,
          questions: questions.map((question) => ({ ...question, hash: contentHash(question) })),
        });
      }

      units.push({ ...unit, subjectKey: subject.key, stimuli, topics });
    }
  }

  if (problems.length > 0) {
    throw new ContentError(problems);
  }
  return { subjects, units };
}
