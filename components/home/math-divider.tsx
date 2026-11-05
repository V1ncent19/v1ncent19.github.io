"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Home-page decorative divider — the "∫ · ∇ · ∑" glyph between the hero and
 * the gateway grid. Pure text easter egg (user direction 2026-09-04): on hover
 * the symbols crossfade into "Ciallo～(∠・ω< )⌒★"; leaving dissolves back into
 * the math symbols. No button, no shadow, no colour change — only text opacity
 * and the width the two strings occupy.
 *
 * The phrase is wider than the symbols, so the span becomes an inline-block
 * whose width eases between the two strings' measured natural widths while the
 * two text layers crossfade. The old string stays in flow so the divider keeps
 * its natural height; the new string is an absolutely-centred overlay that
 * overflow-hides cleanly while the box is still widening.
 */

const MATH = "∫ · ∇ · ∑";
const GREETING = "Ciallo～(∠・ω< )⌒★";

/** Measure a string's natural width in the divider's own typography. */
function measureWidth(text: string, cs: CSSStyleDeclaration): number {
  const s = document.createElement("span");
  s.style.position = "absolute";
  s.style.visibility = "hidden";
  s.style.whiteSpace = "nowrap";
  s.style.left = "-9999px";
  s.style.top = "0";
  s.style.fontFamily = cs.fontFamily;
  s.style.fontSize = cs.fontSize;
  s.style.fontWeight = cs.fontWeight;
  s.style.letterSpacing = cs.letterSpacing;
  s.textContent = text;
  document.body.appendChild(s);
  const w = Math.ceil(s.getBoundingClientRect().width);
  s.remove();
  return w;
}

export function MathDivider() {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [widths, setWidths] = useState<{ math: number; greet: number } | null>(
    null,
  );

  // Measure once, after layout, so the width can ease between two fixed px
  // values (CSS can't transition `width: auto → px`).
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const cs = getComputedStyle(host);
    setWidths({
      math: measureWidth(MATH, cs),
      greet: measureWidth(GREETING, cs),
    });
  }, []);

  const widthPx = widths ? (hovered ? widths.greet : widths.math) : undefined;

  return (
    <div aria-hidden className="shell flex items-center justify-center gap-4 py-4">
      <span className="h-px flex-1 bg-line-strong/60" />
      <span
        ref={hostRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="ui-text select-none text-lg tracking-wide text-brand"
        style={{
          position: "relative",
          display: "inline-block",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textAlign: "center",
          width: widthPx !== undefined ? `${widthPx}px` : undefined,
          transition: "width 460ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Old string stays in flow, so the box keeps its natural line height. */}
        <span
          aria-hidden
          style={{ opacity: hovered ? 0 : 1, transition: "opacity 300ms ease" }}
        >
          {MATH}
        </span>
        {/* New string overlays, centred, revealed as the box widens. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        >
          {GREETING}
        </span>
      </span>
      <span className="h-px flex-1 bg-line-strong/60" />
    </div>
  );
}
