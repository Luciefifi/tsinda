import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { getCurrentActor } from "@/server/auth/actor";
import { SceneDecorations } from "../scene-decorations";
import { AdultLoginForm } from "./adult-login-form";

export const metadata: Metadata = {
  title: "Parents and teachers · Tsinda",
};

const WHAT_YOU_CAN_DO = [
  "Follow your child's lessons and progress",
  "Check lessons and questions before pupils see them",
  "Get reminders when it's time to study",
];

// The same learning scene as the pupils' page, for the adults around them.
// On a phone the teacher and the list sit above the form; on a laptop they
// sit on the left and the form on the right.
export default function AdultLoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-brand-50 px-4 py-8">
      <SceneDecorations />
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>

      <div className="relative z-10 grid w-full max-w-sm gap-6 lg:max-w-4xl lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <Logo />
          <Image
            src="/illustrations/teacher-at-board.svg"
            alt=""
            width={240}
            height={200}
            priority
            className="h-auto w-56 lg:w-full lg:max-w-md"
          />
          <div className="hidden flex-col gap-3 lg:flex">
            <h2 className="text-2xl font-bold text-ink">For parents and teachers</h2>
            <ul className="flex flex-col gap-2">
              {WHAT_YOU_CAN_DO.map((item) => (
                <li key={item} className="flex items-start gap-2 text-lg text-slate-700">
                  <span aria-hidden="true" className="font-bold text-brand-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex w-full flex-col gap-6">
          <div className="w-full rounded-3xl bg-white p-6 shadow-lg shadow-brand-700/10 sm:p-8">
            <h1 className="mb-1 text-2xl font-bold text-ink">Welcome!</h1>
            <p className="mb-6 text-slate-600">Parents and teachers, log in with your phone number.</p>
            <AdultLoginForm />
            <p className="mt-6 text-center text-sm text-slate-600">
              Forgot your password? Ask the Tsinda admin to reset it.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// Someone already logged in has nothing to do here. Reading the session waits
// for the request, so it sits behind <Suspense> while the form shows at once.
async function RedirectIfLoggedIn() {
  if (await getCurrentActor()) {
    redirect("/");
  }
  return null;
}
