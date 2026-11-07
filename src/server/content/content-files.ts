import { z } from "zod";
import { answerSpecSchema } from "./answer-spec";

// The shape of the files under content/. The content loader reads them,
// checks them with these schemas, then saves them to the database.
//
//   content/
//     subjects.json
//     mathematics/
//       p6-u04-operations-on-fractions/
//         unit.json                 the unit and its topics
//         stimuli.json              (optional) shared passages, tables, diagrams
//         images/                   pictures used by lessons and questions
//         t01-adding-fractions/
//           lesson.md               what the pupil reads
//           questions.json          the questions for this topic

// Stable ids written in lowercase words joined by dashes: "math-p6-u04-t01".
export const contentKey = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words joined by dashes.");

const text = z.string().trim().min(1);

export const subjectsFileSchema = z
  .array(z.object({ key: contentKey, name: text }))
  .min(1)
  .refine((subjects) => new Set(subjects.map((s) => s.key)).size === subjects.length, "Each subject key must be unique.");

export const unitFileSchema = z.object({
  key: contentKey,
  grade: z.number().int().min(4).max(6),
  number: z.number().int().min(1),
  title: text,
  keyCompetence: text.optional(),
  topics: z
    .array(
      z.object({
        key: contentKey,
        number: z.number().int().min(1),
        title: text,
        // The folder holding lesson.md and questions.json.
        folder: z.string().regex(/^[a-z0-9-]+$/),
      }),
    )
    .min(1),
});

export const stimuliFileSchema = z.array(
  z.object({
    key: contentKey,
    kind: z.enum(["passage", "table", "diagram"]),
    title: text.optional(),
    body: text,
  }),
);

const questionPartSchema = z.object({
  // "a", "b"... or "" for a question with a single part.
  label: z.string().regex(/^[a-z0-9()]*$/),
  prompt: text,
  marks: z.number().int().min(1),
  answer: answerSpecSchema,
  markingScheme: text.optional(),
  modelAnswer: text.optional(),
  explanation: text.optional(),
});

export const questionsFileSchema = z.array(
  z
    .object({
      key: contentKey,
      source: z.enum(["pupil_book", "past_paper", "mock", "tsinda"]),
      // Exactly where it comes from, e.g. "NESA 2024 Mathematics, Q5".
      sourceRef: text,
      stimulus: contentKey.optional(),
      instructions: text.optional(),
      // True until the question's diagram has been added.
      needsPicture: z.boolean().default(false),
      parts: z.array(questionPartSchema).min(1),
    })
    .refine((q) => new Set(q.parts.map((p) => p.label)).size === q.parts.length, "Each part label must be unique.")
    .refine((q) => q.parts.length === 1 || q.parts.every((p) => p.label !== ""), "Questions with several parts need a label on each part."),
);

export type SubjectsFile = z.infer<typeof subjectsFileSchema>;
export type UnitFile = z.infer<typeof unitFileSchema>;
export type StimuliFile = z.infer<typeof stimuliFileSchema>;
export type QuestionsFile = z.infer<typeof questionsFileSchema>;
