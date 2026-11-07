import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "users", "subjects", "stimuli" CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
