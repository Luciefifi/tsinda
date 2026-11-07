import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/server/auth/access";
import { createSession, validateSession } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { actorFor, createAdult, createStudent } from "@/test/factories";
import { loginAdult, loginStudent } from "./auth.service";
import { UserFacingError } from "./errors";
import {
  createAdult as addAdult,
  createPupil,
  getAdminOverview,
  getPerson,
  linkGuardian,
  listActivity,
  listPeople,
  resetPassword,
  resetPin,
  setAccountActive,
  setPersonRoles,
  unlinkGuardian,
  unlockAccount,
  updatePerson,
} from "./people.service";

const NEXT_YEAR = new Date().getFullYear() + 1;
const TEMP_PASSWORD = "Temporary@1";

async function adminActor() {
  const admin = await createAdult("+250788000001", ["admin"]);
  return actorFor(admin.id);
}

// Someone who may manage people through a custom role, but is not an admin.
async function managerActor() {
  const manager = await createAdult("+250788000004", ["guardian"]);
  const role = await prisma.role.create({
    data: {
      key: "manager",
      name: "Manager",
      permissions: { create: { permission: { connect: { key: "people:manage" } } } },
    },
  });
  await prisma.userRole.create({ data: { userId: manager.id, roleId: role.id } });
  return actorFor(manager.id);
}

function pupilInput(overrides: Partial<Parameters<typeof createPupil>[1]> = {}) {
  return { fullName: "Keza Mugisha", username: "keza", pin: "4821", examYear: NEXT_YEAR, guardians: [], ...overrides };
}

async function actions(userId: string) {
  return (await prisma.auditLog.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: "asc" } })).map(
    (row) => row.action,
  );
}

describe("permissions", () => {
  it("refuses everything to someone without people:manage", async () => {
    const reviewer = await actorFor((await createAdult("+250788000002", ["reviewer"])).id);
    await expect(listPeople(reviewer)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createPupil(reviewer, pupilInput())).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("createPupil", () => {
  it("creates a pupil who can log in, with the Student role, a profile and a log entry", async () => {
    const admin = await adminActor();
    const id = await createPupil(admin, pupilInput({ username: "  Keza ", school: "GS Kigali" }));

    const person = await getPerson(admin, id);
    expect(person).toMatchObject({ kind: "pupil", username: "keza", examYear: NEXT_YEAR, school: "GS Kigali" });
    expect(person?.roles.map((r) => r.key)).toEqual(["student"]);
    expect((await loginStudent("keza", "4821")).ok).toBe(true);
    expect(await actions(id)).toEqual(["person_created"]);
  });

  it("links the chosen guardians and gives them the Guardian role", async () => {
    const admin = await adminActor();
    const mum = await createAdult("+250788000003", ["reviewer"]);
    const id = await createPupil(admin, pupilInput({ guardians: [{ guardianId: mum.id, relationship: "parent" }] }));

    const person = await getPerson(admin, id);
    expect(person?.guardians).toEqual([
      { id: mum.id, fullName: mum.fullName, contact: mum.phone, relationship: "parent" },
    ]);
    const mumRoles = (await getPerson(admin, mum.id))?.roles.map((r) => r.key).sort();
    expect(mumRoles).toEqual(["guardian", "reviewer"]);
    expect(await actions(id)).toEqual(["person_created", "guardian_linked"]);
  });

  it("explains bad input, field by field", async () => {
    const admin = await adminActor();
    await expect(createPupil(admin, pupilInput({ username: "k" }))).rejects.toMatchObject({ field: "username" });
    await expect(createPupil(admin, pupilInput({ pin: "12" }))).rejects.toMatchObject({ field: "pin" });
    await expect(createPupil(admin, pupilInput({ examYear: 1999 }))).rejects.toMatchObject({ field: "examYear" });
    await expect(
      createPupil(admin, pupilInput({ guardians: [{ guardianId: admin.userId, relationship: "cousin" }] })),
    ).rejects.toMatchObject({ field: "relationship" });
  });

  it("refuses a username that is already taken, and saves nothing", async () => {
    const admin = await adminActor();
    await createStudent("keza", "1111");
    await expect(createPupil(admin, pupilInput())).rejects.toMatchObject({ field: "username" });
    expect(await prisma.user.count({ where: { username: "keza" } })).toBe(1);
  });

  it("refuses a pupil as a guardian, and rolls the whole pupil back", async () => {
    const admin = await adminActor();
    const other = await createStudent("mugisha", "1111");
    await expect(
      createPupil(admin, pupilInput({ guardians: [{ guardianId: other.id, relationship: "sibling" }] })),
    ).rejects.toMatchObject({ field: "guardians" });
    expect(await prisma.user.count({ where: { username: "keza" } })).toBe(0);
  });
});

describe("createAdult", () => {
  it("creates an adult who must choose their own password at first login", async () => {
    const admin = await adminActor();
    const id = await addAdult(admin, {
      fullName: "Ingabire",
      phone: "0782 418 024",
      temporaryPassword: TEMP_PASSWORD,
      roleKeys: ["reviewer", "guardian"],
    });

    const result = await loginAdult("+250782418024", TEMP_PASSWORD);
    expect(result).toMatchObject({ ok: true, mustChangePassword: true });
    expect((await getPerson(admin, id))?.roles.map((r) => r.key).sort()).toEqual(["guardian", "reviewer"]);
  });

  it("follows the password rules for the temporary password", async () => {
    const admin = await adminActor();
    await expect(
      addAdult(admin, { fullName: "Ingabire", phone: "0782418024", temporaryPassword: "password", roleKeys: ["reviewer"] }),
    ).rejects.toMatchObject({ field: "password" });
  });

  it("refuses a phone number that is already used, the Student role, and no role", async () => {
    const admin = await adminActor();
    const base = { fullName: "Ingabire", temporaryPassword: TEMP_PASSWORD };
    await expect(addAdult(admin, { ...base, phone: "0788000001", roleKeys: ["reviewer"] })).rejects.toMatchObject({
      field: "phone",
    });
    await expect(addAdult(admin, { ...base, phone: "0782418024", roleKeys: ["student"] })).rejects.toMatchObject({
      field: "roles",
    });
    await expect(addAdult(admin, { ...base, phone: "0782418024", roleKeys: [] })).rejects.toMatchObject({ field: "roles" });
  });

  it("lets only an admin give the Admin role", async () => {
    const actor = await managerActor();
    await expect(
      addAdult(actor, { fullName: "Someone", phone: "0782418024", temporaryPassword: TEMP_PASSWORD, roleKeys: ["admin"] }),
    ).rejects.toMatchObject({ field: "roles" });
  });
});

describe("updatePerson", () => {
  it("changes a pupil's details and logs what changed", async () => {
    const admin = await adminActor();
    const id = await createPupil(admin, pupilInput());
    await updatePerson(admin, id, { fullName: "Keza M.", username: "keza.m", examYear: NEXT_YEAR, school: "GS Remera" });

    expect(await getPerson(admin, id)).toMatchObject({ fullName: "Keza M.", username: "keza.m", school: "GS Remera" });
    const log = await prisma.auditLog.findFirstOrThrow({ where: { targetUserId: id, action: "person_updated" } });
    expect(log.details).toEqual({ changed: ["name", "username", "school"] });
  });

  it("refuses an adult's phone number used by someone else", async () => {
    const admin = await adminActor();
    const other = await createAdult("+250788000005", ["guardian"]);
    await expect(updatePerson(admin, other.id, { fullName: "X Y", phone: "0788000001" })).rejects.toMatchObject({
      field: "phone",
    });
  });
});

describe("setPersonRoles", () => {
  it("replaces an adult's roles and logs what was added and removed", async () => {
    const admin = await adminActor();
    const aunt = await createAdult("+250788000006", ["guardian"]);
    await setPersonRoles(admin, aunt.id, ["reviewer"]);

    expect((await getPerson(admin, aunt.id))?.roles.map((r) => r.key)).toEqual(["reviewer"]);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { targetUserId: aunt.id } });
    expect(log.details).toEqual({ added: ["reviewer"], removed: ["guardian"] });
  });

  it("gives new permissions at once, without logging in again", async () => {
    const admin = await adminActor();
    const aunt = await createAdult("+250788000006", ["guardian"]);
    const token = await createSession(aunt.id);
    await setPersonRoles(admin, aunt.id, ["guardian", "reviewer"]);
    expect((await validateSession(token))?.permissions.has("content:review")).toBe(true);
  });

  it("never lets Tsinda lose its last admin", async () => {
    const admin = await adminActor();
    await expect(setPersonRoles(admin, admin.userId, ["reviewer"])).rejects.toBeInstanceOf(UserFacingError);

    // Even with a second admin, nobody removes their own Admin role.
    const second = await createAdult("+250788000007", ["admin"]);
    await expect(setPersonRoles(admin, admin.userId, ["reviewer"])).rejects.toThrow(/your own Admin role/);
    await setPersonRoles(admin, second.id, ["reviewer"]);
  });

  it("refuses to change a pupil's roles", async () => {
    const admin = await adminActor();
    const id = await createPupil(admin, pupilInput());
    await expect(setPersonRoles(admin, id, ["reviewer"])).rejects.toBeInstanceOf(UserFacingError);
  });
});

describe("guardians", () => {
  it("links and unlinks; the adult keeps the Guardian role", async () => {
    const admin = await adminActor();
    const pupilId = await createPupil(admin, pupilInput());
    const uncle = await createAdult("+250788000008", ["reviewer"]);

    await linkGuardian(admin, pupilId, uncle.id, "aunt_uncle");
    expect((await getPerson(admin, uncle.id))?.pupils.map((p) => p.id)).toEqual([pupilId]);
    await expect(linkGuardian(admin, pupilId, uncle.id, "parent")).rejects.toThrow(/already looks after/);

    await unlinkGuardian(admin, pupilId, uncle.id);
    expect((await getPerson(admin, pupilId))?.guardians).toEqual([]);
    expect((await getPerson(admin, uncle.id))?.roles.map((r) => r.key).sort()).toEqual(["guardian", "reviewer"]);
    expect(await actions(pupilId)).toEqual(["person_created", "guardian_linked", "guardian_unlinked"]);
  });
});

describe("account safety", () => {
  it("resets a password: logs the person out, unlocks them and asks for a new one", async () => {
    const admin = await adminActor();
    const aunt = await createAdult("+250788000006", ["guardian"]);
    const token = await createSession(aunt.id);
    await prisma.user.update({ where: { id: aunt.id }, data: { lockedUntil: new Date(Date.now() + 60_000) } });

    await resetPassword(admin, aunt.id, TEMP_PASSWORD);

    expect(await validateSession(token)).toBeNull();
    expect(await loginAdult("+250788000006", TEMP_PASSWORD)).toMatchObject({ ok: true, mustChangePassword: true });
    expect(await actions(aunt.id)).toEqual(["password_reset"]);
    // The log says a reset happened, never what the password is.
    expect(JSON.stringify(await prisma.auditLog.findMany())).not.toContain(TEMP_PASSWORD);
  });

  it("resets a pupil's PIN", async () => {
    const admin = await adminActor();
    const id = await createPupil(admin, pupilInput());
    await resetPin(admin, id, "9999");
    expect((await loginStudent("keza", "9999")).ok).toBe(true);
    await expect(resetPassword(admin, id, TEMP_PASSWORD)).rejects.toThrow(/PIN/);
  });

  it("unlocks an account", async () => {
    const admin = await adminActor();
    const keza = await createStudent("keza", "4821");
    await prisma.user.update({ where: { id: keza.id }, data: { lockedUntil: new Date(Date.now() + 60_000) } });
    expect((await getPerson(admin, keza.id))?.isLocked).toBe(true);

    await unlockAccount(admin, keza.id);
    expect((await loginStudent("keza", "4821")).ok).toBe(true);
  });

  it("turns an account off (logging it out) and on again", async () => {
    const admin = await adminActor();
    const keza = await createStudent("keza", "4821");
    const token = await createSession(keza.id);

    await setAccountActive(admin, keza.id, false);
    expect(await validateSession(token)).toBeNull();
    expect((await loginStudent("keza", "4821")).ok).toBe(false);

    await setAccountActive(admin, keza.id, true);
    expect((await loginStudent("keza", "4821")).ok).toBe(true);
    expect(await actions(keza.id)).toEqual(["account_turned_off", "account_turned_on"]);
  });

  it("refuses to turn off your own account or the last admin", async () => {
    const admin = await adminActor();
    await expect(setAccountActive(admin, admin.userId, false)).rejects.toThrow(/your own account/);

    // Someone else who may manage people still can't turn off the only admin.
    const manager = await managerActor();
    await expect(setAccountActive(manager, admin.userId, false)).rejects.toThrow(/at least one active admin/);
  });
});

describe("lists and overview", () => {
  it("searches by name, username and phone, and filters by kind", async () => {
    const admin = await adminActor();
    await createPupil(admin, pupilInput());
    await createAdult("+250782418024", ["guardian"]);

    expect((await listPeople(admin, { search: "kez" })).map((p) => p.username)).toEqual(["keza"]);
    expect((await listPeople(admin, { search: "0782 418" })).map((p) => p.phone)).toEqual(["+250782418024"]);
    expect((await listPeople(admin, { kind: "pupil" })).map((p) => p.kind)).toEqual(["pupil"]);
    expect(await listPeople(admin, { kind: "adult" })).toHaveLength(2);
  });

  it("counts people and shows the latest activity", async () => {
    const admin = await adminActor();
    const id = await createPupil(admin, pupilInput());
    await setAccountActive(admin, id, false);

    const overview = await getAdminOverview(admin);
    expect(overview).toMatchObject({ pupils: 0, adults: 1, turnedOff: 1 });
    expect(overview.activity.map((a) => a.action)).toEqual(["account_turned_off", "person_created"]);
    expect(overview.activity[0]).toMatchObject({ actorName: admin.fullName, targetUser: { id } });
    expect(await listActivity(admin, { targetUserId: id, limit: 1 })).toHaveLength(1);
  });
});
