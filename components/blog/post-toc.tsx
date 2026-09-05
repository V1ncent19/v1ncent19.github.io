"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Table-of-contents timeline for blog posts (2026-09-05, option A).
 * Fixed in the right-hand page gutter beside the article column, right edge
 * inside the capsule nav's right edge (same shell line) and pinned to a
 * fixed `top` — every post's timeline hangs the same distance below the top
 * of the viewport once the capsule nav is pinned (centering would make the
 * top drift with the heading count). Its vertical anchor is dynamic while
 * the big identity header is on screen: the top then follows the nav's live
 * bottom edge, so the timeline rides just below the pill instead of under
 * it (the nav is z-40 and paints over this fixed z-30 element), settling
 * back to the fixed top-24 offset once the nav pins. The aside is portalled
 * to <body> (see portalHost): the page content wrapper `.route-fade` runs a
 * transform-carrying entrance animation for 260ms, and a transformed
 * ancestor hijacks the containing block of position:fixed children, which
 * used to displace the freshly painted timeline until the animation ended.
 * Always visible while
 * reading (the capsule nav's home chip already covers back-to-top, so there
 * is no To Top button here). A thin
 * vertical track with a circle node per section; section titles are always
 * visible beside their nodes. The track segment above the current section
 * fills with the brand colour as the reader scrolls (read = filled), the
 * active node swells solid and the active title darkens.
 *
 * Progressive enhancement only: headings are collected client-side after
 * mount (the prose renderer gives them no ids), so the server HTML is
 * unchanged and the timeline renders nothing until JS runs. Item clicks
 * scroll precisely below the pinned stack (capsule nav + sticky back link)
 * instead of trusting native fragment jumps, then rewrite the hash via
 * history.replaceState. Hidden when the post has fewer than MIN_ITEMS
 * headings, and below the BREAKPOINT viewport where the gutter is too tight.
 */

type TocItem = { id: string; text: string; level: number };

const MIN_ITEMS = 3;
/* Breakpoint lives in the className (min-[1140px]): the gutter only widens
   past that viewport, and px media queries track the browser-zoomed CSS
   viewport, matching what the user actually sees. */

/** Deterministic, URL-safe slug (CJK kept; collisions get a numeric suffix). */
function slugify(text: string, used: Set<string>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
      .replace(/\s+/g, "-") || "section";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

/**
 * Vertical space occupied by the pinned stack (capsule nav + sticky back
 * link) — headings must land below this after a TOC jump, and a heading
 * counts as "current" once its top passes this line.
 */
function pinnedOffset(): number {
  const nav = document.querySelector('nav[aria-label="Primary"]');
  const back = document.querySelector("main .sticky");
  const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
  const backBottom = back ? back.getBoundingClientRect().bottom : 0;
  return Math.max(navBottom, backBottom) + 14;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PostToc() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  /* Anchor for the aside's FIRST paint. Measured in the same rAF callback
     that collects the headings and carried into that same commit's style,
     so frame one is already glued below the capsule nav — otherwise the
     aside flashes at the static top-24 position for a frame and then jumps
     (visible as a two-step pop when entering the page). */
  const [topOffset, setTopOffset] = useState<number | null>(null);
  /* Portal host: the timeline mounts under <body>, NOT inside the page tree.
     The page content is wrapped in `.route-fade`, whose entrance animation
     carries a transform for 260ms — and a transformed ancestor becomes the
     containing block for position:fixed, which displaced the freshly painted
     timeline ~230px down the page until the animation ended (a visible
     jump). Portalling outside that wrapper keeps the aside truly
     viewport-fixed from its very first frame. Safe to grab document.body in
     a callback: the aside renders nothing until this client-side state
     lands (server HTML and the hydration render are both null). */
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const prose = document.querySelector(".prose");
    if (!prose) return;

    let collectRaf = 0;
    let raf = 0;
    const headingsRef: { current: HTMLHeadingElement[] } = { current: [] };

    /**
     * Glue the timeline's top to the capsule nav's bottom edge. While the
     * big identity header is on screen the nav rides in normal flow (it can
     * sit 140–200px down), and being z-40 it would paint right over a
     * fixed top-24 z-30 element — so the anchor follows the nav's live
     * bottom instead. Once the nav pins (bottom ≈ 72px) the max() settles
     * at the original fixed 96px offset, unchanged from before. Written
     * straight to style.top from the rAF callbacks (no state, no re-render)
     * so the motion tracks the nav exactly, frame for frame.
     */
    let lastTop = -1;
    /* top-24 = 6rem, but the site runs at --page-scale 0.9 via the html
       font-size — read the real computed rem instead of hardcoding 96px. */
    const BASE_TOP =
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 6;
    const navBottomNow = () => {
      const nav = document.querySelector('nav[aria-label="Primary"]');
      return nav ? nav.getBoundingClientRect().bottom : 0;
    };
    const syncTop = () => {
      const el = asideRef.current;
      if (!el) return;
      const top = Math.max(BASE_TOP, navBottomNow() + 12);
      if (Math.abs(lastTop - top) > 0.5) {
        lastTop = top;
        el.style.top = `${top}px`;
      }
    };

    // Collect h2/h3 one frame after mount (setState stays inside a callback,
    // never synchronous in the effect body), stamp ids, build the list.
    collectRaf = requestAnimationFrame(() => {
      const used = new Set<string>();
      const headings = Array.from(
        prose.querySelectorAll<HTMLHeadingElement>("h2, h3"),
      );
      if (headings.length < MIN_ITEMS) return;
      headingsRef.current = headings;
      setItems(
        headings.map((h) => {
          if (!h.id) h.id = slugify(h.textContent ?? "", used);
          return {
            id: h.id,
            text: (h.textContent ?? "").trim(),
            level: h.tagName === "H2" ? 2 : 3,
          };
        }),
      );
      // Same-commit anchor (see topOffset): the aside's very first paint is
      // already at the tracked position, so there is no two-step pop.
      setTopOffset(Math.max(BASE_TOP, navBottomNow() + 12));
      setPortalHost(document.body);
      // From the next frame on, scroll/resize keep it glued (style writes
      // only — no state, no re-render).
      requestAnimationFrame(syncTop);
    });

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        syncTop();
        const vh = window.innerHeight;
        // Reading progress: how far the viewport top has travelled through
        // the article body.
        const rect = prose.getBoundingClientRect();
        const total = rect.height - vh * 0.5;
        const p = total > 0 ? (vh * 0.4 - rect.top) / total : 0;
        setProgress(Math.min(1, Math.max(0, p)));
        // Active section: last heading below the pinned-stack line.
        const line = pinnedOffset() + 4;
        let current = -1;
        const list = headingsRef.current;
        for (let i = 0; i < list.length; i++) {
          if (list[i].getBoundingClientRect().top <= line) current = i;
          else break;
        }
        setActiveIdx(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (collectRaf) cancelAnimationFrame(collectRaf);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /** Precise jump: land the heading just below the pinned stack. */
  const jump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return; // native anchor fallback
    event.preventDefault();
    const top =
      el.getBoundingClientRect().top + window.scrollY - pinnedOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    history.replaceState(null, "", `#${id}`);
  };

  if (items.length < MIN_ITEMS || !portalHost) return null;

  const last = items.length - 1;

  return createPortal(
    <aside
      ref={asideRef}
      aria-label="Table of contents"
      className="fixed top-24 z-30 hidden w-48 min-[1140px]:block"
      style={{
        /* First-paint anchor (see topOffset); scroll keeps it glued via
           direct style.top writes afterwards. Falls back to the top-24
           class until the first measurement lands. */
        top: topOffset ?? undefined,
        /* % in `right` resolves against the fixed containing block, which
           excludes the scrollbar — no 100vw scrollbar bias. The extra 1.5rem
           keeps the timeline's right edge clearly INSIDE the capsule nav's
           right edge instead of flush with it. */
        right: "max(1.25rem, calc((100% - 68rem) / 2 + 1.5rem))",
      }}
    >
      {/* Head: CONTENTS caption + reading progress. No back-to-top here —
          the capsule nav's home chip already returns to the top. */}
      <div className="flex h-7 items-center justify-between pr-0.5">
        <span className="ui-text text-[10px] font-bold uppercase tracking-widest text-faint">
          Contents
        </span>
        <span className="font-mono text-[10px] tabular-nums text-faint">
          {Math.round(progress * 100)}%
        </span>
      </div>

      {/* Timeline: one row per section — node column (vertical track segments
          + circle) on the left, always-visible title on the right. Track
          segments above the active node are brand-filled (read portion). */}
      <nav className="mt-2 max-h-[52vh] overflow-y-auto">
        <ul>
          {items.map((item, i) => {
            const isActive = i === activeIdx;
            const isPassed = i < activeIdx;
            /* Segment between node i-1 and node i = "read" once the reader
               is at or past node i-1… i.e. filled when i <= activeIdx. */
            const topFilled = i > 0 && i <= activeIdx;
            const bottomFilled = i < last && i + 1 <= activeIdx;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => jump(e, item.id)}
                  className="group flex items-start gap-2.5 py-1.5 text-left transition-colors hover:no-underline"
                >
                  {/* Node column: the track runs through its centre. */}
                  <span
                    aria-hidden
                    className="relative w-3 shrink-0 self-stretch"
                  >
                    {i > 0 && (
                      <span
                        className={`absolute bottom-1/2 left-1/2 top-[-6px] w-px -translate-x-1/2 ${topFilled ? "bg-brand" : "bg-line"}`}
                      />
                    )}
                    {i < last && (
                      <span
                        className={`absolute bottom-[-6px] left-1/2 top-1/2 w-px -translate-x-1/2 ${bottomFilled ? "bg-brand" : "bg-line"}`}
                      />
                    )}
                    <span
                      className={[
                        "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300",
                        isActive
                          ? "h-2.5 w-2.5 bg-brand shadow-[0_0_0_3px_var(--brand-soft)]"
                          : item.level === 3
                            ? "h-1.5 w-1.5 border border-line-strong bg-surface group-hover:bg-line-strong"
                            : isPassed
                              ? "h-2 w-2 bg-brand"
                              : "h-2 w-2 border border-line-strong bg-surface group-hover:bg-line-strong",
                      ].join(" ")}
                    />
                  </span>
                  <span
                    className={[
                      "min-w-0 flex-1 truncate leading-snug transition-colors duration-200",
                      item.level === 3
                        ? "text-[11px] pl-0.5"
                        : "text-xs",
                      isActive
                        ? "font-semibold text-brand"
                        : isPassed
                          ? "text-ink/80 group-hover:text-ink"
                          : "text-muted group-hover:text-ink",
                    ].join(" ")}
                  >
                    {item.text}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>,
    portalHost,
  );
}
