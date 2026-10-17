"use client";

/**
 * About "sealed facts" board (prototype v2, 2026-09-05) — LAYOUT ONLY.
 *
 * v1 was 13 individual stamp cards, some hiding a second seal "on the back" —
 * too many clicks. v2 groups the same facts VERBATIM into 5 themed envelopes:
 * one seal per envelope, breaking it unfolds the whole category at once. The
 * meme-iest one-liners ride inline as heimu spoiler bars instead of card backs.
 *
 * The facts themselves moved to `content/about/facts.tsx` (2026-10-17): they
 * are authored prose, this file is only the envelopes/seals/counter. Edit the
 * text there.
 *
 * - Everything stays in the static HTML (the seals are presentation only).
 * - Expand/collapse uses the proven grid-rows 0fr↔1fr pattern, the
 *   reduced-motion global rule applies.
 */

import { useState, type ReactNode } from "react";
import { SectionMark } from "@/components/layout/section-mark";
import { Check } from "lucide-react";
import { copy, type Lang } from "@/lib/i18n";
import type { PersonalityData } from "@/lib/content";
import { FACT_GROUPS } from "@/content/about/facts";
import { PersonalityTimeline } from "@/components/about/personality-timeline";

export function FactsBoard({
  lang,
  personality,
}: {
  lang: Lang;
  personality: PersonalityData;
}) {
  const s = copy[lang].about;
  const groups = FACT_GROUPS[lang];
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  /** Completion moment: every envelope unsealed → chip pops green once. */
  const allDone = opened.size === groups.length;

  /** Data-driven panels appended inside specific envelopes (after the items). */
  const extraPanels: Record<string, ReactNode> = {
    myself: <PersonalityTimeline lang={lang} data={personality} />,
  };

  const breakSeal = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <section className="mt-14" aria-label={s.factsTitle}>
      <div className="mb-5 border-b border-line pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="facts"
            className="flex scroll-mt-28 items-center gap-3.5 text-2xl font-semibold tracking-tight"
          >
            <SectionMark id="facts" />
            {s.factsTitle}
          </h2>
          <span
            className={`ui-text inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs tracking-wide tabular-nums transition-colors duration-300 ${
              allDone ? "facts-chip-done" : "border-line text-muted"
            }`}
          >
            {allDone ? (
              <Check size={12} strokeWidth={3} aria-hidden className="facts-chip-check" />
            ) : null}
            {s.factsDiscovered} {opened.size} / {groups.length}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted">{s.factsLead}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g, i) => {
          const open = opened.has(g.id);
          return (
            <article
              key={g.id}
              data-fact={g.id}
              className={`rounded-xl border p-4 transition-all duration-300 sm:p-5 ${
                open
                  ? "border-line bg-surface shadow-sm"
                  : "border-dashed border-brand/40 bg-transparent hover:-translate-y-0.5 hover:bg-surface"
              }`}
            >
              <button
                type="button"
                onClick={() => breakSeal(g.id)}
                aria-expanded={open}
                className="group flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 flex-none -rotate-6 items-center justify-center rounded-md text-[11px] font-semibold tracking-wide transition-colors duration-300 ${
                    open
                      ? "border border-solid border-brand bg-brand text-on-brand"
                      : "border border-dashed border-brand/60 text-brand group-hover:border-solid group-hover:bg-brand group-hover:text-on-brand"
                  }`}
                >
                  {open ? <Check size={16} aria-hidden /> : `№${i + 1}`}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {g.tag}
                  </span>
                  <span className="block text-xs text-muted">
                    {open ? s.factsOpened : s.factsSealed}
                  </span>
                </span>
              </button>

              <div
                aria-hidden={!open}
                className={`grid transition-all duration-300 ease-out ${
                  open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul className="space-y-2.5">
                    {g.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex gap-2.5 text-[15px] leading-relaxed text-ink"
                      >
                        <span
                          aria-hidden
                          className="mt-[0.55em] h-1 w-1 flex-none rounded-full bg-brand/60"
                        />
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                  {extraPanels[g.id] ? (
                    <div className="mt-4 border-t border-line pt-3">
                      {extraPanels[g.id]}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
