import { afterEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/server/auth/access";
import { createSession, validateSession } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { actorFor, createAdult } from "@/test/factories";
import { UserFacingError } from "./errors";
import {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  roleKeyFromName,
  setRolePermissions,
  updateRole,
} from "./roles.service";

async function adminActor() {
  return actorFor((await createAdult("+250788000001", ["admin"])).id);
}

// Some tests change the built-in Guardian role; put it back as the seed made it.
afterEach(async () => {
  const guardian = await prisma.role.findUniqueOrThrow({ where: { key: "guardian" } });
  await prisma.role.update({
    where: { id: guardian.id },
    data: { name: "Guardian", description: "Follows their own children's progress and gets reminders." },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: guardian.id } });
  const keys = ["progress:view-own-children", "schedule:manage-own-children"];
  const permissions = await prisma.permission.findMany({ where: { key: { in: keys } } });
  await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: guardian.id, permissionId: p.id })) });
});

describe("roleKeyFromName", () => {
  it("turns a name into a key", () => {
    expect(roleKeyFromName("Head teacher")).toBe("head_teacher");
    expect(roleKeyFromName("  Été 2027! ")).toBe("ete_2027");
    expect(roleKeyFromName("6th grade")).toBe("role_6th_grade");
  });
});

describe("roles", () => {
  it("needs roles:manage", async () => {
    const reviewer = await actorFor((await createAdult("+250788000002", ["reviewer"])).id);
    await expect(getRole(reviewer, "guardian")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createRole(reviewer, { name: "X", permissionKeys: [] })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lists the built-in roles first, with counts; Admin is locked", async () => {
    const admin = await adminActor();
    const roles = await listRoles(admin);
    expect(roles.slice(0, 4).map((r) => r.key).sort()).toEqual(["admin", "guardian", "reviewer", "student"]);
    expect(roles.find((r) => r.key === "admin")).toMatchObject({ isLocked: true, peopleCount: 1, permissionCount: 10 });
  });

  it("creates a role with permissions and a unique key, and logs it", async () => {
    const admin = await adminActor();
    const key = await createRole(admin, {
      name: "Head teacher",
      description: "Follows every pupil.",
      permissionKeys: ["progress:view-any"],
    });
    expect(key).toBe("head_teacher");
    expect(await getRole(admin, key)).toMatchObject({ name: "Head teacher", permissionKeys: ["progress:view-any"] });

    await expect(createRole(admin, { name: "head TEACHER", permissionKeys: [] })).rejects.toMatchObject({ field: "name" });
    expect(await createRole(admin, { name: "Head-teacher", permissionKeys: [] })).toBe("head_teacher_2");

    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "role_created" } });
    expect(log.details).toEqual({ name: "Head teacher", permissions: ["progress:view-any"] });
  });

  it("refuses unknown permissions", async () => {
    const admin = await adminActor();
    await expect(createRole(admin, { name: "X role", permissionKeys: ["everything:all"] })).rejects.toMatchObject({
      field: "permissions",
    });
  });

  it("changes a built-in role's permissions, and people get them at once", async () => {
    const admin = await adminActor();
    const aunt = await createAdult("+250788000003", ["guardian"]);
    const token = await createSession(aunt.id);

    await setRolePermissions(admin, "guardian", ["progress:view-own-children", "content:review"]);

    expect((await validateSession(token))?.permissions.has("content:review")).toBe(true);
    expect((await validateSession(token))?.permissions.has("schedule:manage-own-children")).toBe(false);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "role_permissions_changed" } });
    expect(log.details).toEqual({ role: "Guardian", added: ["content:review"], removed: ["schedule:manage-own-children"] });
  });

  it("renames a built-in role but keeps its key", async () => {
    const admin = await adminActor();
    await updateRole(admin, "guardian", { name: "Parent", description: "Looks after a pupil." });
    expect(await getRole(admin, "guardian")).toMatchObject({ key: "guardian", name: "Parent" });
  });

  it("never changes the Admin role", async () => {
    const admin = await adminActor();
    await expect(setRolePermissions(admin, "admin", [])).rejects.toBeInstanceOf(UserFacingError);
    await expect(updateRole(admin, "admin", { name: "Boss" })).rejects.toBeInstanceOf(UserFacingError);
  });

  it("deletes only new roles that nobody has", async () => {
    const admin = await adminActor();
    await expect(deleteRole(admin, "reviewer")).rejects.toThrow(/Built-in/);

    const key = await createRole(admin, { name: "Helper", permissionKeys: [] });
    const helper = await createAdult("+250788000004", [key]);
    await expect(deleteRole(admin, key)).rejects.toThrow(/1 person has this role/);

    await prisma.userRole.deleteMany({ where: { userId: helper.id } });
    await deleteRole(admin, key);
    expect(await getRole(admin, key)).toBeNull();

    // The log keeps the name even though the role is gone.
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "role_deleted" } });
    expect(log).toMatchObject({ targetRoleId: null, details: { role: "Helper" } });
  });
});
