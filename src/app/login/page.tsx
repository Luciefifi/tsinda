import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentActor } from "@/server/auth/actor";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in · Tsinda",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold">Tsinda</h1>
        <p className="text-zinc-600">Log in to start learning.</p>
      </div>
      <LoginForm />
    </main>
  );
}

async function RedirectIfLoggedIn() {
  if (await getCurrentActor()) {
    redirect("/");
  }
  return null;
}
