import type { Element, ElementContent, Root, RootContent } from "hast";
import { splitFractions } from "./fractions";

// A plugin for react-markdown: after Markdown becomes HTML, it replaces every
// fraction written as text ("3/4", "2 1/4") with a <span data-numerator ...>
// element, which the Markdown component then draws as a real fraction.
export function rehypeFractions() {
  return (tree: Root) => {
    transformChildren(tree);
  };
}

function transformChildren(node: Root | Element) {
  // Code examples are left exactly as written.
  if (node.type === "element" && (node.tagName === "code" || node.tagName === "pre")) return;

  const children: (RootContent | ElementContent)[] = [];
  for (const child of node.children) {
    if (child.type === "text") {
      children.push(...splitFractions(child.value).map(toNode));
    } else {
      if (child.type === "element") transformChildren(child);
      children.push(child);
    }
  }
  node.children = children as typeof node.children;
}

function toNode(piece: ReturnType<typeof splitFractions>[number]): ElementContent {
  if (typeof piece === "string") return { type: "text", value: piece };
  return {
    type: "element",
    tagName: "span",
    properties: {
      dataWhole: piece.whole,
      dataNumerator: piece.numerator,
      dataDenominator: piece.denominator,
    },
    children: [],
  };
}
