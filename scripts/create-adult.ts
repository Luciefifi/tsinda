// Creates an adult account (admin, reviewer or guardian) from the command line,
// until the admin screens exist. Usage:
//   npm run create-adult -- --name "Aline Uwase" --phone 0788123456 --password "a long password" --roles reviewer,guardian
import { parseArgs } from "node:util";
import { normalizeRwandaPhone } from "@/lib/phone";
import { hashSecret } from "@/server/auth/hashing";
import { prisma } from "@/server/db";

const MIN_PASSWORD_LENGTH = 8;

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    phone: { type: "string" },
    password: { type: "string" },
    roles: { type: "string" },
  },
});

async function main() {
  const fullName = values.name?.trim();
  const phone = normalizeRwandaPhone(values.phone ?? "");
  const password = values.password ?? "";
  const roleKeys = (values.roles ?? "").split(",").map((r) => r.trim()).filter(Boolean);

  if (!fullName || !values.phone || !password || roleKeys.length === 0) {
    throw new Error('Usage: npm run create-adult -- --name "Full Name" --phone 0788123456 --password "..." --roles reviewer');
  }
  if (!phone) throw new Error(`"${values.phone}" is not a Rwandan mobile number.`);
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } } });
  const unknown = roleKeys.filter((key) => !roles.some((role) => role.key === key));
  if (unknown.length > 0) throw new Error(`Unknown role(s): ${unknown.join(", ")}.`);

  const user = await prisma.user.create({
    data: {
      fullName,
      phone,
      passwordHash: await hashSecret(password),
      roles: { create: roles.map((role) => ({ roleId: role.id })) },
    },
  });

  console.log(`Created "${user.fullName}" (${user.phone}) with role(s): ${roleKeys.join(", ")}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
