import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { getCurrentActor } from "@/server/auth/actor";
import { LoginForm } from "./login-form";
import { SceneDecorations } from "./scene-decorations";

export const metadata: Metadata = {
  title: "Log in · Tsinda",
};

// The form sits in the middle of a learning scene. On a phone the two
// children stand above the form; on a laptop they stand on either side of it.
export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-brand-50 px-4 py-8">
      <SceneDecorations />
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 lg:max-w-5xl lg:flex-row lg:items-end lg:justify-center lg:gap-10">
        {/* Phone: logo, then both children side by side */}
        <div className="flex flex-col items-center gap-4 lg:hidden">
          <Logo />
          <div className="flex items-end gap-4">
            <BoyReading className="w-40" />
            <GirlRaisingHand className="w-28" />
          </div>
        </div>

        <BoyReading className="hidden w-72 lg:block" />

        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="hidden lg:block">
            <Logo />
          </div>
          <div className="w-full rounded-3xl bg-white p-6 shadow-lg shadow-brand-700/10 sm:p-8">
            <h1 className="mb-6 text-2xl font-bold text-ink">Welcome back!</h1>
            <LoginForm />
            <p className="mt-6 text-center text-sm text-slate-600">Forgot your PIN? Ask your parent or teacher.</p>
          </div>

          <Link
            href="/login/adult"
            className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-brand-700 bg-white px-5 py-4 text-brand-800 shadow-sm hover:bg-brand-50"
          >
            <span className="flex flex-col">
              <span className="font-bold">Parent or teacher?</span>
              <span className="text-sm text-slate-600">Log in with your phone number</span>
            </span>
            <span aria-hidden="true" className="text-2xl font-bold">
              →
            </span>
          </Link>
        </div>

        <GirlRaisingHand className="hidden w-56 lg:block" />
      </div>
    </main>
  );
}

function BoyReading({ className }: { className: string }) {
  return (
    <Image
      src="/illustrations/boy-reading.svg"
      alt=""
      width={200}
      height={190}
      priority
      className={`h-auto ${className}`}
    />
  );
}

function GirlRaisingHand({ className }: { className: string }) {
  return (
    <Image
      src="/illustrations/girl-raising-hand.svg"
      alt=""
      width={150}
      height={200}
      priority
      className={`h-auto ${className}`}
    />
  );
}


async function RedirectIfLoggedIn() {
  if (await getCurrentActor()) {
    redirect("/");
  }
  return null;
}
