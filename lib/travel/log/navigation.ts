import { readingLine } from "./reading-geometry";
import type { LogKind } from "./types";

export function chapterElement(scope: HTMLElement | null, id: string) {
  return scope?.querySelector<HTMLElement>(`[data-log-section="${CSS.escape(id)}"]`) ?? null;
}

/** All chapter buttons and map selections use this entry, with a variant landing policy. */
export function navigateToChapter(scope: HTMLElement | null, id: string, policy: LogKind) {
  const el = chapterElement(scope, id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduce ? "instant" : "smooth";
  if (policy === "journal") {
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - readingLine(scope) + 4), behavior });
  } else {
    el.scrollIntoView({ behavior, block: "start" });
  }
}
