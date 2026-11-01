import { Suspense } from "react";
import { requireActor } from "@/server/auth/actor";
import { logoutAction } from "./actions";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <Suspense fallback={<p className="text-zinc-600">Loading…</p>}>
        <Welcome />
      </Suspense>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg font-medium"
        >
          Log out
        </button>
      </form>
    </main>
  );
}

async function Welcome() {
  const actor = await requireActor();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold">Hello, {actor.fullName}!</h1>
      <p className="text-zinc-600">Your lessons will appear here soon.</p>
    </div>
  );
}
