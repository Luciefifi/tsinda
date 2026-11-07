import "server-only";

import { Prisma } from "@/generated/prisma/client";

// A problem the person can fix, with a message written for them. `field`
// names the form field it belongs to, so the form can show it in the right
// place. Anything else that goes wrong is a bug and is not shown as-is.
export class UserFacingError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "UserFacingError";
    this.field = field;
  }
}

// True when a write broke a UNIQUE rule (e.g. a phone number already used).
// Services check first, but two admins saving at the same moment can still
// collide, and then the database is the final judge.
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
