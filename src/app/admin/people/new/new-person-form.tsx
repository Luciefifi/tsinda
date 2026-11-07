"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PASSWORD_RULES_TEXT } from "@/lib/password-rules";
import { formatPhone } from "@/lib/phone";
import { RELATIONSHIPS } from "@/lib/relationships";
import { FormMessages } from "../../action-button";
import { EMPTY_FORM } from "../../../form-state";
import { createPersonAction } from "../actions";
import { PasswordField } from "../password-field";

type Props = {
  guardians: { id: string; fullName: string; phone: string }[];
  roles: { key: string; name: string; description: string | null }[];
  defaultExamYear: number;
};

// One form for both kinds of person. Choosing "Pupil" or "Adult" at the top
// shows the fields that kind needs; the hidden "kind" field tells the action.
export function NewPersonForm({ guardians, roles, defaultExamYear }: Props) {
  const [state, formAction, pending] = useActionState(createPersonAction, EMPTY_FORM);
  const [kind, setKind] = useState<"pupil" | "adult">(state.values?.kind === "adult" ? "adult" : "pupil");
  const [guardianRows, setGuardianRows] = useState(1);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const value = (name: string) => (typeof values[name] === "string" ? (values[name] as string) : undefined);
  const thisYear = new Date().getFullYear();

  return (
    <form action={formAction} className="grid items-start gap-6 lg:grid-cols-3">
      <input type="hidden" name="kind" value={kind} />

      <fieldset className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm lg:col-span-3">
        <legend className="sr-only">Who are you adding?</legend>
        <p className="font-bold text-ink">Who are you adding?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <KindChoice
            selected={kind === "pupil"}
            onSelect={() => setKind("pupil")}
            icon="🎒"
            title="A pupil"
            text="Logs in with a username and a 4-number PIN."
          />
          <KindChoice
            selected={kind === "adult"}
            onSelect={() => setKind("adult")}
            icon="🧑‍🏫"
            title="An adult"
            text="A parent, teacher or helper. Logs in with a phone number and a password."
          />
        </div>
      </fieldset>

      <section className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-xl font-extrabold text-ink">{kind === "pupil" ? "🎒 The pupil" : "🧑‍🏫 The adult"}</h2>
        <Input label="Full name" name="fullName" defaultValue={value("fullName")} error={errors.fullName} required />

        {kind === "pupil" ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Username"
                name="username"
                defaultValue={value("username")}
                error={errors.username}
                autoCapitalize="none"
                placeholder="for example keza"
                required
              />
              <Input
                label="PIN (4 numbers)"
                name="pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                error={errors.pin}
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                label="Sits the PLE in"
                name="examYear"
                defaultValue={value("examYear") ?? String(defaultExamYear)}
                error={errors.examYear}
              >
                {[0, 1, 2, 3].map((offset) => (
                  <option key={offset} value={thisYear + offset}>
                    {thisYear + offset}
                  </option>
                ))}
              </Select>
              <Input label="School (optional)" name="school" defaultValue={value("school")} error={errors.school} />
            </div>
          </>
        ) : (
          <>
            <Input
              label="Phone number"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="0788 123 456"
              defaultValue={value("phone")}
              error={errors.phone}
              required
            />
            <PasswordField label="Temporary password" error={errors.password} />
            <p className="-mt-3 text-sm text-slate-600">
              {PASSWORD_RULES_TEXT} Tell them this password; they will choose their own the first time they log in.
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
        {kind === "pupil" ? (
          <>
            <h2 className="text-xl font-extrabold text-ink">👪 Who looks after this pupil?</h2>
            <p className="text-sm text-slate-600">
              Optional. They will follow the pupil&apos;s progress and get reminders. Add the adult first if they
              are not in the list.
            </p>
            {Array.from({ length: guardianRows }, (_, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-2xl bg-brand-50 p-3">
                <Select label={`Adult ${guardianRows > 1 ? index + 1 : ""}`} name="guardianId[]" defaultValue="">
                  <option value="">Nobody</option>
                  {guardians.map((guardian) => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.fullName} ({formatPhone(guardian.phone)})
                    </option>
                  ))}
                </Select>
                <Select label="Related as" name="relationship[]" defaultValue="parent">
                  {Object.entries(RELATIONSHIPS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            {errors.guardians && <p className="text-sm font-medium text-red-700">{errors.guardians}</p>}
            {errors.relationship && <p className="text-sm font-medium text-red-700">{errors.relationship}</p>}
            {guardianRows < 4 && (
              <button
                type="button"
                onClick={() => setGuardianRows((rows) => rows + 1)}
                className="self-start font-bold text-brand-700 underline"
              >
                + Another adult
              </button>
            )}
          </>
        ) : (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xl font-extrabold text-ink">🎭 Roles</legend>
            {roles.map((role) => (
              <label
                key={role.key}
                className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-slate-200 has-checked:bg-brand-50 has-checked:ring-2 has-checked:ring-brand-600"
              >
                <input
                  type="checkbox"
                  name="roles[]"
                  value={role.key}
                  defaultChecked={(values["roles[]"] ?? []).includes(role.key)}
                  className="mt-1 h-5 w-5 accent-brand-700"
                />
                <span className="flex flex-col">
                  <span className="font-bold text-ink">{role.name}</span>
                  {role.description && <span className="text-sm text-slate-600">{role.description}</span>}
                </span>
              </label>
            ))}
            {errors.roles && <p className="text-sm font-medium text-red-700">{errors.roles}</p>}
          </fieldset>
        )}
      </section>

      <div className="flex flex-col gap-3 lg:col-span-3 lg:flex-row lg:items-center">
        <Button type="submit" disabled={pending} className="lg:w-auto lg:min-w-64">
          {pending ? "Adding..." : kind === "pupil" ? "Add the pupil" : "Add the adult"}
        </Button>
        <FormMessages state={state} />
      </div>
    </form>
  );
}

function KindChoice(props: { selected: boolean; onSelect: () => void; icon: string; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.selected}
      className={`flex items-start gap-3 rounded-2xl p-4 text-left transition ${
        props.selected ? "bg-brand-700 text-white shadow-lg shadow-brand-700/30" : "bg-brand-50 text-ink hover:bg-brand-100"
      }`}
    >
      <span aria-hidden="true" className="text-3xl">
        {props.icon}
      </span>
      <span className="flex flex-col">
        <span className="text-lg font-extrabold">{props.title}</span>
        <span className={props.selected ? "text-brand-100" : "text-slate-600"}>{props.text}</span>
      </span>
    </button>
  );
}
