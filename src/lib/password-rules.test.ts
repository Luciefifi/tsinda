import { describe, expect, it } from "vitest";
import { isValidPin, passwordProblems } from "./password-rules";

describe("passwordProblems", () => {
  it("accepts a password with 8+ characters, a capital, a number and a symbol", () => {
    expect(passwordProblems("Kigali@2027")).toEqual([]);
  });

  it("lists every missing rule", () => {
    expect(passwordProblems("abc")).toEqual([
      "Use at least 8 characters.",
      "Add a capital letter (A-Z).",
      "Add a number (0-9).",
      "Add a symbol, like @ # ! or ?.",
    ]);
  });

  it("counts a space as a symbol, so a phrase works", () => {
    expect(passwordProblems("Inka zanjye 2")).toEqual([]);
  });

  it("refuses very long passwords", () => {
    expect(passwordProblems(`A1@${"a".repeat(200)}`)).toEqual(["Use at most 128 characters."]);
  });
});

describe("isValidPin", () => {
  it("accepts exactly 4 digits", () => {
    expect(isValidPin("0482")).toBe(true);
    expect(isValidPin("482")).toBe(false);
    expect(isValidPin("48a2")).toBe(false);
    expect(isValidPin("48201")).toBe(false);
  });
});
