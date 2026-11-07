import "server-only";

import { refresh } from "next/cache";
import { ForbiddenError } from "@/server/auth/access";
import { UserFacingError } from "@/server/services/errors";
import type { FormState } from "./form-state";

// Runs a service call for a Server Action and turns the problems a person can
// fix into a FormState. Anything else (a bug, the database is down) is thrown
// on, so Next.js shows its error page instead of a misleading message.
export async function runForm(work: () => Promise<unknown>, done: string, formData?: FormData): Promise<FormState> {
  try {
    await work();
  } catch (error) {
    const values = formData ? typedValues(formData) : undefined;
    if (error instanceof UserFacingError) {
      return error.field ? { fieldErrors: { [error.field]: error.message }, values } : { error: error.message, values };
    }
    if (error instanceof ForbiddenError) return { error: "You are not allowed to do this.", values };
    throw error;
  }
  refresh(); // Show the change on the page at once.
  return { done };
}

// Fields whose value must never travel back to the browser.
const SECRET = /password|pin/i;

export function typedValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (SECRET.test(key) || key.startsWith("$")) continue; // "$ACTION_..." are React's own fields.
    const all = formData.getAll(key).map(String);
    values[key] = all.length === 1 && !key.endsWith("[]") ? all[0] : all;
  }
  return values;
}

// Reads text fields from a form, as plain strings.
export function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}
