import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { can } from "@/server/auth/access";
import { requireActor } from "@/server/auth/actor";
import { hasPassword } from "@/server/services/account.service";
import { logoutAction } from "./actions";

// The page frame is static and loads instantly. Only the part that depends on
// who is logged in reads the session, so it waits behind <Suspense>.
export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-brand-50 px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-brand-700/10 sm:p-8">
          <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
            <Welcome />
          </Suspense>
        </div>

        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Log out
          </Button>
        </form>
      </div>
    </main>
  );
}

async function Welcome() {
  const actor = await requireActor();
  const isAdult = await hasPassword(actor);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">Hello, {actor.fullName}!</h1>
        {can(actor, "study:take-sessions") && <p className="text-slate-600">Your lessons will appear here soon.</p>}
      </div>

      {(can(actor, "people:manage") || can(actor, "roles:manage")) && (
        <Link
          href={can(actor, "people:manage") ? "/admin" : "/admin/roles"}
          className="rounded-xl bg-brand-700 px-5 py-3 text-center text-lg font-bold text-white hover:bg-brand-800"
        >
          ⚙️ Admin
        </Link>
      )}

      {can(actor, "content:review") && (
        <Link
          href="/review"
          className="rounded-xl bg-brand-700 px-5 py-3 text-center text-lg font-bold text-white hover:bg-brand-800"
        >
          📝 Review content
        </Link>
      )}

      {isAdult && (
        <Link href="/account/password" className="text-center font-bold text-brand-700 underline">
          Change my password
        </Link>
      )}
    </div>
  );
}
