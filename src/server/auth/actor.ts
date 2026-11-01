import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { can, type Actor } from "./access";
import { getSessionToken } from "./cookies";
import type { PermissionKey } from "./permissions";
import { validateSession } from "./session";

// Who is making this request? Wrapped in cache() so a page and all its
// components share one session check per render.
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  const session = await validateSession(token);
  if (!session) {
    return null;
  }

  return {
    userId: session.user.id,
    fullName: session.user.fullName,
    sessionId: session.sessionId,
    permissions: session.permissions,
  };
});

// For pages and actions that need someone logged in.
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/login");
  }
  return actor;
}

// For pages that need a permission. Without it, the page shows "not found",
// so people can't even tell the page exists.
export async function requirePermission(permission: PermissionKey): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, permission)) {
    notFound();
  }
  return actor;
}
