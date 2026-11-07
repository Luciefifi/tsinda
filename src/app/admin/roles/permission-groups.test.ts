import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/server/auth/permissions";
import { GROUPED_KEYS } from "./permission-groups";

describe("PERMISSION_GROUPS", () => {
  it("shows every permission on the roles screen", () => {
    const missing = PERMISSIONS.map((p) => p.key).filter((key) => !GROUPED_KEYS.has(key));
    expect(missing).toEqual([]);
  });
});
