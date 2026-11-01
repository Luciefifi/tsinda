import "server-only";

import type { PermissionKey } from "./permissions";

// The person a request acts for. Services receive it explicitly, so they
// never read cookies themselves and stay testable outside Next.js.
export type Actor = {
  userId: string;
  fullName: string;
  sessionId: string;
  permissions: ReadonlySet<PermissionKey>;
};

export function can(actor: Actor | null, permission: PermissionKey): boolean {
  return actor?.permissions.has(permission) ?? false;
}

export class ForbiddenError extends Error {
  readonly permission: PermissionKey;

  constructor(permission: PermissionKey) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}

// For services: stop with an error when the actor lacks a permission.
export function assertCan(actor: Actor, permission: PermissionKey): void {
  if (!can(actor, permission)) {
    throw new ForbiddenError(permission);
  }
}
