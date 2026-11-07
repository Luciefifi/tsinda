"use server";

import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/actor";
import { createRole, deleteRole, setRolePermissions, updateRole } from "@/server/services/roles.service";
import type { FormState } from "../../form-state";
import { runForm, text } from "../../run-form";

// The Server Actions behind the roles screens. The role is named by its key
// (e.g. "head_teacher"), which never changes, even when the role is renamed.

export async function createRoleAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  let key = "";
  const state = await runForm(
    async () => {
      key = await createRole(actor, {
        name: text(formData, "name"),
        description: text(formData, "description"),
        permissionKeys: formData.getAll("permissions[]").map(String),
      });
    },
    "Created.",
    formData,
  );
  if (!state.done) return state;
  redirect(`/admin/roles/${key}`);
}

export async function updateRoleAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(
    () => updateRole(actor, text(formData, "key"), { name: text(formData, "name"), description: text(formData, "description") }),
    "Saved.",
    formData,
  );
}

export async function setPermissionsAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  return runForm(
    () => setRolePermissions(actor, text(formData, "key"), formData.getAll("permissions[]").map(String)),
    "Permissions saved. Everyone with this role has them now.",
    formData,
  );
}

export async function deleteRoleAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  const state = await runForm(() => deleteRole(actor, text(formData, "key")), "Deleted.");
  if (!state.done) return state;
  redirect("/admin/roles");
}
