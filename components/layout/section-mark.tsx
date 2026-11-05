"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The site-wide clickable `§` section marker (2026-09-07).
 *
 * Renders the serif-italic brand § as an in-page anchor. A plain click copies
 * the full section URL (origin + path + #id) to the clipboard and syncs the
 * address-bar hash via replaceState (so what you copy is what you see).
 * Ctrl/middle-click keep the native anchor behaviour (only a plain left click
 * is intercepted). The glyph sizes itself in `em` so it scales with whatever
 * heading it sits in — page titles (PageHeader / blog index), the h2
 * ModuleHeaders on the home screens, the About subsection h2s, and the prose
 * h2/h3 in blog & project bodies all share this one component.
 *
 * Interaction (user direction 2026-09-07): hovering blooms a soft brand glow
 * that hugs the § glyph itself (inner `.section-mark-glyph` span — the outer
 * anchor keeps an invisible padded hit-area, so the glow never reads as a
 * capsule around it); clicking copies the section URL and smooth-scrolls the
 * page to the section (respecting scroll-margin / scroll-padding), then
 * flashes the § to the accent colour with a small pop pulse instead of
 * swapping it for a ✓ — the glyph never changes, only its colour. Visuals
 * live in globals.css under `.section-mark` so all contexts stay consistent.
 */
export function SectionMark({
  id,
  className = "",
  size = "0.85em",
}: {
  id: string;
  /** extra classes for contexts without a flex gap (e.g. inline in prose) */
  className?: string;
  /** glyph size; default 0.85em scales with the heading it sits in */
  size?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // plain click only — modifier clicks keep native anchor semantics
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    // copy-link AND travel: bring the section to the top of the viewport.
    // scrollIntoView honours the host heading's scroll-margin-top plus the
    // global scroll-padding-top, so the section lands clear of the pinned nav.
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    const flash = () => {
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1200);
    };
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* ignore — cosmetic */
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(flash, flash);
    } else {
      flash(); // clipboard unavailable (http?) — still sync the hash
    }
  };

  return (
    <a
      href={`#${id}`}
      onClick={copy}
      aria-label={copied ? "Link copied" : "Copy link to this section"}
      title={`Copy link · 复制链接`}
      className={`section-mark inline-flex items-center justify-center font-serif italic font-normal leading-none ${copied ? "is-copied" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      <span className="section-mark-glyph">§</span>
    </a>
  );
}
