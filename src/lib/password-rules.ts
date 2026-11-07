// The rules every adult password must follow (decided 2026-11-07): at least
// 8 characters with a capital letter, a number and a symbol. Used by the
// forms (to show the problems) and by the services (to enforce them whatever
// the entry point).

export const MIN_PASSWORD_LENGTH = 8;
// Argon2 can hash anything, but a limit stops someone sending megabytes.
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_RULES_TEXT = "At least 8 characters, with a capital letter, a number and a symbol (like @ # ! ?).";

// Returns what is wrong with a password, in words for the person typing it.
// An empty list means the password is good.
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) problems.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (password.length > MAX_PASSWORD_LENGTH) problems.push(`Use at most ${MAX_PASSWORD_LENGTH} characters.`);
  if (!/[A-Z]/.test(password)) problems.push("Add a capital letter (A-Z).");
  if (!/[0-9]/.test(password)) problems.push("Add a number (0-9).");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("Add a symbol, like @ # ! or ?.");
  return problems;
}

// Pupils log in with a 4-digit PIN.
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
