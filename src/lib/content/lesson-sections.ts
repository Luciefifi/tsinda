// Splits a lesson into its sections, so each one can have its own look.
// Lessons follow the REB pupil-book shape, with "## " headings such as
// "What you will learn", "Think first", "How to do it", "Example" and
// "Remember".

export type SectionKind = "goal" | "think" | "how" | "example" | "remember" | "other";

export type LessonSection = { heading: string; kind: SectionKind; body: string };

export type ParsedLesson = { title: string | null; intro: string; sections: LessonSection[] };

const KINDS: [RegExp, SectionKind][] = [
  [/^what you will learn/i, "goal"],
  [/^think first/i, "think"],
  [/^example/i, "example"],
  [/^remember/i, "remember"],
  [/^(how |what is |useful idea)/i, "how"],
];

export function sectionKind(heading: string): SectionKind {
  return KINDS.find(([pattern]) => pattern.test(heading))?.[1] ?? "other";
}

export function parseLesson(markdown: string): ParsedLesson {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  let title: string | null = null;
  const intro: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    if (h1 && title === null && sections.length === 0) {
      title = h1[1].trim();
    } else if (h2) {
      sections.push({ heading: h2[1].trim(), lines: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].lines.push(line);
    } else {
      intro.push(line);
    }
  }

  return {
    title,
    intro: intro.join("\n").trim(),
    sections: sections.map(({ heading, lines: body }) => ({
      heading,
      kind: sectionKind(heading),
      body: body.join("\n").trim(),
    })),
  };
}
