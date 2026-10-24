import "server-only";

import { prisma } from "@/server/db";
import { hashSecret, verifySecret } from "@/server/auth/hashing";
import { createSession, invalidateSession } from "@/server/auth/session";

// After this many wrong attempts in a row, the account is locked for a while.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "locked"; lockedUntil: Date };

type LoginCandidate = {
  id: string;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  secretHash: string | null;
};

const candidateSelect = {
  id: true,
  isActive: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const;

// Students log in with username + PIN. Usernames are stored in lowercase.
export async function loginStudent(username: string, pin: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: { ...candidateSelect, pinHash: true },
  });
  return attemptLogin(user && { ...user, secretHash: user.pinHash }, pin);
}

// Adults log in with phone + password. The phone must already be in
// international format (+2507...); converting it is the entry point's job.
export async function loginAdult(phone: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { ...candidateSelect, passwordHash: true },
  });
  return attemptLogin(user && { ...user, secretHash: user.passwordHash }, password);
}

export async function logout(sessionId: string): Promise<void> {
  await invalidateSession(sessionId);
}

async function attemptLogin(user: LoginCandidate | null, secret: string): Promise<LoginResult> {
  // Unknown user, no secret set, or paused account: same answer and the same
  // timing as a wrong secret, so nobody can find out which accounts exist.
  if (!user || !user.secretHash || !user.isActive) {
    await verifySecret(await getDummyHash(), secret);
    return { ok: false, reason: "invalid_credentials" };
  }

  // While locked, the secret is not even checked.
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "locked", lockedUntil: user.lockedUntil };
  }

  if (!(await verifySecret(user.secretHash, secret))) {
    return recordFailedAttempt(user.id);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { ok: true, token: await createSession(user.id) };
}

async function recordFailedAttempt(userId: string): Promise<LoginResult> {
  // increment is atomic in the database, so two attempts at the same moment
  // can't both read the old count.
  const { failedLoginCount } = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });

  if (failedLoginCount < MAX_FAILED_ATTEMPTS) {
    return { ok: false, reason: "invalid_credentials" };
  }

  // Lock, and start counting from zero again once the lock ends.
  const lockedUntil = new Date(Date.now() + LOCKOUT_MS);
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil },
  });
  return { ok: false, reason: "locked", lockedUntil };
}

// A real Argon2id hash of a throwaway value, created once and reused.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashSecret("tsinda-timing-dummy");
  return dummyHash;
}
