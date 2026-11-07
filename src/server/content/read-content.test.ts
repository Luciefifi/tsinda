import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContentError, readContent } from "./read-content";

const fixture = (name: string) => path.join(__dirname, "__fixtures__", name);

// Reads a fixture that should fail, and returns its problems as "file: message".
function problemsIn(name: string): string[] {
  try {
    readContent(fixture(name));
  } catch (error) {
    if (error instanceof ContentError) {
      return error.problems.map((p) => `${p.file}: ${p.message}`);
    }
    throw error;
  }
  throw new Error(`Expected the "${name}" fixture to have problems.`);
}

describe("readContent", () => {
  it("reads a unit with its topics, lesson, stimuli and questions", () => {
    const content = readContent(fixture("valid"));

    expect(content.subjects.map((s) => s.key)).toEqual(["mathematics", "english"]);
    expect(content.units).toHaveLength(1);

    const [unit] = content.units;
    expect(unit).toMatchObject({ key: "math-p6-u04", subjectKey: "mathematics", grade: 6 });
    expect(unit.stimuli.map((s) => s.key)).toEqual(["math-p6-u04-cake-table"]);

    const [adding, subtracting] = unit.topics;
    expect(adding.lesson?.body).toContain("Make the bottom numbers the same");
    expect(adding.questions.map((q) => q.key)).toEqual(["math-p6-u04-t01-q1", "math-p6-u04-t01-q2"]);
    expect(adding.questions[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(subtracting.lesson).toBeNull();
  });

  it("lists every problem, each with its file", () => {
    expect(problemsIn("invalid")).toEqual([
      "mathematics/p6-u04-fractions/t01-adding-fractions/questions.json: 0.parts.0.answer: 'correct' points to an option that does not exist.",
      'mathematics/p6-u04-fractions/unit.json: Topic folder "missing-folder" does not exist.',
    ]);
  });

  it("catches a question pointing to a passage or table that does not exist", () => {
    expect(problemsIn("missing-stimulus")).toEqual([
      "mathematics/p6-u04-fractions/t01-adding-fractions/questions.json: " +
        `Question "math-p6-u04-t01-q1" uses stimulus "no-such-table", which is not in this unit's stimuli.json.`,
    ]);
  });
});
