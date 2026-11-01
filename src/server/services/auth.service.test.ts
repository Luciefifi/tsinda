import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { validateSession } from "@/server/auth/session";
import { createGuardian, createStudent } from "@/test/factories";
import { loginAdult, loginStudent } from "./auth.service";

describe("loginStudent", () => {
  it("logs in with the right PIN, ignoring username case and spaces", async () => {
    const keza = await createStudent("keza", "4821");
    const result = await loginStudent("  Keza ", "4821");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((await validateSession(result.token))?.user.id).toBe(keza.id);
    }
  });

  it("gives the same answer for a wrong PIN, an unknown user and a paused account", async () => {
    const keza = await createStudent("keza", "4821");
    const invalid = { ok: false, reason: "invalid_credentials" };

    expect(await loginStudent("keza", "0000")).toEqual(invalid);
    expect(await loginStudent("nobody", "4821")).toEqual(invalid);

    await prisma.user.update({ where: { id: keza.id }, data: { isActive: false } });
    expect(await loginStudent("keza", "4821")).toEqual(invalid);
  });

  it("locks the account after 5 wrong PINs, even for the right PIN", async () => {
    await createStudent("keza", "4821");
    for (let attempt = 1; attempt <= 4; attempt++) {
      expect(await loginStudent("keza", "0000")).toMatchObject({ reason: "invalid_credentials" });
    }

    expect(await loginStudent("keza", "0000")).toMatchObject({ ok: false, reason: "locked" });
    expect(await loginStudent("keza", "4821")).toMatchObject({ ok: false, reason: "locked" });
  });

  it("allows login again once the lock has ended", async () => {
    const keza = await createStudent("keza", "4821");
    await prisma.user.update({
      where: { id: keza.id },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });

    expect((await loginStudent("keza", "4821")).ok).toBe(true);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: keza.id } });
    expect(after.lockedUntil).toBeNull();
    expect(after.failedLoginCount).toBe(0);
  });
});

describe("loginAdult", () => {
  it("logs in with phone and password", async () => {
    await createGuardian("+250788123456", "correct horse");

    expect((await loginAdult("+250788123456", "correct horse")).ok).toBe(true);
    expect((await loginAdult("+250788123456", "wrong")).ok).toBe(false);
  });
});
