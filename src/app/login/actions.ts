"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { setSessionCookie } from "@/server/auth/cookies";
import { loginStudent } from "@/server/services/auth.service";
import { studentLoginSchema } from "./schema";

export type LoginFormState = {
  username?: string;
  message?: string;
  fieldErrors?: { username?: string[]; pin?: string[] };
};

export async function loginStudentAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const username = String(formData.get("username") ?? "");
  const parsed = studentLoginSchema.safeParse({ username, pin: formData.get("pin") ?? "" });
  if (!parsed.success) {
    return { username, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await loginStudent(parsed.data.username, parsed.data.pin);
  if (!result.ok) {
    if (result.reason === "locked") {
      const minutes = Math.ceil((result.lockedUntil.getTime() - Date.now()) / 60_000);
      return { username, message: `Too many wrong tries. Please wait ${minutes} minutes and try again.` };
    }
    return { username, message: "Your username or PIN is not correct." };
  }

  await setSessionCookie(result.token);
  redirect("/");
}
