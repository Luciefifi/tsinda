import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { rehypeFractions } from "@/lib/content/rehype-fractions";
import { Fraction } from "./fraction";

export type MarkdownTone = "default" | "steps" | "timeline" | "inverted";

// Shows lesson text written in Markdown, styled for Tsinda: large, readable
// text for a child on a phone. remark-gfm adds tables; rehypeFractions turns
// "3/4" into real fractions. The tone changes how lists look:
//   steps     numbered circles (how to do something)
//   timeline  a line of dots (the steps of a worked example)
//   inverted  white text, for dark cards
function componentsFor(tone: MarkdownTone): Components {
  const strong = tone === "inverted" ? "font-bold text-white" : "font-bold text-ink";

  return {
    h1: ({ children }) => <h1 className="mb-4 text-2xl font-bold">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-6 mb-2 text-xl font-bold">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 mb-2 text-lg font-bold">{children}</h3>,
    p: ({ children }) => <p className="mb-3 text-lg leading-relaxed last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className={strong}>{children}</strong>,
    ul: ({ children }) =>
      tone === "timeline" ? (
        <ul className="mb-3 ml-2 border-l-4 border-emerald-200 last:mb-0">{children}</ul>
      ) : (
        <ul className="mb-3 ml-6 list-disc space-y-2 text-lg marker:text-brand-600 last:mb-0">{children}</ul>
      ),
    ol: ({ children }) =>
      tone === "steps" ? (
        <ol className="mb-3 flex list-none flex-col gap-3 [counter-reset:step] last:mb-0">{children}</ol>
      ) : (
        <ol className="mb-3 ml-6 list-decimal space-y-2 text-lg last:mb-0">{children}</ol>
      ),
    li: ({ children }) => {
      if (tone === "steps") {
        return (
          <li className="relative pl-12 text-lg leading-relaxed [counter-increment:step] before:absolute before:top-0 before:left-0 before:flex before:h-9 before:w-9 before:items-center before:justify-center before:rounded-full before:bg-brand-700 before:font-bold before:text-white before:content-[counter(step)]">
            {children}
          </li>
        );
      }
      if (tone === "timeline") {
        return (
          <li className="relative mb-3 pl-6 text-lg leading-relaxed last:mb-0 before:absolute before:top-2.5 before:-left-[10px] before:h-4 before:w-4 before:rounded-full before:border-4 before:border-white before:bg-emerald-500">
            {children}
          </li>
        );
      }
      return <li className="leading-relaxed">{children}</li>;
    },
    table: ({ children }) => (
      <div className="mb-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse text-left">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-slate-200 bg-brand-50 px-3 py-2 font-bold">{children}</th>,
    td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2">{children}</td>,
    // Fractions marked by rehypeFractions.
    span: ({ node, children }) => {
      const props = node?.properties;
      if (props?.dataNumerator && props.dataDenominator) {
        return (
          <Fraction
            whole={props.dataWhole ? String(props.dataWhole) : undefined}
            numerator={String(props.dataNumerator)}
            denominator={String(props.dataDenominator)}
          />
        );
      }
      return <span>{children}</span>;
    },
  };
}

export function Markdown({ children, tone = "default" }: { children: string; tone?: MarkdownTone }) {
  return (
    <div className={tone === "inverted" ? "text-white" : "text-ink"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeFractions]} components={componentsFor(tone)}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
