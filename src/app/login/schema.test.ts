import { describe, expect, it } from "vitest";
import { z } from "zod";
import { studentLoginSchema } from "./schema";

describe("studentLoginSchema", () => {
  it("accepts a username and a 4-digit PIN, and tidies the username", () => {
    const result = studentLoginSchema.safeParse({ username: "  Keza ", pin: "4821" });
    expect(result).toEqual({ success: true, data: { username: "keza", pin: "4821" } });
  });

  it("explains what is wrong with each field", () => {
    const result = studentLoginSchema.safeParse({ username: "   ", pin: "12a" });
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors).toEqual({
      username: ["Please write your username."],
      pin: ["Your PIN is 4 numbers."],
    });
  });
});
