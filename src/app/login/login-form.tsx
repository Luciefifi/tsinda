"use client";

import { useActionState } from "react";
import { loginStudentAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginStudentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-base font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={state.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="rounded-lg border border-zinc-300 px-4 py-3 text-lg"
        />
        {state.fieldErrors?.username && (
          <p className="text-sm text-red-600">{state.fieldErrors.username[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pin" className="text-base font-medium">
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoComplete="current-password"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-lg tracking-[0.5em]"
        />
        {state.fieldErrors?.pin && <p className="text-sm text-red-600">{state.fieldErrors.pin[0]}</p>}
      </div>

      {state.message && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-700 px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Checking..." : "Log in"}
      </button>
    </form>
  );
}
