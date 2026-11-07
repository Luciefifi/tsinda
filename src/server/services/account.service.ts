import "server-only";

import { passwordProblems } from "@/lib/password-rules";
import type { Actor } from "@/server/auth/access";
import { hashSecret, verifySecret } from "@/server/auth/hashing";
import { recordAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { UserFacingError } from "./errors";

// What anyone can do to their own account. No permission is needed: being
// logged in as yourself is enough.

export type PasswordChange = { currentPassword: string; newPassword: string; confirmPassword: string };

// Replaces the person's password. Asking for the current one stops someone
// who finds an unlocked phone from taking over the account. Other devices are
// logged out; this one stays logged in.
export async function changeOwnPassword(actor: Actor, change: PasswordChange): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) throw new UserFacingError("Pupils use a PIN. Ask your parent or teacher to change it.");

  if (!(await verifySecret(user.passwordHash, change.currentPassword))) {
    throw new UserFacingError("This is not your current password.", "currentPassword");
  }
  const problems = passwordProblems(change.newPassword);
  if (problems.length > 0) throw new UserFacingError(problems.join(" "), "newPassword");
  if (change.newPassword === change.currentPassword) {
    throw new UserFacingError("Choose a password different from the one you have now.", "newPassword");
  }
  if (change.newPassword !== change.confirmPassword) {
    throw new UserFacingError("The two new passwords are not the same.", "confirmPassword");
  }

  const passwordHash = await hashSecret(change.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.userId },
      data: { passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
    });
    await tx.session.deleteMany({ where: { userId: actor.userId, id: { not: actor.sessionId } } });
    await recordAudit(tx, { actorId: actor.userId, action: "password_changed", targetUserId: actor.userId });
  });
}

// Whether this person logs in with a password (adults) or a PIN (pupils).
export async function hasPassword(actor: Actor): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true } });
  return Boolean(user?.passwordHash);
}
