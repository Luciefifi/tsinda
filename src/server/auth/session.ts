import "server-only";

import { prisma } from "@/server/db";
import { generateSessionToken, hashSessionToken } from "./hashing";
import type { PermissionKey } from "./permissions";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// A session ends after 30 days without use. Using it in the second half of
// that window extends it to a full 30 days again, so a device in regular use
// stays logged in until someone logs out.
const SESSION_LIFETIME_MS = 30 * DAY_MS;
const EXTEND_WHEN_LESS_THAN_MS = SESSION_LIFETIME_MS / 2;

// lastUsedAt is updated at most once an hour, to avoid a write on every request.
const LAST_USED_PRECISION_MS = HOUR_MS;

export type SessionUser = {
  id: string;
  fullName: string;
};

export type ValidatedSession = {
  sessionId: string;
  expiresAt: Date;
  user: SessionUser;
  permissions: ReadonlySet<PermissionKey>;
};

// Returns the token for the cookie. Only its hash is stored.
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  await prisma.session.create({
    data: {
      id: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    },
  });
  return token;
}

// Checks the token from the cookie. Returns null if the session is unknown,
// expired, or belongs to a paused user (those sessions are deleted).
export async function validateSession(token: string): Promise<ValidatedSession | null> {
  const sessionId = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          isActive: true,
          roles: {
            select: {
              role: {
                select: { permissions: { select: { permission: { select: { key: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!session) {
    return null;
  }

  const now = Date.now();
  if (session.expiresAt.getTime() <= now || !session.user.isActive) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    return null;
  }

  let expiresAt = session.expiresAt;
  const shouldExtend = expiresAt.getTime() - now < EXTEND_WHEN_LESS_THAN_MS;
  const lastUsedIsStale = now - session.lastUsedAt.getTime() > LAST_USED_PRECISION_MS;

  if (shouldExtend || lastUsedIsStale) {
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        lastUsedAt: new Date(now),
        expiresAt: shouldExtend ? new Date(now + SESSION_LIFETIME_MS) : undefined,
      },
    });
    expiresAt = updated.expiresAt;
  }

  // Permission keys in the database are synced from code by the seed script,
  // so they are always valid PermissionKeys.
  const permissions = new Set(
    session.user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.key as PermissionKey),
    ),
  );

  return {
    sessionId,
    expiresAt,
    user: { id: session.user.id, fullName: session.user.fullName },
    permissions,
  };
}

// Log out this device.
export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

// Log out every device of a user, e.g. after a password change or a lost phone.
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// Cleanup for a scheduled job. Uses the index on expires_at.
export async function deleteExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
