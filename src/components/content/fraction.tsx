import { splitFractions } from "@/lib/content/fractions";

type FractionProps = { whole?: string; numerator: string; denominator: string };

// A fraction drawn like in a book: the numerator over a line over the
// denominator, with an optional whole number in front ("2 1/4").
// Screen readers hear "2 and 1 over 4".
export function Fraction({ whole, numerator, denominator }: FractionProps) {
  const spoken = `${whole ? `${whole} and ` : ""}${numerator} over ${denominator}`;
  return (
    <span className="mx-0.5 inline-flex items-center gap-0.5 align-middle" role="math" aria-label={spoken}>
      {whole && <span aria-hidden="true">{whole}</span>}
      <span aria-hidden="true" className="inline-flex flex-col items-center text-[0.75em] leading-none">
        <span className="px-0.5">{numerator}</span>
        <span className="w-full border-t-2 border-current" />
        <span className="px-0.5 pt-px">{denominator}</span>
      </span>
    </span>
  );
}

// Plain text in which every "3/4" or "2 1/4" is shown as a real fraction.
export function TextWithFractions({ text }: { text: string }) {
  return (
    <>
      {splitFractions(text).map((piece, index) =>
        typeof piece === "string" ? <span key={index}>{piece}</span> : <Fraction key={index} {...piece} />,
      )}
    </>
  );
}
