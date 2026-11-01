import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createStudent } from "@/test/factories";
import { hashSessionToken } from "./hashing";
import {
  createSession,
  deleteExpiredSessions,
  invalidateAllUserSessions,
  invalidateSession,
  validateSession,
} from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;

// Checks a date is `days` days from now, give or take 5 seconds.
function expectDaysFromNow(date: Date, days: number) {
  expect(Math.abs(date.getTime() - (Date.now() + days * DAY_MS))).toBeLessThan(5000);
}

// Moves a session's expiry, to test what happens later in its life.
async function setExpiry(token: string, daysFromNow: number) {
  await prisma.session.update({
    where: { id: hashSessionToken(token) },
    data: {
      createdAt: new Date(Date.now() - 40 * DAY_MS),
      expiresAt: new Date(Date.now() + daysFromNow * DAY_MS),
    },
  });
}

describe("createSession", () => {
  it("stores only the hash of the token, valid for 30 days", async () => {
    const user = await createStudent("keza", "4821");
    const token = await createSession(user.id);

    const session = await prisma.session.findUniqueOrThrow({ where: { id: hashSessionToken(token) } });
    expect(session.id).not.toBe(token);
    expectDaysFromNow(session.expiresAt, 30);
  });
});

describe("validateSession", () => {
  it("returns the user and their permissions", async () => {
    const user = await createStudent("keza", "4821");
    const result = await validateSession(await createSession(user.id));

    expect(result?.user.id).toBe(user.id);
    expect([...result!.permissions].sort()).toEqual(["progress:view-self", "study:take-sessions"]);
  });

  it("returns null for an unknown token", async () => {
    expect(await validateSession("not-a-real-token")).toBeNull();
  });

  it("extends a session used with less than 15 days left", async () => {
    const user = await createStudent("keza", "4821");
    const token = await createSession(user.id);
    await setExpiry(token, 10);

    expectDaysFromNow((await validateSession(token))!.expiresAt, 30);
  });

  it("does not extend a session with more than 15 days left", async () => {
    const user = await createStudent("keza", "4821");
    const token = await createSession(user.id);
    await setExpiry(token, 20);

    expectDaysFromNow((await validateSession(token))!.expiresAt, 20);
  });

  it("rejects and deletes an expired session", async () => {
    const user = await createStudent("keza", "4821");
    const token = await createSession(user.id);
    await setExpiry(token, -1);

    expect(await validateSession(token)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejects and deletes the session of a paused user", async () => {
    const user = await createStudent("keza", "4821");
    const token = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    expect(await validateSession(token)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });
});

describe("ending sessions", () => {
  it("logs out one device, then every device", async () => {
    const user = await createStudent("keza", "4821");
    const phone = await createSession(user.id);
    await createSession(user.id);

    await invalidateSession(hashSessionToken(phone));
    expect(await prisma.session.count()).toBe(1);

    await invalidateAllUserSessions(user.id);
    expect(await prisma.session.count()).toBe(0);
  });

  it("cleans up only expired sessions", async () => {
    const user = await createStudent("keza", "4821");
    const old = await createSession(user.id);
    await createSession(user.id);
    await setExpiry(old, -1);

    expect(await deleteExpiredSessions()).toBe(1);
    expect(await prisma.session.count()).toBe(1);
  });
});
