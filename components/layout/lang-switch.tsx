"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { bilingualBases } from "@/content/site/navigation";

/** Alternate-language link for pages that have an English + nested /zh pair.
 * The homepage's Chinese counterpart currently lives at /zh as a placeholder
 * page (home has no Chinese content yet — the user fills it in later), so the
 * switch is present on every top-level route. Routes without any counterpart
 * (a blog post body, …) still render nothing. */
function alternateFor(path: string): { href: string; label: string; title: string } | null {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/") {
    return { href: "/zh/", label: "中文", title: "切换至中文" };
  }
  if (p === "/zh") {
    return { href: "/", label: "EN", title: "Switch to English" };
  }
  const seg = p.split("/").filter(Boolean);

  if (seg.length === 1) {
    const [base] = seg;
    if (!bilingualBases.has(base)) return null;
    return { href: `/${base}/zh/`, label: "中文", title: "切换至中文" };
  }
  if (seg.length === 2 && seg[1] === "zh") {
    const [base] = seg;
    if (!bilingualBases.has(base)) return null;
    return { href: `/${base}/`, label: "EN", title: "Switch to English" };
  }
  return null;
}

/**
 * Scroll position across language switches (2026-09-07). A language switch is
 * a full route change to a different document, so Next resets the scroll —
 * to keep the reader near the same content we snapshot the nearest section
 * and progress within it, then restore that progress in the translated page.
 * The homepage uses its three main sections because the later two-column
 * headings can share a vertical position. Pages without matching anchors
 * fall back to proportional document scroll.
 */
const POS_KEY = "wb-lang-pos";

type SavedPos = { id: string | null; frac: number; sectionFrac: number | null; y: number };

const READING_LINE = 160;

function sectionHeadings(path: string): HTMLElement[] {
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized === "/zh") {
    return ["hello", "navigation", "posts"]
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);
  }
  return [...document.querySelectorAll<HTMLElement>("h2[id], h3[id]")];
}

function documentTop(el: HTMLElement): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

function saveScrollPos(path: string) {
  try {
    const doc = document.documentElement;
    const spans = doc.scrollHeight - window.innerHeight;
    let id: string | null = null;
    let sectionFrac: number | null = null;
    const headings = sectionHeadings(path);
    const activeIndex = headings.findLastIndex(el => el.getBoundingClientRect().top <= READING_LINE);
    if (activeIndex >= 0) {
      const current = headings[activeIndex];
      const start = documentTop(current);
      const end = headings[activeIndex + 1] ? documentTop(headings[activeIndex + 1]) : doc.scrollHeight;
      id = current.id;
      sectionFrac = Math.max(0, Math.min(1, (window.scrollY + READING_LINE - start) / Math.max(1, end - start)));
    }
    const frac = spans > 0 ? window.scrollY / spans : 0;
    sessionStorage.setItem(
      POS_KEY,
      JSON.stringify({ id, frac, sectionFrac, y: window.scrollY } satisfies SavedPos),
    );
  } catch {
    /* private mode etc. — restore is best-effort only */
  }
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const alt = alternateFor(pathname);

  // Restore after a language switch. The key only exists when we navigated
  // via the switch itself, so ordinary navigations are untouched.
  useEffect(() => {
    let saved: SavedPos | null = null;
    try {
      const raw = sessionStorage.getItem(POS_KEY);
      if (raw) {
        saved = JSON.parse(raw) as SavedPos;
        sessionStorage.removeItem(POS_KEY);
      }
    } catch {
      return;
    }
    if (!saved) return;
    /* double rAF: the new route's DOM must be laid out before we measure.
       The catch: the fresh document is still SHORT (webfonts not swapped,
       images not loaded), so the initial scroll can clamp to the current max
       and the later growth leaves the position hundreds of px off. So we
       re-apply whenever the document height changes (ResizeObserver, bounded
       to 4s) — every pass bails out once the reader scrolls by themselves.
       (setState-free — pure presentation scroll, like GatewayReveal.) */
    let cancelled = false;
    let lastAppliedY: number | null = null;
    const apply = () => {
      if (cancelled) return;
      if (lastAppliedY !== null && Math.abs(window.scrollY - lastAppliedY) > 4)
        return; // the reader has taken over — don't fight them
      const headings = sectionHeadings(pathname);
      const activeIndex = headings.findIndex(el => el.id === saved!.id);
      if (activeIndex >= 0 && typeof saved!.sectionFrac === "number") {
        const start = documentTop(headings[activeIndex]);
        const end = headings[activeIndex + 1] ? documentTop(headings[activeIndex + 1]) : document.documentElement.scrollHeight;
        window.scrollTo(0, start + saved!.sectionFrac * (end - start) - READING_LINE);
        lastAppliedY = window.scrollY;
        return;
      }
      const spans = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const y = saved!.id ? saved!.frac * spans : saved!.y ?? saved!.frac * spans;
      window.scrollTo(0, y);
      lastAppliedY = window.scrollY;
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(apply));
    const ro = new ResizeObserver(() => apply());
    ro.observe(document.documentElement);
    const stop = window.setTimeout(() => ro.disconnect(), 4000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.clearTimeout(stop);
    };
  }, [pathname]);

  if (!alt) return null;

  return (
    <Link
      href={alt.href}
      scroll={false}
      title={alt.title}
      onClick={() => saveScrollPos(pathname)}
      className={[
        "ui-text inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-muted shadow-sm transition-colors",
        "hover:bg-surface-tint hover:text-ink hover:no-underline",
        className,
      ].join(" ")}
    >
      {alt.label}
    </Link>
  );
}
