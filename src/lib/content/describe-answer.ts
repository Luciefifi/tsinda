import type { AnswerSpec } from "@/server/content/answer-spec";

// Turns an answer key into plain words, so a reviewer can check it without
// reading JSON. For example { type: "single_choice", ..., correct: 1 }
// becomes "B: 120,000 Frw".

const letter = (index: number) => String.fromCharCode(65 + index); // 0 -> "A"

// "small" or "small (also accepted: little)"
function withAlternatives(accepted: string[]): string {
  const [first, ...others] = accepted;
  return others.length ? `${first} (also accepted: ${others.join(", ")})` : first;
}

export function describeAnswer(spec: AnswerSpec): string {
  switch (spec.type) {
    case "single_choice":
      return `${letter(spec.correct)}: ${spec.options[spec.correct]}`;
    case "multiple_choice":
      return spec.correct.map((i) => `${letter(i)}: ${spec.options[i]}`).join(" and ");
    case "true_false":
      return spec.correct ? "True" : "False";
    case "matching":
      return spec.pairs.map(([l, r]) => `${spec.left[l]} → ${spec.right[r]}`).join("; ");
    case "cloze":
      return spec.blanks.map((blank, i) => `Gap ${i + 1}: ${withAlternatives(blank.accepted)}`).join("; ");
    case "number": {
      const unit = spec.unit ? ` ${spec.unit}` : "";
      return spec.acceptEquivalent
        ? `${spec.answer}${unit} (equal values are also accepted, e.g. a decimal or a simplified fraction)`
        : `${spec.answer}${unit} (exactly this form)`;
    }
    case "text":
      return withAlternatives(spec.accepted);
    case "give_n":
      return `Any ${spec.count} of: ${spec.answers.map((a) => withAlternatives(a.accepted)).join("; ")}`;
    case "ordering":
      return spec.items.join(" → ");
    case "classify":
      return spec.groups
        .map((group, g) => `${group}: ${spec.items.filter((item) => item.group === g).map((item) => item.text).join(", ")}`)
        .join("; ");
    case "worked": {
      const unit = spec.finalAnswer.unit ? ` ${spec.finalAnswer.unit}` : "";
      return `Final answer ${spec.finalAnswer.answer}${unit} (${spec.finalAnswerMarks} mark${spec.finalAnswerMarks === 1 ? "" : "s"}). The working is marked by a reviewer.`;
    }
    case "free_response":
      return spec.maxWords ? `Marked by a reviewer (at most ${spec.maxWords} words).` : "Marked by a reviewer.";
  }
}
