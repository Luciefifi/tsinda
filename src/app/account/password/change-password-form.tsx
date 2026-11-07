"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_RULES_TEXT } from "@/lib/password-rules";
import { FormMessages } from "../../admin/action-button";
import { EMPTY_FORM } from "../../form-state";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm({ firstTime }: { firstTime: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, EMPTY_FORM);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label={firstTime ? "Temporary password (the one you were given)" : "Current password"}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword}
        required
      />
      <div className="flex flex-col gap-1.5">
        <Input
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword}
          required
        />
        <p className="text-sm text-slate-600">{PASSWORD_RULES_TEXT}</p>
      </div>
      <Input
        label="New password again"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save my new password"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}
