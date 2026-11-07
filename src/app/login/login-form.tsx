"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginStudentAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginStudentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label="Username"
        name="username"
        defaultValue={state.username}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        error={state.fieldErrors?.username?.[0]}
      />

      <Input
        label="PIN"
        name="pin"
        type="password"
        inputMode="numeric"
        maxLength={4}
        autoComplete="current-password"
        className="tracking-[0.5em]"
        error={state.fieldErrors?.pin?.[0]}
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
