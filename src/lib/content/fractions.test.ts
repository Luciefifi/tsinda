import { describe, expect, it } from "vitest";
import { splitFractions } from "./fractions";

describe("splitFractions", () => {
  it("finds a fraction inside a sentence", () => {
    expect(splitFractions("Multiply 169 by 4/13.")).toEqual([
      "Multiply 169 by ",
      { numerator: "4", denominator: "13" },
      ".",
    ]);
  });

  it("keeps a mixed number together", () => {
    expect(splitFractions("62 by 3 1/4?")).toEqual(["62 by ", { whole: "3", numerator: "1", denominator: "4" }, "?"]);
  });

  it("finds several fractions", () => {
    expect(splitFractions("1/2 × 2/3")).toEqual([
      { numerator: "1", denominator: "2" },
      " × ",
      { numerator: "2", denominator: "3" },
    ]);
  });

  it("leaves text without fractions alone", () => {
    expect(splitFractions("Read the question twice.")).toEqual(["Read the question twice."]);
  });

  it("does not break dates or school years apart", () => {
    expect(splitFractions("the 2026/2027/28 year")).toEqual(["the 2026/2027/28 year"]);
  });
});
