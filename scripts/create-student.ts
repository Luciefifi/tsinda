
import { parseArgs } from "node:util";
import { hashSecret } from "@/server/auth/hashing";
import { prisma } from "@/server/db";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    username: { type: "string" },
    pin: { type: "string" },
    "exam-year": { type: "string" },
  },
});

async function main() {
  const fullName = values.name?.trim();
  const username = values.username?.trim().toLowerCase();
  const pin = values.pin;
  const examYear = Number(values["exam-year"]);

  if (!fullName || !username || !pin || !Number.isInteger(examYear)) {
    throw new Error('Usage: npm run create-student -- --name "Full Name" --username keza --pin 1234 --exam-year 2027');
  }
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("The PIN must be exactly 4 numbers.");
  }

  const studentRole = await prisma.role.findUniqueOrThrow({ where: { key: "student" } });


  const user = await prisma.user.create({
    data: {
      fullName,
      username,
      pinHash: await hashSecret(pin),
      roles: { create: { roleId: studentRole.id } },
      studentProfile: { create: { examYear } },
    },
  });

  console.log(`Created student "${user.fullName}" (username: ${user.username}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
