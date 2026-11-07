"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionKey } from "@/server/auth/permissions";
import { FormMessages } from "../action-button";
import { EMPTY_FORM, type FormState } from "../../form-state";
import { createRoleAction, setPermissionsAction, updateRoleAction } from "./actions";
import { PERMISSION_GROUPS } from "./permission-groups";

// Tick boxes for every permission, grouped by area. `locked` shows them all
// ticked and greyed out (the Admin role).
export function PermissionBoxes({ checked, locked = false }: { checked: readonly string[]; locked?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.area} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4">
          <legend className="sr-only">{group.title}</legend>
          <p className="font-extrabold text-ink">
            <span aria-hidden="true">{group.icon}</span> {group.title}
          </p>
          {group.permissions.map((permission) => (
            <label
              key={`${permission.key}-${checked.includes(permission.key)}`}
              className={`flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200 has-checked:ring-2 has-checked:ring-brand-600 ${locked ? "opacity-80" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                name="permissions[]"
                value={permission.key}
                defaultChecked={locked || checked.includes(permission.key)}
                disabled={locked}
                className="mt-1 h-5 w-5 accent-brand-700"
              />
              <span className="flex flex-col">
                <span className="text-ink">{permission.description}</span>
                <code className="text-xs text-slate-500">{permission.key}</code>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function ticked(state: FormState, saved: readonly string[]): readonly string[] {
  return state.fieldErrors || state.error ? ((state.values?.["permissions[]"] as string[] | undefined) ?? []) : saved;
}

export function NewRoleForm() {
  const [state, formAction, pending] = useActionState(createRoleAction, EMPTY_FORM);
  const errors = state.fieldErrors ?? {};
  const value = (name: string) => (typeof state.values?.[name] === "string" ? String(state.values[name]) : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" name="name" placeholder="for example Head teacher" defaultValue={value("name")} error={errors.name} required />
          <Input
            label="What is this role for? (optional)"
            name="description"
            defaultValue={value("description")}
            error={errors.description}
          />
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-extrabold text-ink">✅ What can people with this role do?</h2>
        <PermissionBoxes checked={ticked(state, [])} />
        {errors.permissions && <p className="text-sm font-medium text-red-700">{errors.permissions}</p>}
      </section>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button type="submit" disabled={pending} className="md:w-auto md:min-w-64">
          {pending ? "Creating..." : "Create the role"}
        </Button>
        <FormMessages state={state} />
      </div>
    </form>
  );
}

export function RoleDetailsForm({ role }: { role: { key: string; name: string; description: string } }) {
  const [state, formAction, pending] = useActionState(updateRoleAction, EMPTY_FORM);
  const errors = state.fieldErrors ?? {};
  const value = (name: string, saved: string) => (typeof state.values?.[name] === "string" ? String(state.values[name]) : saved);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="key" value={role.key} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Name" name="name" defaultValue={value("name", role.name)} error={errors.name} required />
        <Input
          label="What is this role for?"
          name="description"
          defaultValue={value("description", role.description)}
          error={errors.description}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending} className="md:w-auto md:self-start md:min-w-48">
        {pending ? "Saving..." : "Save name"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

export function RolePermissionsForm({ roleKey, current }: { roleKey: string; current: PermissionKey[] }) {
  const [state, formAction, pending] = useActionState(setPermissionsAction, EMPTY_FORM);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="key" value={roleKey} />
      <PermissionBoxes checked={ticked(state, current)} />
      {state.fieldErrors?.permissions && <p className="text-sm font-medium text-red-700">{state.fieldErrors.permissions}</p>}
      <Button type="submit" disabled={pending} className="md:w-auto md:self-start md:min-w-64">
        {pending ? "Saving..." : "Save permissions"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}
