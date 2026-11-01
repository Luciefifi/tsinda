import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
