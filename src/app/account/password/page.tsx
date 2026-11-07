import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getCurrentActor } from "@/server/auth/actor";
import { hasPassword } from "@/server/services/account.service";
import { logoutAction } from "../../actions";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Your password · Tsinda",
};

// Where adults change their password, and where anyone with a temporary
// password (set by an admin) is sent until they choose their own.
export default function ChangePasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-brand-50 px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-brand-700/10 sm:p-8">
          <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
            <ChangePassword />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function ChangePassword() {
  // getCurrentActor, not requireActor: requireActor sends people with a
  // temporary password here, which would loop.
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  if (!(await hasPassword(actor))) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-ink">You use a PIN</h1>
        <p className="text-slate-600">Pupils log in with a PIN. Ask your parent or teacher if you need a new one.</p>
        <Link href="/" className="font-bold text-brand-700 underline">
          ← Back
        </Link>
      </div>
    );
  }

  const firstTime = actor.mustChangePassword;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">{firstTime ? "Choose your own password" : "Change your password"}</h1>
        <p className="text-slate-600">
          {firstTime
            ? `Welcome, ${actor.fullName}! You logged in with a temporary password. Choose your own to continue; only you will know it.`
            : "Your other phones and computers will be logged out. This one stays logged in."}
        </p>
      </div>
      <ChangePasswordForm firstTime={firstTime} />
      {firstTime ? (
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Log out
          </Button>
        </form>
      ) : (
        <Link href="/" className="text-center font-bold text-brand-700 underline">
          ← Back
        </Link>
      )}
    </div>
  );
}
