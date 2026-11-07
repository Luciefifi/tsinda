"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM, type FormState } from "../form-state";

type ActionButtonProps = {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>; // hidden inputs, e.g. { userId }
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string; // asks "Are you sure?" first
};

// A one-click action (unlock, turn off, remove...) with its own message.
export function ActionButton({ action, fields, label, pendingLabel, variant = "secondary", confirm }: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? (pendingLabel ?? "Saving...") : label}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

// The success or error line under a form.
export function FormMessages({ state }: { state: FormState }) {
  return (
    <>
      {state.done && (
        <p role="status" className="text-sm font-medium text-green-700">
          ✅ {state.done}
        </p>
      )}
      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
    </>
  );
}
