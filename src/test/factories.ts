import { prisma } from "@/server/db";
import { hashSecret } from "@/server/auth/hashing";

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
