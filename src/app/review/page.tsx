import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { can } from "@/server/auth/access";
import { requirePermission } from "@/server/auth/actor";
import { getReviewOverview } from "@/server/services/review.service";
import { ProgressBadge } from "./progress-badge";

export const metadata: Metadata = { title: "Review · Tsinda" };

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const actor = await requirePermission("content:review");
  const subjects = await getReviewOverview(actor);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-ink">Review content</h1>
        <p className="text-slate-600">
          Check each lesson and question as the pupil will see it. Approve it, or say what needs to change.
        </p>
        {can(actor, "content:edit") && (
          <Link href="/review/notes" className="font-bold text-brand-700 underline">
            See the changes to make →
          </Link>
        )}
      </div>

      {/* The subjects sit next to each other: 1 per row on a phone, 2 on a
          tablet, 3 on a laptop. */}
      <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <section key={subject.key} className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-ink">{subject.name}</h2>
            {subject.units.length === 0 ? (
              <p className="text-slate-500">No content yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {subject.units.map((unit) => (
                  <li key={unit.key}>
                    <Link
                      href={`/review/units/${unit.key}`}
                      className="flex h-full flex-col gap-2 rounded-2xl p-4 ring-1 ring-slate-200 hover:bg-brand-50 hover:ring-brand-600"
                    >
                      <span className="font-bold text-brand-800">
                        P{unit.grade} · Unit {unit.number}: {unit.title}
                      </span>
                      <ProgressBadge toReview={unit.toReview} approved={unit.approved} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
