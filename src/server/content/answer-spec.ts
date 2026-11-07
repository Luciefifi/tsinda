import { z } from "zod";

// The answer key of one question part. Each answer type has its own shape;
// "type" says which one it is. These are stored as JSONB in
// question_parts.answer_spec, so these schemas are the only thing that
// guarantees their shape.

const text = z.string().trim().min(1);

// A number answer written the way pupils write it: "12", "0.75", "3/4",
// "1 1/4" or "-5".
export const NUMBER_PATTERN = /^-?(\d+(\.\d+)?|\d+\/\d+|\d+ \d+\/\d+)$/;
const numberText = z.string().trim().regex(NUMBER_PATTERN, 'Write a number like "12", "0.75", "3/4" or "1 1/4".');

const singleChoice = z.object({
  type: z.literal("single_choice"),
  options: z.array(text).min(2).max(6),
  // Index of the right option, counting from 0.
  correct: z.number().int().min(0),
});

const multipleChoice = z.object({
  type: z.literal("multiple_choice"),
  options: z.array(text).min(3).max(8),
  correct: z.array(z.number().int().min(0)).min(2),
});

const trueFalse = z.object({
  type: z.literal("true_false"),
  correct: z.boolean(),
});

const matching = z.object({
  type: z.literal("matching"),
  left: z.array(text).min(2),
  right: z.array(text).min(2),
  // [left index, right index] for every correct pair.
  pairs: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).min(2),
});

const cloze = z.object({
  type: z.literal("cloze"),
  // The passage with numbered gaps: "The sun ___1___ in the east."
  text: text,
  // The words to choose from, when the paper gives a word box.
  wordBox: z.array(text).optional(),
  // Accepted answers for gap 1, gap 2, ...
  blanks: z.array(z.object({ accepted: z.array(text).min(1) })).min(1),
});

const number = z.object({
  type: z.literal("number"),
  answer: numberText,
  // Accept any equal value: 3/4, 0.75 and 6/8 all count.
  acceptEquivalent: z.boolean().default(true),
  unit: text.optional(),
});

const textAnswer = z.object({
  type: z.literal("text"),
  // Compared ignoring capitals and extra spaces.
  accepted: z.array(text).min(1),
});

const giveN = z.object({
  type: z.literal("give_n"),
  // "Give two reasons": how many the pupil must give.
  count: z.number().int().min(1),
  // Every valid answer, each with the ways it may be written.
  answers: z.array(z.object({ accepted: z.array(text).min(1) })).min(1),
});

const ordering = z.object({
  type: z.literal("ordering"),
  // In the correct order; the app shows them shuffled.
  items: z.array(text).min(2),
});

const classify = z.object({
  type: z.literal("classify"),
  groups: z.array(text).min(2),
  items: z.array(z.object({ text: text, group: z.number().int().min(0) })).min(2),
});

const worked = z.object({
  type: z.literal("worked"),
  // The final answer is marked automatically; the working by a reviewer.
  finalAnswer: number.omit({ type: true }),
  finalAnswerMarks: z.number().int().min(1),
});

const freeResponse = z.object({
  type: z.literal("free_response"),
  maxWords: z.number().int().min(1).optional(),
});

export const answerSpecSchema = z
  .discriminatedUnion("type", [
    singleChoice,
    multipleChoice,
    trueFalse,
    matching,
    cloze,
    number,
    textAnswer,
    giveN,
    ordering,
    classify,
    worked,
    freeResponse,
  ])
  .superRefine((spec, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });

    switch (spec.type) {
      case "single_choice":
        if (spec.correct >= spec.options.length) issue("'correct' points to an option that does not exist.");
        break;
      case "multiple_choice":
        if (spec.correct.some((i) => i >= spec.options.length)) issue("'correct' points to an option that does not exist.");
        if (new Set(spec.correct).size !== spec.correct.length) issue("'correct' lists the same option twice.");
        break;
      case "matching":
        if (spec.pairs.some(([l, r]) => l >= spec.left.length || r >= spec.right.length)) {
          issue("A pair points to an item that does not exist.");
        }
        if (new Set(spec.pairs.map(([l]) => l)).size !== spec.pairs.length) issue("A left item is matched twice.");
        break;
      case "cloze": {
        const gaps = spec.text.match(/___\d+___/g) ?? [];
        if (gaps.length !== spec.blanks.length) issue(`The text has ${gaps.length} gaps but ${spec.blanks.length} blanks are given.`);
        break;
      }
      case "give_n":
        if (spec.count > spec.answers.length) issue("'count' is more than the number of valid answers.");
        break;
      case "classify":
        if (spec.items.some((item) => item.group >= spec.groups.length)) issue("An item points to a group that does not exist.");
        break;
    }
  });

export type AnswerSpec = z.infer<typeof answerSpecSchema>;
export type AnswerSpecType = AnswerSpec["type"];

// Parts of these types are marked (fully or partly) by a reviewer.
export const HUMAN_MARKED_TYPES: readonly AnswerSpecType[] = ["worked", "free_response"];
