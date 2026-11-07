import { describe, expect, it } from "vitest";
import { normalizeRwandaPhone } from "./phone";

describe("normalizeRwandaPhone", () => {
  it.each(["0788123456", "0788 123 456", "+250788123456", "250788123456", "250-788-123-456", "788123456"])(
    "understands %s",
    (input) => {
      expect(normalizeRwandaPhone(input)).toBe("+250788123456");
    },
  );

  it.each(["", "12345", "0688123456", "07881234567", "+256788123456", "abc"])("rejects %j", (input) => {
    expect(normalizeRwandaPhone(input)).toBeNull();
  });
});
