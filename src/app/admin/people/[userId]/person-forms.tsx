"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PASSWORD_RULES_TEXT } from "@/lib/password-rules";
import { RELATIONSHIPS } from "@/lib/relationships";
import { FormMessages } from "../../action-button";
import { EMPTY_FORM } from "../../../form-state";
import {
  linkGuardianAction,
  resetPasswordAction,
  resetPinAction,
  setRolesAction,
  updatePersonAction,
} from "../actions";
import { PasswordField } from "../password-field";

// The forms on a person's page. Each has its own Server Action and its own
// message, so saving one never clears what was typed in another.

type DetailsProps = {
  person: {
    id: string;
    kind: "pupil" | "adult";
    fullName: string;
    phone: string;
    username: string;
    examYear: number | null;
    school: string;
  };
};

export function DetailsForm({ person }: DetailsProps) {
  const [state, formAction, pending] = useActionState(updatePersonAction, EMPTY_FORM);
  const errors = state.fieldErrors ?? {};
  const typed = (name: string, saved: string) => (typeof state.values?.[name] === "string" ? String(state.values[name]) : saved);
  const thisYear = new Date().getFullYear();
  const years = [...new Set([person.examYear ?? thisYear, thisYear, thisYear + 1, thisYear + 2, thisYear + 3])].sort();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={person.id} />
      <Input label="Full name" name="fullName" defaultValue={typed("fullName", person.fullName)} error={errors.fullName} required />
      {person.kind === "adult" ? (
        <Input label="Phone number" name="phone" type="tel" defaultValue={typed("phone", person.phone)} error={errors.phone} required />
      ) : (
        <>
          <Input
            label="Username"
            name="username"
            autoCapitalize="none"
            defaultValue={typed("username", person.username)}
            error={errors.username}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Sits the PLE in" name="examYear" defaultValue={typed("examYear", String(person.examYear))} error={errors.examYear}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
            <Input label="School" name="school" defaultValue={typed("school", person.school)} error={errors.school} />
          </div>
        </>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save details"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

type RolesProps = {
  userId: string;
  roles: { key: string; name: string; description: string | null }[];
  current: string[];
};

export function RolesForm({ userId, roles, current }: RolesProps) {
  const [state, formAction, pending] = useActionState(setRolesAction, EMPTY_FORM);
  // After an error, show the boxes as the admin ticked them, not as saved.
  const ticked = state.fieldErrors ? ((state.values?.["roles[]"] as string[] | undefined) ?? []) : current;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      {roles.map((role) => (
        <label
          key={`${role.key}-${ticked.includes(role.key)}`}
          className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-slate-200 has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-600"
        >
          <input
            type="checkbox"
            name="roles[]"
            value={role.key}
            defaultChecked={ticked.includes(role.key)}
            className="mt-1 h-5 w-5 accent-brand-700"
          />
          <span className="flex flex-col">
            <span className="font-bold text-ink">{role.name}</span>
            {role.description && <span className="text-sm text-slate-600">{role.description}</span>}
          </span>
        </label>
      ))}
      {state.fieldErrors?.roles && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {state.fieldErrors.roles}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save roles"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

export function LinkGuardianForm({ userId, adults }: { userId: string; adults: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(linkGuardianAction, EMPTY_FORM);
  const errors = state.fieldErrors ?? {};

  if (adults.length === 0) {
    return <p className="text-sm text-slate-500">To add a guardian, first add them as an adult.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
      <input type="hidden" name="userId" value={userId} />
      <p className="font-bold text-ink">Add a guardian</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Adult" name="guardianId" defaultValue="" error={errors.guardianId ?? errors.guardians}>
          <option value="" disabled>
            Choose…
          </option>
          {adults.map((adult) => (
            <option key={adult.id} value={adult.id}>
              {adult.label}
            </option>
          ))}
        </Select>
        <Select label="Related as" name="relationship" defaultValue="parent" error={errors.relationship}>
          {Object.entries(RELATIONSHIPS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding..." : "Add guardian"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

// "Set a new PIN" for pupils, "Set a temporary password" for adults.
export function ResetSecretForm({ userId, kind }: { userId: string; kind: "pupil" | "adult" }) {
  const [state, formAction, pending] = useActionState(
    kind === "pupil" ? resetPinAction : resetPasswordAction,
    EMPTY_FORM,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      {kind === "pupil" ? (
        <Input
          label="New PIN (4 numbers)"
          name="pin"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          error={errors.pin}
          required
        />
      ) : (
        <>
          <PasswordField label="New temporary password" error={errors.password} />
          <p className="text-sm text-slate-600">{PASSWORD_RULES_TEXT}</p>
        </>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : kind === "pupil" ? "🔢 Set the new PIN" : "🔑 Set the temporary password"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}
