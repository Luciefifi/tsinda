import { describe, expect, it } from "vitest";
import { questionsFileSchema, unitFileSchema } from "./content-files";

const part = { label: "a", prompt: "Calculate ½ + ¼.", marks: 2, answer: { type: "number", answer: "3/4" } };

describe("questionsFileSchema", () => {
  it("accepts a past-paper question with parts", () => {
    const result = questionsFileSchema.safeParse([
      {
        key: "math-p6-u04-t01-nesa-2024-q5",
        source: "past_paper",
        sourceRef: "NESA 2024 Mathematics, Q5",
        parts: [part, { ...part, label: "b" }],
      },
    ]);
    expect(result.success).toBe(true);
    expect(result.data?.[0].needsPicture).toBe(false);
  });

  it("rejects two parts with the same label", () => {
    const result = questionsFileSchema.safeParse([
      { key: "q1", source: "tsinda", sourceRef: "Tsinda", parts: [part, part] },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects a question without a source reference", () => {
    const result = questionsFileSchema.safeParse([{ key: "q1", source: "tsinda", sourceRef: " ", parts: [part] }]);
    expect(result.success).toBe(false);
  });
});

describe("unitFileSchema", () => {
  it("only accepts upper-primary classes", () => {
    const unit = { key: "math-p3-u01", grade: 3, number: 1, title: "Numbers", topics: [] };
    expect(unitFileSchema.safeParse(unit).success).toBe(false);
  });
});
