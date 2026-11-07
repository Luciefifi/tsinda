import type { Actor } from "@/server/auth/access";
import { hashSecret } from "@/server/auth/hashing";
import { createSession, validateSession } from "@/server/auth/session";
import { prisma } from "@/server/db";

// Helpers that create ready-to-use people for tests.

export async function createStudent(username: string, pin: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: "student" } });
  return prisma.user.create({
    data: {
      fullName: `Student ${username}`,
      username,
      pinHash: await hashSecret(pin),
      roles: { create: { roleId: role.id } },
    },
  });
}

export async function createGuardian(phone: string, password: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: "guardian" } });
  return prisma.user.create({
    data: {
      fullName: `Guardian ${phone}`,
      phone,
      passwordHash: await hashSecret(password),
      roles: { create: { roleId: role.id } },
    },
  });
}

export async function createAdult(phone: string, roleKeys: string[]) {
  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } } });
  return prisma.user.create({
    data: {
      fullName: `Adult ${phone}`,
      phone,
      passwordHash: await hashSecret("a long password"),
      roles: { create: roles.map((role) => ({ roleId: role.id })) },
    },
  });
}

// The Actor a service would receive for this user, with their real permissions.
export async function actorFor(userId: string): Promise<Actor> {
  const session = await validateSession(await createSession(userId));
  if (!session) throw new Error("Could not create a session for the test actor.");
  return {
    userId: session.user.id,
    fullName: session.user.fullName,
    sessionId: session.sessionId,
    permissions: session.permissions,
    mustChangePassword: session.user.mustChangePassword,
  };
}
