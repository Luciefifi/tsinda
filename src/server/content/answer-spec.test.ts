import { describe, expect, it } from "vitest";
import { answerSpecSchema } from "./answer-spec";

const valid = (spec: unknown) => expect(answerSpecSchema.safeParse(spec).success).toBe(true);
const invalid = (spec: unknown, message?: string) => {
  const result = answerSpecSchema.safeParse(spec);
  expect(result.success).toBe(false);
  if (message) expect(JSON.stringify(result.error!.issues)).toContain(message);
};

describe("answerSpecSchema accepts every PLE answer type", () => {
  it.each([
    { type: "single_choice", options: ["9", "15", "17", "21"], correct: 2 },
    { type: "multiple_choice", options: ["cow", "goat", "hen", "maize"], correct: [0, 1] },
    { type: "true_false", correct: false },
    { type: "matching", left: ["cow", "hen"], right: ["mammal", "bird"], pairs: [[0, 0], [1, 1]] },
    { type: "cloze", text: "The sun ___1___ in the east.", wordBox: ["rises", "sets"], blanks: [{ accepted: ["rises"] }] },
    { type: "number", answer: "3/4" },
    { type: "number", answer: "1 1/4", unit: "kg" },
    { type: "text", accepted: ["small", "little"] },
    { type: "give_n", count: 2, answers: [{ accepted: ["rain"] }, { accepted: ["sun", "sunshine"] }, { accepted: ["soil"] }] },
    { type: "ordering", items: ["She", "goes", "to", "school"] },
    { type: "classify", groups: ["living", "non-living"], items: [{ text: "tree", group: 0 }, { text: "stone", group: 1 }] },
    { type: "worked", finalAnswer: { answer: "24", unit: "cm²" }, finalAnswerMarks: 1 },
    { type: "free_response", maxWords: 150 },
  ])("$type", (spec) => valid(spec));
});

describe("answerSpecSchema catches mistakes in answer keys", () => {
  it("rejects an unknown type", () => invalid({ type: "essay" }));

  it("rejects a choice answer pointing past the options", () =>
    invalid({ type: "single_choice", options: ["a", "b"], correct: 2 }, "does not exist"));

  it("rejects a number that pupils could not write", () => invalid({ type: "number", answer: "three quarters" }));

  it("rejects a cloze whose gaps and answers don't match", () =>
    invalid({ type: "cloze", text: "A ___1___ and ___2___.", blanks: [{ accepted: ["x"] }] }, "2 gaps but 1 blanks"));

  it("rejects 'give three' with only two valid answers", () =>
    invalid({ type: "give_n", count: 3, answers: [{ accepted: ["a"] }, { accepted: ["b"] }] }, "more than the number"));

  it("rejects a matching key that matches one item twice", () =>
    invalid({ type: "matching", left: ["a", "b"], right: ["x", "y"], pairs: [[0, 0], [0, 1]] }, "matched twice"));

  it("fills in the default: equivalent numbers are accepted", () => {
    expect(answerSpecSchema.parse({ type: "number", answer: "3/4" })).toEqual({
      type: "number",
      answer: "3/4",
      acceptEquivalent: true,
    });
  });
});
