"use client";

/**
 * Guestbook view (2026-09-05) — the site's single comment area.
 *
 * Two giscus streams live here, switched by tabs (user-confirmed design):
 *  - "guestbook"    — the open message board;
 *  - "bug-reports"  — the bug-report stream.
 * Both use mapping="specific" with a FIXED term, so every language variant of
 * this page (/guestbook and /guestbook/zh) reads and writes the very same
 * GitHub Discussion. Reached from the homepage's "Direct access" card —
 * there is no nav item and no home-embedded editor.
 *
 * giscus renders nothing on localhost / static previews (deploy-gated), so in
 * dev the page shows hero + tabs with an empty area below — by design.
 */

import { useState } from "react";
import { Bug, MessageCircle } from "lucide-react";
import { GiscusComments } from "@/components/blog/giscus-comments";
import { copy, type Lang } from "@/lib/i18n";

/** Fixed giscus terms — changing either orphans the existing discussion. */
const TERM_MESSAGES = "guestbook";
const TERM_BUGS = "bug-reports";

export function GuestbookView({ lang }: { lang: Lang }) {
  const s = copy[lang].guestbook;
  // Tab is local state only — switching tabs swaps the embed in place (the
  // giscus theme sync lives inside GiscusComments, so no effects are needed
  // in this component).
  const [tab, setTab] = useState<"messages" | "bugs">("messages");

  const tabs = [
    {
      id: "messages" as const,
      label: s.tabNotes,
      lead: s.tabNotesLead,
      icon: MessageCircle,
      term: TERM_MESSAGES,
    },
    {
      id: "bugs" as const,
      label: s.tabBugs,
      lead: s.tabBugsLead,
      icon: Bug,
      term: TERM_BUGS,
    },
  ];
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        <header className="pt-2 sm:pt-4">
          <p className="ui-text mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            {s.eyebrow}
          </p>
          <h1 className="text-balance text-4xl tracking-tight sm:text-5xl">
            {s.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-muted">
            {s.lead}
          </p>
        </header>

        {/* ---- Stream tabs ---- */}
        <div
          role="tablist"
          aria-label={s.tabsLabel}
          className="mt-10 inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-sm"
        >
          {tabs.map((t) => {
            const on = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className={`ui-text inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  on
                    ? "bg-brand text-on-brand shadow-sm"
                    : "text-muted hover:bg-surface-tint hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>

        <p className="ui-text mt-3 text-sm text-muted">{active.lead}</p>

        {/* ---- The stream. giscus handles the comment list + editor, themed
                to the site toggle via GiscusComments. ---------- */}
        <div className="mt-8">
          <GiscusComments
            key={active.term}
            term={active.term}
            lang={lang}
            className="gb-stream"
          />
        </div>
      </div>
    </section>
  );
}
