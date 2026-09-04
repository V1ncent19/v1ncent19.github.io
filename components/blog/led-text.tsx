import { Fragment, type ReactNode } from "react";
import type { LedPart } from "@/lib/blog";

/**
 * Renders a card lede (text + inline-math segments) produced by
 * lib/blog.ts. Math segments carry pre-rendered KaTeX html (filled by
 * lib/lede-math.ts), so this component is client-safe and stateless. When a
 * search `query` is active, matching substrings inside TEXT segments are
 * wrapped in <mark class="led-mark"> — math segments are never split (matches
 * live in prose, and search indexes the same text segments).
 */
export function LedText({
  parts,
  query,
}: {
  parts: LedPart[];
  query?: string;
}) {
  const q = (query ?? "").trim().toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.kind === "text" ? (
          <Fragment key={i}>
            {q ? highlight(part.value, q) : part.value}
          </Fragment>
        ) : (
          <span
            key={i}
            className="led-math"
            // KaTeX output escapes its input; the html came from renderToString.
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        ),
      )}
    </>
  );
}

/** Terms to highlight: the whole phrase first, then its words. */
function highlightTerms(query: string): string[] {
  const phrase = query.trim();
  if (!phrase) return [];
  const words = phrase.split(/\s+/).filter((w) => w.length > 1);
  // If the phrase itself appears it wins; otherwise fall back to its words.
  return [phrase, ...words];
}

/** Case-insensitive match spans for `terms`, longest (phrase) kept first. */
function matchSpans(text: string, terms: string[]): Array<[number, number]> {
  const lower = text.toLowerCase();
  const spans: Array<[number, number]> = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(term, from);
      if (idx === -1) break;
      const end = idx + term.length;
      const overlaps = spans.some(([s, e]) => idx < e && end > s);
      if (!overlaps) spans.push([idx, end]);
      from = end;
    }
  }
  return spans.sort((a, b) => a[0] - b[0]);
}

function highlight(text: string, query: string): ReactNode[] {
  const terms = highlightTerms(query);
  if (!terms.length) return [text];
  const spans = matchSpans(text, terms);
  if (!spans.length) return [text];

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [s, e] of spans) {
    if (s > cursor) nodes.push(text.slice(cursor, s));
    nodes.push(
      <mark key={s} className="led-mark">
        {text.slice(s, e)}
      </mark>,
    );
    cursor = e;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
