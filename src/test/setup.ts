import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "users", "subjects", "stimuli" CASCADE`;
  // Roles created by a test (the built-in ones come from the seed and stay).
  await prisma.$executeRaw`DELETE FROM "roles" WHERE NOT "is_system"`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
