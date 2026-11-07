// Finds fractions written as text ("3/4") and mixed numbers ("2 1/4"), so
// they can be shown the way pupils see them in books: a number over a line
// over another number.

export type FractionPiece = { whole?: string; numerator: string; denominator: string };
export type TextPiece = string | FractionPiece;

// A mixed number "2 1/4", or a fraction "3/4". The (?<![\d/]) and (?![\d/])
// guards stop it from matching inside things like "2024/2025/26".
const FRACTION = /(?<![\d/])(?:(\d+) )?(\d+)\/(\d+)(?![\d/])/g;

export function splitFractions(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;

  for (const match of text.matchAll(FRACTION)) {
    const [full, whole, numerator, denominator] = match;
    const start = match.index;
    if (start > last) pieces.push(text.slice(last, start));
    pieces.push(whole ? { whole, numerator, denominator } : { numerator, denominator });
    last = start + full.length;
  }

  if (last < text.length) pieces.push(text.slice(last));
  return pieces;
}
