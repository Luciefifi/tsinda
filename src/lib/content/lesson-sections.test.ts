import { describe, expect, it } from "vitest";
import { parseLesson, sectionKind } from "./lesson-sections";

describe("parseLesson", () => {
  it("splits a lesson into its title and sections", () => {
    const lesson = parseLesson(
      ["# Adding fractions", "", "## What you will learn", "", "You will add.", "", "## Example 1", "", "- Step one"].join("\r\n"),
    );

    expect(lesson).toEqual({
      title: "Adding fractions",
      intro: "",
      sections: [
        { heading: "What you will learn", kind: "goal", body: "You will add." },
        { heading: "Example 1", kind: "example", body: "- Step one" },
      ],
    });
  });

  it("keeps text written before the first section", () => {
    expect(parseLesson("# Title\n\nA short welcome.\n\n## Remember\n\nKeep, change, flip.").intro).toBe("A short welcome.");
  });
});

describe("sectionKind", () => {
  it.each([
    ["What you will learn", "goal"],
    ["Think first", "think"],
    ["How to do it", "how"],
    ["How to solve a word problem", "how"],
    ["What is a reciprocal?", "how"],
    ["Example 2", "example"],
    ["Examples", "example"],
    ["Remember", "remember"],
    ["Something else", "other"],
  ])("%s → %s", (heading, kind) => {
    expect(sectionKind(heading)).toBe(kind);
  });
});
