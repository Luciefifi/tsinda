// Creates an adult account (admin, reviewer or guardian) from the command line,
// for the very first admin (before anyone can use the admin screens). Usage:
//   npm run create-adult -- --name "Aline Uwase" --phone 0788123456 --password "Kigali@2027" --roles admin
import { parseArgs } from "node:util";
import { passwordProblems } from "@/lib/password-rules";
import { normalizeRwandaPhone } from "@/lib/phone";
import { hashSecret } from "@/server/auth/hashing";
import { prisma } from "@/server/db";

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
  const problems = passwordProblems(password);
  if (problems.length > 0) throw new Error(`Password: ${problems.join(" ")}`);

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
