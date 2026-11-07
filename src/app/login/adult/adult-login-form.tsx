"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdultAction, type AdultLoginFormState } from "./actions";

const initialState: AdultLoginFormState = {};

export function AdultLoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdultAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        defaultValue={state.phone}
        autoComplete="tel"
        placeholder="0788 123 456"
        error={state.fieldErrors?.phone?.[0]}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password?.[0]}
      />

      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Checking..." : "Log in"}
      </Button>
    </form>
  );
}
