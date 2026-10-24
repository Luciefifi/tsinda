import "server-only";

import { cookies } from "next/headers";

const SESSION_COOKIE = "tsinda_session";

// The database decides when a session expires (see session.ts). The cookie
// only has to outlive it, so it gets the longest lifetime browsers allow.
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

// Only callable from Server Actions and Route Handlers (a Next.js rule).
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

// Only callable from Server Actions and Route Handlers (a Next.js rule).
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
