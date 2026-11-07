import { TextWithFractions } from "@/components/content/fraction";
import { Markdown } from "@/components/content/markdown";
import { describeAnswer } from "@/lib/content/describe-answer";
import { answerSpecSchema, type AnswerSpecType } from "@/server/content/answer-spec";
import type { TopicForReview } from "@/server/services/review.service";
import { OpenNotes } from "./open-notes";
import { ReviewControls } from "./review-controls";

type Question = TopicForReview["questions"][number];

const SOURCES = {
  PUPIL_BOOK: { name: "Pupil's book", badge: "bg-brand-100 text-brand-800" },
  PAST_PAPER: { name: "PLE past paper", badge: "bg-amber-100 text-amber-900" },
  MOCK: { name: "Mock exam", badge: "bg-violet-100 text-violet-900" },
  TSINDA: { name: "Tsinda practice", badge: "bg-emerald-100 text-emerald-900" },
} as const;

const ANSWER_TYPES: Record<AnswerSpecType, string> = {
  single_choice: "Choose one",
  multiple_choice: "Choose several",
  true_false: "True or false",
  matching: "Matching",
  cloze: "Fill the gaps",
  number: "Number answer",
  text: "Short answer",
  give_n: "Give a number of answers",
  ordering: "Put in order",
  classify: "Sort into groups",
  worked: "Show your working",
  free_response: "Written answer",
};

// One question as the pupil will see it, followed by what only reviewers see:
// the answer key, the explanation, the marking scheme and the model answer.
export function QuestionReviewCard({ question, number }: { question: Question; number: number }) {
  const totalMarks = question.parts.reduce((sum, part) => sum + part.marks, 0);
  const source = SOURCES[question.source];

  return (
    <article className="flex flex-col gap-4 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <header className="flex items-start gap-4 border-b border-slate-100 bg-slate-50 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-xl font-extrabold text-white">
          {number}
        </span>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className={`rounded-full px-2.5 py-1 ${source.badge}`}>{source.name}</span>
            <span className="rounded-full bg-sun-400/30 px-2.5 py-1 text-amber-900">
              🏅 {totalMarks} mark{totalMarks === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-sm text-slate-600">{question.sourceRef}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 pb-5">
        {question.needsPicture && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 font-bold text-amber-900">
            🖼️ This question still needs its picture.
          </p>
        )}

        <OpenNotes notes={question.reviewNotes} />

        {question.stimulus && (
          <div className="rounded-2xl bg-brand-50 p-4">
            {question.stimulus.title && <p className="mb-2 font-bold">{question.stimulus.title}</p>}
            <Markdown>{question.stimulus.body}</Markdown>
          </div>
        )}

        {question.instructions && (
          <p className="text-lg font-bold text-ink">
            <TextWithFractions text={question.instructions} />
          </p>
        )}

        <ol className="flex flex-col gap-4">
          {question.parts.map((part) => {
            const answer = answerSpecSchema.parse(part.answerSpec);
            return (
              <li
                key={part.label}
                className="grid gap-3 rounded-2xl ring-1 ring-slate-200 lg:grid-cols-2 lg:items-start lg:gap-0"
              >
                {/* On a laptop the question is on the left and the answer on the right. */}
                <div className="flex flex-col gap-3 p-4 pb-0 lg:pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xl leading-relaxed text-ink">
                      {part.label && <span className="mr-1 font-extrabold text-brand-700">({part.label})</span>}
                      <TextWithFractions text={part.prompt} />
                    </p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {part.marks} mark{part.marks === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{ANSWER_TYPES[answer.type]}</p>
                </div>

                <div className="m-2 mt-0 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 lg:mt-2">
                  <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                    <p className="text-xs font-bold tracking-wide text-emerald-800 uppercase">✅ Answer</p>
                    <p className="text-lg font-bold text-emerald-900">
                      <TextWithFractions text={describeAnswer(answer)} />
                    </p>
                  </div>
                  <ReviewerDetail icon="💡" label="Explanation" value={part.explanation} />
                  <ReviewerDetail icon="📋" label="Marking scheme" value={part.markingScheme} />
                  <ReviewerDetail icon="📝" label="Model answer" value={part.modelAnswer} />
                </div>
              </li>
            );
          })}
        </ol>

        <ReviewControls kind="question" itemKey={question.key} status={question.status} />
      </div>
    </article>
  );
}

function ReviewerDetail({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="px-1">
      <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
        {icon} {label}
      </p>
      <p className="whitespace-pre-line text-base text-ink">
        <TextWithFractions text={value} />
      </p>
    </div>
  );
}
