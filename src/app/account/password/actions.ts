"use server";

import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/auth/actor";
import { changeOwnPassword } from "@/server/services/account.service";
import type { FormState } from "../../form-state";
import { runForm, text } from "../../run-form";

export async function changePasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  // Not requireActor(): that would send someone with a temporary password
  // back here instead of letting them change it.
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  const state = await runForm(
    () =>
      changeOwnPassword(actor, {
        currentPassword: text(formData, "currentPassword"),
        newPassword: text(formData, "newPassword"),
        confirmPassword: text(formData, "confirmPassword"),
      }),
    "Your password is changed.",
  );

  // Someone choosing their first password goes straight on to Tsinda.
  if (state.done && actor.mustChangePassword) redirect("/");
  return state;
}
