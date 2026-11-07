import { parseLesson, type SectionKind } from "@/lib/content/lesson-sections";
import { Markdown, type MarkdownTone } from "./markdown";

// A lesson laid out like the coloured boxes of the REB pupil books: each
// section gets its own card, icon and colours. Used by reviewers now and by
// pupils later, so both see exactly the same lesson.

type Look = { icon: string; card: string; label: string; tone: MarkdownTone };

const LOOKS: Record<SectionKind, Look> = {
  goal: {
    icon: "🎯",
    card: "border-l-8 border-brand-600 bg-brand-50",
    label: "text-brand-800",
    tone: "default",
  },
  think: {
    icon: "💭",
    card: "border-2 border-sun-400 bg-amber-50",
    label: "text-amber-900",
    tone: "default",
  },
  how: {
    icon: "🧠",
    card: "bg-white shadow-sm ring-1 ring-slate-200",
    label: "text-brand-800",
    tone: "steps",
  },
  example: {
    icon: "✏️",
    card: "border-2 border-emerald-200 bg-emerald-50",
    label: "text-emerald-900",
    tone: "timeline",
  },
  remember: {
    icon: "⭐",
    card: "bg-gradient-to-br from-brand-700 to-brand-800 text-white shadow-lg shadow-brand-700/30",
    label: "text-sun-400",
    tone: "inverted",
  },
  other: {
    icon: "📘",
    card: "bg-white shadow-sm ring-1 ring-slate-200",
    label: "text-ink",
    tone: "default",
  },
};

// On a laptop the lesson uses two columns. Short boxes (the goal, "Think
// first", worked examples) sit side by side; long ones ("How to do it",
// "Remember") take the full width. A box left alone on its row also takes the
// full width, so there is never an empty half. Phones keep one column.
const HALF_WIDTH: SectionKind[] = ["goal", "think", "example"];

function fullWidthFlags(kinds: SectionKind[]): boolean[] {
  const flags: boolean[] = [];
  let i = 0;
  while (i < kinds.length) {
    const pairs = HALF_WIDTH.includes(kinds[i]) && i + 1 < kinds.length && HALF_WIDTH.includes(kinds[i + 1]);
    if (pairs) {
      flags.push(false, false);
      i += 2;
    } else {
      flags.push(true);
      i += 1;
    }
  }
  return flags;
}

export function LessonView({ body }: { body: string }) {
  const lesson = parseLesson(body);
  const fullWidth = fullWidthFlags(lesson.sections.map((section) => section.kind));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {lesson.intro && (
        <div className="lg:col-span-2">
          <Markdown>{lesson.intro}</Markdown>
        </div>
      )}

      {lesson.sections.map((section, index) => {
        const look = LOOKS[section.kind];
        const span = fullWidth[index] ? "lg:col-span-2" : "";
        return (
          <section key={index} className={`flex flex-col gap-3 rounded-3xl p-5 sm:p-6 ${look.card} ${span}`}>
            <h2 className={`flex items-center gap-3 text-xl font-extrabold ${look.label}`}>
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm"
              >
                {look.icon}
              </span>
              {section.heading}
            </h2>
            <Markdown tone={look.tone}>{section.body}</Markdown>
          </section>
        );
      })}
    </div>
  );
}
