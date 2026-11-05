import Link from "next/link";
import { Languages } from "lucide-react";

/**
 * "Machine-translation draft" notice (2026-09-07, rolled out to every Chinese
 * page 2026-10-17) — a non-dismissible content disclaimer for readers, shown
 * at the top of a zh page whose copy is still a temporary auto-translation.
 *
 * ── How to maintain this (for a future agent) ─────────────────────────────
 * Retire ONE page (its Chinese is now hand-written / reviewed):
 *   1. delete that page's `<TranslationNotice href="…" />` mount;
 *   2. drop the now-unused import.
 *   Nothing else references it — there is no registry, no config, no flag.
 *   Both edits are one-liners in a single file.
 *
 * Where it is currently mounted (`grep -rn "TranslationNotice" app components`):
 *   /zh            app/zh/page.tsx
 *   /cv/zh         components/cv/cv-folio.tsx   (renders only when lang==="zh")
 *   /blog/zh       app/blog/zh/page.tsx
 *   /project/zh    app/project/zh/page.tsx
 *   /travel/zh     app/travel/zh/page.tsx
 *   /guestbook/zh  app/guestbook/zh/page.tsx
 *
 * Two hard rules:
 *   - NEVER on /about/zh. That page's Chinese is the ORIGINAL text (owner-
 *     written), not a translation — user 2026-10-17.
 *   - NEVER on a zh page whose Chinese is the source language (e.g. a Chinese
 *     blog post): the notice claims the page is a draft *of an English page*.
 *
 * `href` is the page's English counterpart (or "/" for the home page). The
 * visual is plain Tailwind — no CSS class to keep in sync.
 * ──────────────────────────────────────────────────────────────────────────
 */

export function TranslationNotice({ href }: { href: string }) {
  return (
    <section className="shell pt-2 sm:pt-3">
      <div
        role="note"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-line bg-surface-tint px-3.5 py-2 text-[13px] leading-snug text-ink"
      >
        <Languages
          aria-hidden
          size={15}
          strokeWidth={2}
          className="shrink-0 text-tertiary"
        />
        <p className="min-w-0 flex-1">
          本页面当前为临时机器翻译草稿，行文或有生硬、失准之处，人工修订版将陆续替换。{" "}
          <Link
            href={href}
            className="ml-0.5 whitespace-nowrap font-medium text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
          >
            阅读英文原页 →
          </Link>
        </p>
      </div>
    </section>
  );
}
