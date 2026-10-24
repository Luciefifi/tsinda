// Seeds the system roles and syncs permissions from code.
// Safe to run any number of times (idempotent). Run with: npx prisma db seed
//
// Rule for defaults: a role-permission link is created only when the role or
// the permission is new, so changes an admin makes later are never undone.
// The admin role always gets every permission.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ADMIN_ROLE, PERMISSIONS, SYSTEM_ROLES } from "../src/server/auth/permissions";

// The seed is a separate program, not part of the Next.js app, so it creates
// its own client instead of importing src/server/db.ts (which is server-only).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1. Remember what already exists, to know what is new.
    const existingRoleKeys = new Set(
      (await tx.role.findMany({ select: { key: true } })).map((r) => r.key),
    );
    const existingPermissionKeys = new Set(
      (await tx.permission.findMany({ select: { key: true } })).map((p) => p.key),
    );

    // 2. System roles. Existing roles keep their name and description,
    //    because an admin may have changed them.
    for (const role of SYSTEM_ROLES) {
      await tx.role.upsert({
        where: { key: role.key },
        create: { ...role, isSystem: true },
        update: { isSystem: true },
      });
    }

    // 3. Permissions. Code owns them, so descriptions are kept up to date
    //    and permissions removed from code are deleted (their links cascade).
    for (const { key, description } of PERMISSIONS) {
      await tx.permission.upsert({
        where: { key },
        create: { key, description },
        update: { description },
      });
    }
    const removed = await tx.permission.deleteMany({
      where: { key: { notIn: PERMISSIONS.map((p) => p.key) } },
    });

    // 4. Default role-permission links.
    const roleIds = new Map(
      (await tx.role.findMany({ select: { id: true, key: true } })).map((r) => [r.key, r.id]),
    );
    const permissionIds = new Map(
      (await tx.permission.findMany({ select: { id: true, key: true } })).map((p) => [p.key, p.id]),
    );

    const links: { roleId: string; permissionId: string }[] = [];
    for (const permission of PERMISSIONS) {
      const permissionId = permissionIds.get(permission.key)!;
      const isNewPermission = !existingPermissionKeys.has(permission.key);

      links.push({ roleId: roleIds.get(ADMIN_ROLE)!, permissionId });

      for (const roleKey of permission.defaultRoles) {
        if (isNewPermission || !existingRoleKeys.has(roleKey)) {
          links.push({ roleId: roleIds.get(roleKey)!, permissionId });
        }
      }
    }

    const created = await tx.rolePermission.createMany({
      data: links,
      skipDuplicates: true,
    });

    console.log(
      `Seed done: ${SYSTEM_ROLES.length} system roles, ${PERMISSIONS.length} permissions, ` +
        `${created.count} new role-permission links, ${removed.count} permissions removed.`,
    );
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
