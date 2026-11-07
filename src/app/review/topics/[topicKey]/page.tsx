import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LessonView } from "@/components/content/lesson-view";
import { requirePermission } from "@/server/auth/actor";
import { getTopicForReview } from "@/server/services/review.service";
import { OpenNotes } from "../../open-notes";
import { QuestionReviewCard } from "../../question-review-card";
import { ReviewControls } from "../../review-controls";

export default function TopicReviewPage({ params }: PageProps<"/review/topics/[topicKey]">) {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading…</p>}>
      <TopicReview params={params} />
    </Suspense>
  );
}

async function TopicReview({ params }: { params: Promise<{ topicKey: string }> }) {
  const actor = await requirePermission("content:review");
  const { topicKey } = await params;
  const topic = await getTopicForReview(actor, topicKey);
  if (!topic) notFound();

  const { unit } = topic;
  const totalMarks = topic.questions.flatMap((q) => q.parts).reduce((sum, part) => sum + part.marks, 0);

  return (
    <>
      <Link href={`/review/units/${unit.key}`} className="text-sm font-bold text-brand-700 underline">
        ← Unit {unit.number}: {unit.title}
      </Link>

      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 p-6 text-white shadow-lg shadow-brand-700/30 sm:p-8">
        <span aria-hidden="true" className="absolute -top-6 -right-4 text-8xl opacity-15">
          ➗
        </span>
        <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
          {unit.subject.name} · P{unit.grade} · Unit {unit.number}
        </p>
        <h1 className="text-3xl font-extrabold leading-tight">
          <span className="text-sun-400">
            {unit.number}.{topic.number}
          </span>{" "}
          {topic.title}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
          <span className="rounded-full bg-white/15 px-3 py-1">📖 {plural(topic.lessons.length, "lesson")}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">❓ {plural(topic.questions.length, "question")}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">🏅 {totalMarks} marks</span>
        </div>
      </header>

      {topic.lessons.map((lesson) => (
        <section key={lesson.key} className="flex flex-col gap-5">
          <h2 className="text-xl font-extrabold text-ink">📖 Lesson</h2>
          <OpenNotes notes={lesson.reviewNotes} />
          <LessonView body={lesson.body} />
          <ReviewControls kind="lesson" itemKey={lesson.key} status={lesson.status} />
        </section>
      ))}

      {topic.questions.length > 0 && <h2 className="mt-4 text-xl font-extrabold text-ink">❓ Questions</h2>}
      {topic.questions.map((question, index) => (
        <QuestionReviewCard key={question.key} question={question} number={index + 1} />
      ))}
    </>
  );
}

// "1 question", "5 questions".
function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
