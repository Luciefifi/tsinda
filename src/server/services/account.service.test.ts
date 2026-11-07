import { describe, expect, it } from "vitest";
import { createSession, validateSession } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { actorFor, createAdult, createStudent } from "@/test/factories";
import { changeOwnPassword } from "./account.service";
import { loginAdult } from "./auth.service";

// createAdult's factory password.
const CURRENT = "a long password";
const NEW = "Kigali@2027";

describe("changeOwnPassword", () => {
  it("changes the password, clears the must-change flag and logs out other devices only", async () => {
    const adult = await createAdult("+250788000001", ["guardian"]);
    await prisma.user.update({ where: { id: adult.id }, data: { mustChangePassword: true } });
    const otherDevice = await createSession(adult.id);
    const actor = await actorFor(adult.id);
    expect(actor.mustChangePassword).toBe(true);

    await changeOwnPassword(actor, { currentPassword: CURRENT, newPassword: NEW, confirmPassword: NEW });

    expect(await loginAdult("+250788000001", NEW)).toMatchObject({ ok: true, mustChangePassword: false });
    expect(await validateSession(otherDevice)).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: actor.sessionId } })).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "password_changed", targetUserId: adult.id } })).toBe(1);
  });

  it("explains each problem in the right field", async () => {
    const actor = await actorFor((await createAdult("+250788000001", ["guardian"])).id);
    const change = (currentPassword: string, newPassword: string, confirmPassword = newPassword) =>
      changeOwnPassword(actor, { currentPassword, newPassword, confirmPassword });

    await expect(change("wrong", NEW)).rejects.toMatchObject({ field: "currentPassword" });
    await expect(change(CURRENT, "weakpass")).rejects.toMatchObject({ field: "newPassword" });
    await expect(change(CURRENT, NEW, "Kigali@2028")).rejects.toMatchObject({ field: "confirmPassword" });
  });

  it("refuses pupils, who use a PIN", async () => {
    const actor = await actorFor((await createStudent("keza", "4821")).id);
    await expect(
      changeOwnPassword(actor, { currentPassword: "4821", newPassword: NEW, confirmPassword: NEW }),
    ).rejects.toThrow(/PIN/);
  });
});
