"use client";

/**
 * Guestbook view — the site's single comment area (2026-09-06).
 *
 * ONE giscus stream, described as "Messages & bug reports" (user decision:
 * no tabs). It uses mapping="specific" with the FIXED term "index", so every
 * language variant of this page (/guestbook and /guestbook/zh) reads and
 * writes the very same GitHub Discussion — and that term is the title of the
 * legacy Discussion #1 created by the old site's pathname mapping, which is
 * where all historical comments live. Renaming it strands them.
 */

import { GiscusComments } from "@/components/blog/giscus-comments";
import { copy, type Lang } from "@/lib/i18n";

/** MUST stay "index" — see the doc comment above. */
const TERM_MESSAGES = "index";

export function GuestbookView({ lang }: { lang: Lang }) {
  const s = copy[lang].guestbook;

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

        {/* ---- The stream. giscus handles the comment list + editor, themed
                to the site toggle via GiscusComments. ---------- */}
        <div className="mt-10">
          <GiscusComments term={TERM_MESSAGES} lang={lang} className="gb-stream" />
        </div>
      </div>
    </section>
  );
}
