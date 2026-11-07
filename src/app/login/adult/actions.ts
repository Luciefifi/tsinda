"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { setSessionCookie } from "@/server/auth/cookies";
import { loginAdult } from "@/server/services/auth.service";
import { adultLoginSchema } from "./schema";

export type AdultLoginFormState = {
  phone?: string;
  message?: string;
  fieldErrors?: { phone?: string[]; password?: string[] };
};

export async function loginAdultAction(
  _previousState: AdultLoginFormState,
  formData: FormData,
): Promise<AdultLoginFormState> {
  const phone = String(formData.get("phone") ?? "");
  const parsed = adultLoginSchema.safeParse({ phone, password: formData.get("password") ?? "" });
  if (!parsed.success) {
    return { phone, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await loginAdult(parsed.data.phone, parsed.data.password);
  if (!result.ok) {
    if (result.reason === "locked") {
      const minutes = Math.ceil((result.lockedUntil.getTime() - Date.now()) / 60_000);
      return { phone, message: `Too many wrong tries. Please wait ${minutes} minutes and try again.` };
    }
    return { phone, message: "Your phone number or password is not correct." };
  }

  await setSessionCookie(result.token);
  redirect("/");
}
