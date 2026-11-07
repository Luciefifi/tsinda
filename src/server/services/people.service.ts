import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { passwordProblems, isValidPin } from "@/lib/password-rules";
import { normalizeRwandaPhone } from "@/lib/phone";
import { RELATIONSHIP_KEYS, type Relationship } from "@/lib/relationships";
import { assertCan, can, type Actor } from "@/server/auth/access";
import { hashSecret } from "@/server/auth/hashing";
import { ADMIN_ROLE } from "@/server/auth/permissions";
import { recordAudit, type AuditAction, type AuditDetails } from "@/server/audit";
import { prisma } from "@/server/db";
import { isUniqueViolation, UserFacingError } from "./errors";

// Managing people: pupils (username + PIN) and adults (phone + password).
// Every change needs "people:manage", is checked against the safety rules
// below, and writes a row to the activity log in the same transaction.
//
// Safety rules:
// - Tsinda always keeps at least one active admin.
// - Nobody can turn off their own account or remove their own Admin role.
// - Only an admin can give or take away the Admin role.
// - Pupils have exactly the Student role; adults never have it.

const STUDENT_ROLE = "student";
const GUARDIAN_ROLE = "guardian";

type Tx = Prisma.TransactionClient;

export type PersonKind = "pupil" | "adult";

export type RoleTag = { key: string; name: string };

export type PersonSummary = {
  id: string;
  fullName: string;
  kind: PersonKind;
  phone: string | null;
  username: string | null;
  roles: RoleTag[];
  isActive: boolean;
  isLocked: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
};

export type PersonLink = { id: string; fullName: string; contact: string | null; relationship: string | null };

export type PersonDetail = PersonSummary & {
  createdAt: Date;
  lockedUntil: Date | null;
  examYear: number | null;
  school: string | null;
  guardians: PersonLink[]; // for a pupil: the adults who look after them
  pupils: PersonLink[]; // for an adult: the pupils they look after
};

export type ActivityEntry = {
  id: string;
  action: AuditAction;
  createdAt: Date;
  actorName: string | null;
  targetUser: { id: string; fullName: string } | null;
  targetRoleName: string | null;
  details: AuditDetails;
};

export type AdminOverview = {
  pupils: number;
  adults: number;
  turnedOff: number;
  locked: number;
  waitingForNewPassword: number;
  content: { toReview: number; openNotes: number } | null;
  recentLogins: { id: string; fullName: string; lastLoginAt: Date }[];
  activity: ActivityEntry[];
};

// ─── Reading ──────────────────────────────────────────────────

const summarySelect = {
  id: true,
  fullName: true,
  phone: true,
  username: true,
  isActive: true,
  lockedUntil: true,
  mustChangePassword: true,
  lastLoginAt: true,
  studentProfile: { select: { userId: true } },
  roles: { select: { role: { select: { key: true, name: true } } }, orderBy: { role: { name: "asc" } } },
} satisfies Prisma.UserSelect;

type SummaryRow = Prisma.UserGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow, now = Date.now()): PersonSummary {
  return {
    id: row.id,
    fullName: row.fullName,
    kind: row.studentProfile ? "pupil" : "adult",
    phone: row.phone,
    username: row.username,
    roles: row.roles.map(({ role }) => role),
    isActive: row.isActive,
    isLocked: row.lockedUntil !== null && row.lockedUntil.getTime() > now,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt,
  };
}

export async function getAdminOverview(actor: Actor): Promise<AdminOverview> {
  assertCan(actor, "people:manage");
  const now = new Date();

  const [pupils, adults, turnedOff, locked, waitingForNewPassword, recentLogins, activity] = await Promise.all([
    prisma.user.count({ where: { isActive: true, studentProfile: { isNot: null } } }),
    prisma.user.count({ where: { isActive: true, studentProfile: { is: null } } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { lockedUntil: { gt: now } } }),
    prisma.user.count({ where: { isActive: true, mustChangePassword: true } }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 5,
      select: { id: true, fullName: true, lastLoginAt: true },
    }),
    listActivity(actor, { limit: 10 }),
  ]);

  let content: AdminOverview["content"] = null;
  if (can(actor, "content:review")) {
    const [lessons, questions, openNotes] = await Promise.all([
      prisma.lesson.count({ where: { status: "DRAFT" } }),
      prisma.question.count({ where: { status: "DRAFT" } }),
      prisma.reviewNote.count({ where: { resolvedAt: null } }),
    ]);
    content = { toReview: lessons + questions, openNotes };
  }

  return {
    pupils,
    adults,
    turnedOff,
    locked,
    waitingForNewPassword,
    content,
    recentLogins: recentLogins.map((row) => ({ ...row, lastLoginAt: row.lastLoginAt! })),
    activity,
  };
}

export type PeopleFilter = { search?: string; kind?: PersonKind };

// Everyone, newest first, optionally filtered by a search (name, phone or
// username) and by kind. Tsinda will have tens of people, not thousands, so
// one page is enough; the limit is a safety net.
export async function listPeople(actor: Actor, filter: PeopleFilter = {}): Promise<PersonSummary[]> {
  assertCan(actor, "people:manage");
  const search = filter.search?.trim();
  const phoneSearch = search ? normalizeRwandaPhone(search) : null;

  const rows = await prisma.user.findMany({
    where: {
      ...(filter.kind === "pupil" && { studentProfile: { isNot: null } }),
      ...(filter.kind === "adult" && { studentProfile: { is: null } }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { username: { contains: search.toLowerCase() } },
          { phone: { contains: phoneSearch ?? search.replace(/[\s-]/g, "") } },
        ],
      }),
    },
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    take: 500,
    select: summarySelect,
  });

  const now = Date.now();
  return rows.map((row) => toSummary(row, now));
}

export async function getPerson(actor: Actor, userId: string): Promise<PersonDetail | null> {
  assertCan(actor, "people:manage");

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...summarySelect,
      createdAt: true,
      studentProfile: {
        select: {
          userId: true,
          examYear: true,
          school: true,
          guardians: {
            select: { relationship: true, guardian: { select: { id: true, fullName: true, phone: true } } },
            orderBy: { guardian: { fullName: "asc" } },
          },
        },
      },
      guardianOf: {
        select: { relationship: true, student: { select: { user: { select: { id: true, fullName: true, username: true } } } } },
        orderBy: { student: { user: { fullName: "asc" } } },
      },
    },
  });
  if (!row) return null;

  return {
    ...toSummary(row),
    createdAt: row.createdAt,
    lockedUntil: row.lockedUntil,
    examYear: row.studentProfile?.examYear ?? null,
    school: row.studentProfile?.school ?? null,
    guardians: (row.studentProfile?.guardians ?? []).map(({ relationship, guardian }) => ({
      id: guardian.id,
      fullName: guardian.fullName,
      contact: guardian.phone,
      relationship,
    })),
    pupils: row.guardianOf.map(({ relationship, student }) => ({
      id: student.user.id,
      fullName: student.user.fullName,
      contact: student.user.username,
      relationship,
    })),
  };
}

// Adults who can be picked as a guardian (active, with a phone number).
export async function listPossibleGuardians(actor: Actor): Promise<{ id: string; fullName: string; phone: string }[]> {
  assertCan(actor, "people:manage");
  const rows = await prisma.user.findMany({
    where: { isActive: true, studentProfile: { is: null }, phone: { not: null } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, phone: true },
  });
  return rows.map((row) => ({ ...row, phone: row.phone! }));
}

// The activity log, newest first: everything, or only what concerns one
// person or one role.
export async function listActivity(
  actor: Actor,
  options: { targetUserId?: string; targetRoleId?: string; limit?: number } = {},
): Promise<ActivityEntry[]> {
  if (!can(actor, "people:manage") && !can(actor, "roles:manage")) assertCan(actor, "people:manage");

  const rows = await prisma.auditLog.findMany({
    where: { targetUserId: options.targetUserId, targetRoleId: options.targetRoleId },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 20,
    select: {
      id: true,
      action: true,
      createdAt: true,
      details: true,
      actor: { select: { fullName: true } },
      targetUser: { select: { id: true, fullName: true } },
      targetRole: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action as AuditAction,
    createdAt: row.createdAt,
    actorName: row.actor?.fullName ?? null,
    targetUser: row.targetUser,
    targetRoleName: row.targetRole?.name ?? null,
    details: row.details as AuditDetails,
  }));
}

// ─── Checking input ───────────────────────────────────────────

function cleanName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new UserFacingError("Please write the full name.", "fullName");
  if (name.length > 100) throw new UserFacingError("The name is too long (100 characters at most).", "fullName");
  return name;
}

function cleanUsername(value: string): string {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9._]{3,30}$/.test(username)) {
    throw new UserFacingError(
      "Use 3 to 30 small letters, numbers, dots or underscores, with no spaces (for example keza.m).",
      "username",
    );
  }
  return username;
}

function cleanPhone(value: string): string {
  const phone = normalizeRwandaPhone(value);
  if (!phone) throw new UserFacingError("Write a Rwandan mobile number, for example 0788 123 456.", "phone");
  return phone;
}

function cleanExamYear(value: number): number {
  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(value) || value < thisYear || value > thisYear + 6) {
    throw new UserFacingError(`Choose a PLE year between ${thisYear} and ${thisYear + 6}.`, "examYear");
  }
  return value;
}

function cleanSchool(value: string | undefined): string | null {
  const school = value?.trim().replace(/\s+/g, " ") ?? "";
  if (school.length > 120) throw new UserFacingError("The school name is too long.", "school");
  return school || null;
}

function checkPassword(password: string, field = "password"): void {
  const problems = passwordProblems(password);
  if (problems.length > 0) throw new UserFacingError(problems.join(" "), field);
}

function checkPin(pin: string): void {
  if (!isValidPin(pin)) throw new UserFacingError("The PIN must be exactly 4 numbers.", "pin");
}

function checkRelationship(value: string): Relationship {
  if (!(RELATIONSHIP_KEYS as readonly string[]).includes(value)) {
    throw new UserFacingError("Choose how they are related.", "relationship");
  }
  return value as Relationship;
}

// Runs a change in a transaction and turns "already used" errors from the
// database into a message.
async function write<T>(work: (tx: Tx) => Promise<T>, duplicate: UserFacingError): Promise<T> {
  try {
    return await prisma.$transaction(work);
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate;
    throw error;
  }
}

const phoneTaken = new UserFacingError("Someone already uses this phone number.", "phone");
const usernameTaken = new UserFacingError("This username is taken. Try another one.", "username");

// ─── Safety rules ─────────────────────────────────────────────

async function roleIdsByKey(tx: Tx, keys: string[]): Promise<Map<string, string>> {
  const roles = await tx.role.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
  const found = new Map(roles.map((role) => [role.key, role.id]));
  const unknown = keys.filter((key) => !found.has(key));
  if (unknown.length > 0) throw new UserFacingError(`Unknown role: ${unknown.join(", ")}.`, "roles");
  return found;
}

async function hasRole(tx: Tx, userId: string, roleKey: string): Promise<boolean> {
  const link = await tx.userRole.findFirst({ where: { userId, role: { key: roleKey } }, select: { userId: true } });
  return link !== null;
}

// Fails when `userId` is the last active admin, because the change would
// leave nobody able to manage Tsinda.
async function assertNotLastAdmin(tx: Tx, userId: string, message: string): Promise<void> {
  if (!(await hasRole(tx, userId, ADMIN_ROLE))) return;
  const otherAdmins = await tx.user.count({
    where: { id: { not: userId }, isActive: true, roles: { some: { role: { key: ADMIN_ROLE } } } },
  });
  if (otherAdmins === 0) throw new UserFacingError(message);
}

async function findPersonOrFail(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      username: true,
      isActive: true,
      studentProfile: { select: { userId: true } },
    },
  });
  if (!user) throw new UserFacingError("This person no longer exists.");
  return { ...user, kind: (user.studentProfile ? "pupil" : "adult") as PersonKind };
}

// ─── Adding people ────────────────────────────────────────────

export type NewPupil = {
  fullName: string;
  username: string;
  pin: string;
  examYear: number;
  school?: string;
  guardians: { guardianId: string; relationship: string }[];
};

export async function createPupil(actor: Actor, input: NewPupil): Promise<string> {
  assertCan(actor, "people:manage");
  const fullName = cleanName(input.fullName);
  const username = cleanUsername(input.username);
  checkPin(input.pin);
  const examYear = cleanExamYear(input.examYear);
  const school = cleanSchool(input.school);
  const guardians = input.guardians.map((g) => ({ ...g, relationship: checkRelationship(g.relationship) }));
  if (new Set(guardians.map((g) => g.guardianId)).size !== guardians.length) {
    throw new UserFacingError("The same guardian is chosen twice.", "guardians");
  }
  const pinHash = await hashSecret(input.pin); // Slow on purpose, so done before the transaction.

  return write(async (tx) => {
    if (await tx.user.findUnique({ where: { username }, select: { id: true } })) throw usernameTaken;
    const roles = await roleIdsByKey(tx, [STUDENT_ROLE]);

    const pupil = await tx.user.create({
      data: {
        fullName,
        username,
        pinHash,
        roles: { create: { roleId: roles.get(STUDENT_ROLE)! } },
        studentProfile: { create: { examYear, school } },
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: "person_created",
      targetUserId: pupil.id,
      details: { kind: "pupil", username },
    });

    for (const guardian of guardians) {
      await addGuardianLink(tx, actor, pupil.id, guardian.guardianId, guardian.relationship);
    }
    return pupil.id;
  }, usernameTaken);
}

export type NewAdult = {
  fullName: string;
  phone: string;
  temporaryPassword: string;
  roleKeys: string[];
};

// The admin sets a temporary password; the person must choose their own the
// first time they log in.
export async function createAdult(actor: Actor, input: NewAdult): Promise<string> {
  assertCan(actor, "people:manage");
  const fullName = cleanName(input.fullName);
  const phone = cleanPhone(input.phone);
  checkPassword(input.temporaryPassword);
  const roleKeys = [...new Set(input.roleKeys)];
  if (roleKeys.length === 0) throw new UserFacingError("Choose at least one role.", "roles");
  if (roleKeys.includes(STUDENT_ROLE)) throw new UserFacingError("Pupils are added with “Add a pupil”.", "roles");
  const passwordHash = await hashSecret(input.temporaryPassword);

  return write(async (tx) => {
    if (await tx.user.findUnique({ where: { phone }, select: { id: true } })) throw phoneTaken;
    if (roleKeys.includes(ADMIN_ROLE) && !(await hasRole(tx, actor.userId, ADMIN_ROLE))) {
      throw new UserFacingError("Only an admin can give the Admin role.", "roles");
    }
    const roles = await roleIdsByKey(tx, roleKeys);

    const adult = await tx.user.create({
      data: {
        fullName,
        phone,
        passwordHash,
        mustChangePassword: true,
        roles: { create: [...roles.values()].map((roleId) => ({ roleId })) },
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: "person_created",
      targetUserId: adult.id,
      details: { kind: "adult", roles: roleKeys },
    });
    return adult.id;
  }, phoneTaken);
}

// ─── Changing people ──────────────────────────────────────────

export type PersonChanges = {
  fullName: string;
  phone?: string; // adults
  username?: string; // pupils
  examYear?: number; // pupils
  school?: string; // pupils
};

export async function updatePerson(actor: Actor, userId: string, changes: PersonChanges): Promise<void> {
  assertCan(actor, "people:manage");
  const fullName = cleanName(changes.fullName);

  await write(async (tx) => {
    const person = await findPersonOrFail(tx, userId);
    const changed: string[] = [];
    if (fullName !== person.fullName) changed.push("name");

    if (person.kind === "adult") {
      const phone = cleanPhone(changes.phone ?? "");
      if (phone !== person.phone) {
        const owner = await tx.user.findUnique({ where: { phone }, select: { id: true } });
        if (owner && owner.id !== userId) throw phoneTaken;
        changed.push("phone");
      }
      await tx.user.update({ where: { id: userId }, data: { fullName, phone } });
    } else {
      const username = cleanUsername(changes.username ?? "");
      const examYear = cleanExamYear(changes.examYear ?? NaN);
      const school = cleanSchool(changes.school);
      if (username !== person.username) {
        const owner = await tx.user.findUnique({ where: { username }, select: { id: true } });
        if (owner && owner.id !== userId) throw usernameTaken;
        changed.push("username");
      }
      const profile = await tx.studentProfile.findUniqueOrThrow({ where: { userId } });
      if (examYear !== profile.examYear) changed.push("PLE year");
      if (school !== profile.school) changed.push("school");
      await tx.user.update({
        where: { id: userId },
        data: { fullName, username, studentProfile: { update: { examYear, school } } },
      });
    }

    if (changed.length > 0) {
      await recordAudit(tx, { actorId: actor.userId, action: "person_updated", targetUserId: userId, details: { changed } });
    }
  }, changes.username !== undefined ? usernameTaken : phoneTaken);
}

// Replaces an adult's roles with exactly `roleKeys`.
export async function setPersonRoles(actor: Actor, userId: string, roleKeys: string[]): Promise<void> {
  assertCan(actor, "people:manage");
  const wanted = [...new Set(roleKeys)];

  await prisma.$transaction(async (tx) => {
    const person = await findPersonOrFail(tx, userId);
    if (person.kind === "pupil") throw new UserFacingError("A pupil always has the Student role only.", "roles");
    if (wanted.length === 0) throw new UserFacingError("Choose at least one role.", "roles");
    if (wanted.includes(STUDENT_ROLE)) throw new UserFacingError("Pupils are added with “Add a pupil”.", "roles");

    const current = (await tx.userRole.findMany({ where: { userId }, select: { role: { select: { key: true } } } })).map(
      ({ role }) => role.key,
    );
    const added = wanted.filter((key) => !current.includes(key));
    const removed = current.filter((key) => !wanted.includes(key));
    if (added.length === 0 && removed.length === 0) return;

    if (added.includes(ADMIN_ROLE) || removed.includes(ADMIN_ROLE)) {
      if (!(await hasRole(tx, actor.userId, ADMIN_ROLE))) {
        throw new UserFacingError("Only an admin can give or take away the Admin role.", "roles");
      }
    }
    if (removed.includes(ADMIN_ROLE)) {
      if (userId === actor.userId) {
        throw new UserFacingError("You can't remove your own Admin role. Ask another admin.", "roles");
      }
      await assertNotLastAdmin(tx, userId, "Tsinda needs at least one admin, so this Admin role can't be removed.");
    }

    const roles = await roleIdsByKey(tx, [...added, ...removed]);
    await tx.userRole.deleteMany({ where: { userId, roleId: { in: removed.map((key) => roles.get(key)!) } } });
    await tx.userRole.createMany({ data: added.map((key) => ({ userId, roleId: roles.get(key)! })) });
    // New permissions apply at once: sessions read roles on every request.
    await recordAudit(tx, { actorId: actor.userId, action: "roles_changed", targetUserId: userId, details: { added, removed } });
  });
}

// ─── Guardians ────────────────────────────────────────────────

async function addGuardianLink(tx: Tx, actor: Actor, pupilId: string, guardianId: string, relationship: Relationship) {
  const guardian = await tx.user.findUnique({
    where: { id: guardianId },
    select: { id: true, fullName: true, isActive: true, phone: true, studentProfile: { select: { userId: true } } },
  });
  if (!guardian || guardian.studentProfile || !guardian.phone) {
    throw new UserFacingError("A guardian must be an adult with a phone number.", "guardians");
  }
  if (!guardian.isActive) throw new UserFacingError(`${guardian.fullName}'s account is turned off.`, "guardians");

  const existing = await tx.guardianship.findUnique({
    where: { guardianId_studentId: { guardianId, studentId: pupilId } },
  });
  if (existing) throw new UserFacingError(`${guardian.fullName} already looks after this pupil.`, "guardians");

  await tx.guardianship.create({ data: { guardianId, studentId: pupilId, relationship } });

  // Looking after a pupil needs the Guardian role, so it comes automatically.
  const gaveRole = !(await hasRole(tx, guardianId, GUARDIAN_ROLE));
  if (gaveRole) {
    const roles = await roleIdsByKey(tx, [GUARDIAN_ROLE]);
    await tx.userRole.create({ data: { userId: guardianId, roleId: roles.get(GUARDIAN_ROLE)! } });
  }

  const details = { guardian: guardian.fullName, relationship, gaveGuardianRole: gaveRole };
  await recordAudit(tx, { actorId: actor.userId, action: "guardian_linked", targetUserId: pupilId, details });
}

export async function linkGuardian(actor: Actor, pupilId: string, guardianId: string, relationship: string): Promise<void> {
  assertCan(actor, "people:manage");
  const checked = checkRelationship(relationship);

  await prisma.$transaction(async (tx) => {
    const pupil = await findPersonOrFail(tx, pupilId);
    if (pupil.kind !== "pupil") throw new UserFacingError("Only pupils have guardians.");
    await addGuardianLink(tx, actor, pupilId, guardianId, checked);
  });
}

// Removes the link only. The adult keeps the Guardian role, because they may
// look after other pupils; an admin can remove the role on their page.
export async function unlinkGuardian(actor: Actor, pupilId: string, guardianId: string): Promise<void> {
  assertCan(actor, "people:manage");

  await prisma.$transaction(async (tx) => {
    const link = await tx.guardianship.findUnique({
      where: { guardianId_studentId: { guardianId, studentId: pupilId } },
      select: { guardian: { select: { fullName: true } } },
    });
    if (!link) return;
    await tx.guardianship.delete({ where: { guardianId_studentId: { guardianId, studentId: pupilId } } });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: "guardian_unlinked",
      targetUserId: pupilId,
      details: { guardian: link.guardian.fullName },
    });
  });
}

// ─── Account safety ───────────────────────────────────────────

// Sets a new temporary password for an adult who forgot theirs. They are
// logged out everywhere, unlocked, and must choose their own at next login.
export async function resetPassword(actor: Actor, userId: string, temporaryPassword: string): Promise<void> {
  assertCan(actor, "people:manage");
  checkPassword(temporaryPassword);
  const passwordHash = await hashSecret(temporaryPassword);

  await prisma.$transaction(async (tx) => {
    const person = await findPersonOrFail(tx, userId);
    if (person.kind === "pupil") throw new UserFacingError("Pupils use a PIN, not a password.");
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
    });
    await tx.session.deleteMany({ where: { userId } });
    await recordAudit(tx, { actorId: actor.userId, action: "password_reset", targetUserId: userId });
  });
}

// Sets a new PIN for a pupil. The parent tells the child; no forced change.
export async function resetPin(actor: Actor, userId: string, pin: string): Promise<void> {
  assertCan(actor, "people:manage");
  checkPin(pin);
  const pinHash = await hashSecret(pin);

  await prisma.$transaction(async (tx) => {
    const person = await findPersonOrFail(tx, userId);
    if (person.kind !== "pupil") throw new UserFacingError("Only pupils have a PIN.");
    await tx.user.update({ where: { id: userId }, data: { pinHash, failedLoginCount: 0, lockedUntil: null } });
    await tx.session.deleteMany({ where: { userId } });
    await recordAudit(tx, { actorId: actor.userId, action: "pin_reset", targetUserId: userId });
  });
}

// Ends a lock after too many wrong tries, before the 15 minutes are over.
export async function unlockAccount(actor: Actor, userId: string): Promise<void> {
  assertCan(actor, "people:manage");

  await prisma.$transaction(async (tx) => {
    await findPersonOrFail(tx, userId);
    await tx.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
    await recordAudit(tx, { actorId: actor.userId, action: "account_unlocked", targetUserId: userId });
  });
}

// Turning an account off logs the person out everywhere and stops them
// logging in. Nothing is deleted, so it can be turned on again.
export async function setAccountActive(actor: Actor, userId: string, active: boolean): Promise<void> {
  assertCan(actor, "people:manage");

  await prisma.$transaction(async (tx) => {
    const person = await findPersonOrFail(tx, userId);
    if (person.isActive === active) return;
    if (!active) {
      if (userId === actor.userId) throw new UserFacingError("You can't turn off your own account.");
      await assertNotLastAdmin(tx, userId, "Tsinda needs at least one active admin, so this account can't be turned off.");
      await tx.session.deleteMany({ where: { userId } });
    }
    await tx.user.update({ where: { id: userId }, data: { isActive: active } });
    await recordAudit(tx, {
      actorId: actor.userId,
      action: active ? "account_turned_on" : "account_turned_off",
      targetUserId: userId,
    });
  });
}
