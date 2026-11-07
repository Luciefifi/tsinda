import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { assertCan, can, ForbiddenError, type Actor } from "@/server/auth/access";
import { ADMIN_ROLE, PERMISSIONS, type PermissionKey } from "@/server/auth/permissions";
import { recordAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { isUniqueViolation, UserFacingError } from "./errors";

// Managing roles (decided 2026-11-07, option A):
// - Admin is locked: it always has every permission and can't be changed.
// - The built-in roles (Student, Guardian, Reviewer) can be renamed and their
//   permissions ticked on or off, but never deleted: the app relies on them.
// - New roles are fully editable, and can be deleted once nobody has them.
// - Permissions themselves are defined in code (permissions.ts), because code
//   is what checks them; this screen only decides which role has which.

type Tx = Prisma.TransactionClient;

export type RoleSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isLocked: boolean; // the Admin role
  peopleCount: number;
  permissionCount: number;
};

export type RoleDetail = RoleSummary & {
  permissionKeys: PermissionKey[];
  people: { id: string; fullName: string }[];
};

const ALL_PERMISSION_KEYS: readonly string[] = PERMISSIONS.map((permission) => permission.key);

// Lists roles for the roles screen, and for the role checkboxes when adding
// or editing an adult, so either permission is enough.
export async function listRoles(actor: Actor): Promise<RoleSummary[]> {
  if (!can(actor, "roles:manage") && !can(actor, "people:manage")) throw new ForbiddenError("roles:manage");

  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      _count: { select: { users: true, permissions: true } },
    },
  });

  return roles.map(({ _count, ...role }) => ({
    ...role,
    isLocked: role.key === ADMIN_ROLE,
    peopleCount: _count.users,
    permissionCount: _count.permissions,
  }));
}

export async function getRole(actor: Actor, key: string): Promise<RoleDetail | null> {
  assertCan(actor, "roles:manage");

  const role = await prisma.role.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { permission: { select: { key: true } } } },
      users: { select: { user: { select: { id: true, fullName: true } } }, orderBy: { user: { fullName: "asc" } } },
    },
  });
  if (!role) return null;

  const permissionKeys = role.permissions
    .map(({ permission }) => permission.key)
    .filter((k): k is PermissionKey => ALL_PERMISSION_KEYS.includes(k));

  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isLocked: role.key === ADMIN_ROLE,
    peopleCount: role.users.length,
    permissionCount: permissionKeys.length,
    permissionKeys,
    people: role.users.map(({ user }) => user),
  };
}

// ─── Checking input ───────────────────────────────────────────

function cleanRoleName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new UserFacingError("Please give the role a name.", "name");
  if (name.length > 40) throw new UserFacingError("The name is too long (40 characters at most).", "name");
  return name;
}

function cleanDescription(value: string | undefined): string | null {
  const description = value?.trim().replace(/\s+/g, " ") ?? "";
  if (description.length > 200) throw new UserFacingError("The description is too long.", "description");
  return description || null;
}

function cleanPermissionKeys(keys: string[]): PermissionKey[] {
  const unknown = keys.filter((key) => !ALL_PERMISSION_KEYS.includes(key));
  if (unknown.length > 0) throw new UserFacingError(`Unknown permission: ${unknown.join(", ")}.`, "permissions");
  return [...new Set(keys)] as PermissionKey[];
}

// "Head teacher" -> "head_teacher": the key code and URLs use. Keys never
// change after creation, so renaming a role keeps its links working.
export function roleKeyFromName(name: string): string {
  const slug = name
    .normalize("NFKD") // "é" becomes "e" + an accent mark...
    .replace(/\p{M}/gu, "") // ...and the mark is dropped.
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return /^[a-z]/.test(slug) ? slug : `role_${slug}`.replace(/_+$/, "");
}

const nameTaken = new UserFacingError("Another role already has this name.", "name");

async function assertNameFree(tx: Tx, name: string, exceptRoleId?: string): Promise<void> {
  const other = await tx.role.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptRoleId && { id: { not: exceptRoleId } }) },
    select: { id: true },
  });
  if (other) throw nameTaken;
}

async function findRoleOrFail(tx: Tx, key: string) {
  const role = await tx.role.findUnique({ where: { key }, select: { id: true, key: true, name: true, description: true, isSystem: true } });
  if (!role) throw new UserFacingError("This role no longer exists.");
  return role;
}

async function permissionIds(tx: Tx, keys: PermissionKey[]): Promise<Map<string, string>> {
  const rows = await tx.permission.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
  return new Map(rows.map((row) => [row.key, row.id]));
}

async function inTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(work);
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken;
    throw error;
  }
}

// ─── Changing roles ───────────────────────────────────────────

export type NewRole = { name: string; description?: string; permissionKeys: string[] };

export async function createRole(actor: Actor, input: NewRole): Promise<string> {
  assertCan(actor, "roles:manage");
  const name = cleanRoleName(input.name);
  const description = cleanDescription(input.description);
  const keys = cleanPermissionKeys(input.permissionKeys);

  return inTransaction(async (tx) => {
    await assertNameFree(tx, name);

    // Make the key unique: head_teacher, head_teacher_2, ...
    const base = roleKeyFromName(name);
    let key = base;
    for (let n = 2; await tx.role.findUnique({ where: { key }, select: { id: true } }); n++) key = `${base}_${n}`;

    const ids = await permissionIds(tx, keys);
    const role = await tx.role.create({
      data: {
        key,
        name,
        description,
        isSystem: false,
        permissions: { create: keys.map((k) => ({ permissionId: ids.get(k)! })) },
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: "role_created",
      targetRoleId: role.id,
      details: { name, permissions: keys },
    });
    return key;
  });
}

export async function updateRole(actor: Actor, key: string, changes: { name: string; description?: string }): Promise<void> {
  assertCan(actor, "roles:manage");
  const name = cleanRoleName(changes.name);
  const description = cleanDescription(changes.description);

  await inTransaction(async (tx) => {
    const role = await findRoleOrFail(tx, key);
    if (role.key === ADMIN_ROLE) throw new UserFacingError("The Admin role can't be changed.");
    if (name === role.name && description === role.description) return;
    await assertNameFree(tx, name, role.id);

    await tx.role.update({ where: { id: role.id }, data: { name, description } });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: "role_updated",
      targetRoleId: role.id,
      details: { name, previousName: role.name },
    });
  });
}

// Gives the role exactly these permissions. Changes apply at once to
// everyone with the role: sessions read permissions on every request.
export async function setRolePermissions(actor: Actor, key: string, permissionKeys: string[]): Promise<void> {
  assertCan(actor, "roles:manage");
  const wanted = cleanPermissionKeys(permissionKeys);

  await prisma.$transaction(async (tx) => {
    const role = await findRoleOrFail(tx, key);
    if (role.key === ADMIN_ROLE) throw new UserFacingError("The Admin role always has every permission.");

    const current = (
      await tx.rolePermission.findMany({ where: { roleId: role.id }, select: { permission: { select: { key: true } } } })
    ).map(({ permission }) => permission.key);
    const added = wanted.filter((k) => !current.includes(k));
    const removed = current.filter((k) => !(wanted as string[]).includes(k)) as PermissionKey[];
    if (added.length === 0 && removed.length === 0) return;

    const ids = await permissionIds(tx, [...added, ...removed]);
    await tx.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { in: removed.map((k) => ids.get(k)!) } } });
    await tx.rolePermission.createMany({ data: added.map((k) => ({ roleId: role.id, permissionId: ids.get(k)! })) });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: "role_permissions_changed",
      targetRoleId: role.id,
      details: { role: role.name, added, removed },
    });
  });
}

// Only roles you created, and only when nobody has them any more, so nobody
// loses access without the admin noticing.
export async function deleteRole(actor: Actor, key: string): Promise<void> {
  assertCan(actor, "roles:manage");

  await prisma.$transaction(async (tx) => {
    const role = await findRoleOrFail(tx, key);
    if (role.isSystem) throw new UserFacingError("Built-in roles can't be deleted.");
    const holders = await tx.userRole.count({ where: { roleId: role.id } });
    if (holders > 0) {
      throw new UserFacingError(
        `${holders} ${holders === 1 ? "person has" : "people have"} this role. Remove it from them first.`,
      );
    }

    // The log row keeps the name; its link to the role becomes empty.
    await recordAudit(tx, { actorId: actor.userId, action: "role_deleted", targetRoleId: role.id, details: { role: role.name } });
    await tx.role.delete({ where: { id: role.id } });
  });
}
