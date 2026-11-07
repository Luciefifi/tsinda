import "server-only";

import type { Prisma } from "@/generated/prisma/client";

// The activity log. Every change to people or roles writes one row here,
// inside the same transaction as the change, so the change and its record
// are saved together or not at all.

export const AUDIT_ACTIONS = [
  "person_created",
  "person_updated",
  "roles_changed",
  "guardian_linked",
  "guardian_unlinked",
  "password_reset",
  "pin_reset",
  "account_unlocked",
  "account_turned_off",
  "account_turned_on",
  "password_changed",
  "role_created",
  "role_updated",
  "role_permissions_changed",
  "role_deleted",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Small facts that explain the change, e.g. { added: ["reviewer"] }.
// NEVER put a password, PIN or hash in here.
export type AuditDetails = Record<string, string | number | boolean | null | string[]>;

export type AuditEntryInput = {
  actorId: string | null;
  action: AuditAction;
  targetUserId?: string;
  targetRoleId?: string;
  details?: AuditDetails;
};

export async function recordAudit(tx: Prisma.TransactionClient, entry: AuditEntryInput): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetUserId: entry.targetUserId,
      targetRoleId: entry.targetRoleId,
      details: entry.details ?? {},
    },
  });
}
