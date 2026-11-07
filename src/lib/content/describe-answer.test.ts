import { describe, expect, it } from "vitest";
import { answerSpecSchema } from "@/server/content/answer-spec";
import { describeAnswer } from "./describe-answer";

// Parse first, as the loader does, so defaults are filled in.
const describe_ = (spec: unknown) => describeAnswer(answerSpecSchema.parse(spec));

describe("describeAnswer", () => {
  it.each([
    [{ type: "single_choice", options: ["150,000 Frw", "120,000 Frw"], correct: 1 }, "B: 120,000 Frw"],
    [{ type: "multiple_choice", options: ["cow", "goat", "maize"], correct: [0, 1] }, "A: cow and B: goat"],
    [{ type: "true_false", correct: false }, "False"],
    [{ type: "matching", left: ["cow", "hen"], right: ["mammal", "bird"], pairs: [[0, 0], [1, 1]] }, "cow → mammal; hen → bird"],
    [{ type: "text", accepted: ["small", "little"] }, "small (also accepted: little)"],
    [{ type: "ordering", items: ["She", "goes", "home"] }, "She → goes → home"],
    [{ type: "free_response", maxWords: 150 }, "Marked by a reviewer (at most 150 words)."],
  ])("%j", (spec, expected) => {
    expect(describe_(spec)).toBe(expected);
  });

  it("explains that equal number answers count", () => {
    expect(describe_({ type: "number", answer: "21/32", unit: "km²" })).toBe(
      "21/32 km² (equal values are also accepted, e.g. a decimal or a simplified fraction)",
    );
  });

  it("lists 'give two' answers with their alternatives", () => {
    expect(describe_({ type: "give_n", count: 2, answers: [{ accepted: ["rain"] }, { accepted: ["sun", "sunshine"] }] })).toBe(
      "Any 2 of: rain; sun (also accepted: sunshine)",
    );
  });

  it("separates the automatic and the reviewer's part of a worked answer", () => {
    expect(describe_({ type: "worked", finalAnswer: { answer: "12" }, finalAnswerMarks: 1 })).toBe(
      "Final answer 12 (1 mark). The working is marked by a reviewer.",
    );
  });
});
