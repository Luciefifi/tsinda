import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

// For human-chosen secrets: PINs and passwords. Slow and salted on purpose.
export function hashSecret(secret: string): Promise<string> {
  return hash(secret, ARGON2_OPTIONS);
}

export function verifySecret(hashed: string, secret: string): Promise<boolean> {
  return verify(hashed, secret);
}

// For session tokens: 32 random bytes (256 bits), safe to put in a cookie.
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// Session tokens are random, not guessable, so a fast hash is the right tool.
// Produces 64 lowercase hex characters, matching the sessions.id CHECK constraint.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
