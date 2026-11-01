"use server";

import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/auth/actor";
import { deleteSessionCookie } from "@/server/auth/cookies";
import { logout } from "@/server/services/auth.service";

export async function logoutAction(): Promise<void> {
  const actor = await getCurrentActor();
  if (actor) {
    await logout(actor.sessionId);
  }
  await deleteSessionCookie();
  redirect("/login");
}
