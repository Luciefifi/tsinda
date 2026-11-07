import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requirePermission } from "@/server/auth/actor";
import { getUnitForReview } from "@/server/services/review.service";
import { ProgressBadge } from "../../progress-badge";

export default function UnitReviewPage({ params }: PageProps<"/review/units/[unitKey]">) {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <UnitTopics params={params} />
    </Suspense>
  );
}

async function UnitTopics({ params }: { params: Promise<{ unitKey: string }> }) {
  const actor = await requirePermission("content:review");
  const { unitKey } = await params;
  const unit = await getUnitForReview(actor, unitKey);
  if (!unit) notFound();

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/review" className="text-sm font-bold text-brand-700 underline">
          ← All subjects
        </Link>
        <p className="text-sm text-slate-600">
          {unit.subject.name} · P{unit.grade}
        </p>
        <h1 className="text-2xl font-bold text-ink">
          Unit {unit.number}: {unit.title}
        </h1>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {unit.topics.map((topic) => (
          <li key={topic.key}>
            <Link
              href={`/review/topics/${topic.key}`}
              className="flex h-full flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm hover:ring-2 hover:ring-brand-600"
            >
              <span className="font-bold text-brand-800">
                {unit.number}.{topic.number} {topic.title}
              </span>
              <ProgressBadge toReview={topic.toReview} approved={topic.approved} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
