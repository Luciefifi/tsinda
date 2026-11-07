import { describe, expect, it } from "vitest";
import { assertCan, can, ForbiddenError, type Actor } from "./access";

const student: Actor = {
  userId: "user-1",
  fullName: "Keza",
  sessionId: "session-1",
  permissions: new Set(["study:take-sessions", "progress:view-self"]),
  mustChangePassword: false,
};

describe("can", () => {
  it("allows a permission the actor has", () => {
    expect(can(student, "study:take-sessions")).toBe(true);
  });

  it("refuses a permission the actor lacks", () => {
    expect(can(student, "people:manage")).toBe(false);
  });

  it("refuses everything when nobody is logged in", () => {
    expect(can(null, "study:take-sessions")).toBe(false);
  });
});

describe("assertCan", () => {
  it("does nothing when allowed", () => {
    expect(() => assertCan(student, "progress:view-self")).not.toThrow();
  });

  it("throws a ForbiddenError naming the missing permission", () => {
    expect(() => assertCan(student, "people:manage")).toThrow(ForbiddenError);
    expect(() => assertCan(student, "people:manage")).toThrow("people:manage");
  });
});
