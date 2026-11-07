"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActor } from "@/server/auth/actor";
import {
  createAdult,
  createPupil,
  linkGuardian,
  resetPassword,
  resetPin,
  setAccountActive,
  setPersonRoles,
  unlinkGuardian,
  unlockAccount,
  updatePerson,
} from "@/server/services/people.service";
import type { FormState } from "../../form-state";
import { runForm, text } from "../../run-form";

// The Server Actions behind the people screens. Each one is a thin entry
// point: find out who is asking, read the form, call the service. The
// service checks the permission and the safety rules.

const id = z.uuid();

function userId(formData: FormData): string {
  return id.parse(formData.get("userId"));
}

export async function createPersonAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  let newId = "";

  const state = await runForm(
    async () => {
      if (text(formData, "kind") === "pupil") {
        const guardianIds = formData.getAll("guardianId[]").map(String);
        const relationships = formData.getAll("relationship[]").map(String);
        newId = await createPupil(actor, {
          fullName: text(formData, "fullName"),
          username: text(formData, "username"),
          pin: text(formData, "pin"),
          examYear: Number(text(formData, "examYear")),
          school: text(formData, "school"),
          // Rows where no adult was picked are left out.
          guardians: guardianIds
            .map((guardianId, index) => ({ guardianId, relationship: relationships[index] ?? "" }))
            .filter((row) => row.guardianId !== "")
            .map((row) => ({ ...row, guardianId: id.parse(row.guardianId) })),
        });
      } else {
        newId = await createAdult(actor, {
          fullName: text(formData, "fullName"),
          phone: text(formData, "phone"),
          temporaryPassword: text(formData, "password"),
          roleKeys: formData.getAll("roles[]").map(String),
        });
      }
    },
    "Added.",
    formData,
  );

  if (!state.done) return state;
  redirect(`/admin/people/${newId}?added=1`);
}

export async function updatePersonAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(
    () =>
      updatePerson(actor, userId(formData), {
        fullName: text(formData, "fullName"),
        phone: formData.has("phone") ? text(formData, "phone") : undefined,
        username: formData.has("username") ? text(formData, "username") : undefined,
        examYear: formData.has("examYear") ? Number(text(formData, "examYear")) : undefined,
        school: formData.has("school") ? text(formData, "school") : undefined,
      }),
    "Saved.",
    formData,
  );
}

export async function setRolesAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(
    () => setPersonRoles(actor, userId(formData), formData.getAll("roles[]").map(String)),
    "Roles saved.",
    formData,
  );
}

export async function linkGuardianAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const guardianId = id.safeParse(formData.get("guardianId"));
  if (!guardianId.success) return { fieldErrors: { guardianId: "Choose an adult." } };
  return runForm(
    () => linkGuardian(actor, userId(formData), guardianId.data, text(formData, "relationship")),
    "Guardian added.",
    formData,
  );
}

export async function unlinkGuardianAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(() => unlinkGuardian(actor, userId(formData), id.parse(formData.get("guardianId"))), "Removed.");
}

export async function resetPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(
    () => resetPassword(actor, userId(formData), text(formData, "password")),
    "Temporary password set. Tell them; they will choose their own when they log in.",
  );
}

export async function resetPinAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(() => resetPin(actor, userId(formData), text(formData, "pin")), "New PIN set.");
}

export async function unlockAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(() => unlockAccount(actor, userId(formData)), "Unlocked. They can log in now.");
}

export async function setActiveAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const active = text(formData, "active") === "true";
  return runForm(
    () => setAccountActive(actor, userId(formData), active),
    active ? "The account is on again." : "The account is turned off.",
  );
}
