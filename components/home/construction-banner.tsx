"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Construction, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";

/**
 * Home "under construction" banner (2026-09-07).
 *
 * A slim dismissible strip above the hero: announces that the site is still
 * being rebuilt and points to the guestbook for bug reports. Temporary by
 * design — everything (copy included) lives in this one file so it can be
 * deleted in a single commit once the site settles.
 *
 * Dismissal persists in localStorage (`wb-construction-off`). To avoid a
 * one-frame flash for returning visitors, an inline script inside the banner
 * root hides the element synchronously during HTML parsing (before any
 * paint); after hydration the React state catches up and unmounts it for
 * real. localStorage access is guarded — private-mode Safari throws.
 */

const STORE_KEY = "wb-construction-off";

/** Marker id + hide script — the script must stay adjacent to the element. */
const NO_FLASH_SCRIPT = `(function(){try{if(localStorage.getItem('${STORE_KEY}')){var b=document.getElementById('wb-banner');if(b){b.style.display='none';b.dataset.preDismissed='1';}}}catch(e){}})();`;

const COPY = {
  en: {
    note: "This site is still under construction — pages and styling may change at any time.",
    cta: "Report a bug",
    close: "Dismiss banner",
  },
  zh: {
    note: "本站点仍在建设中，页面与样式可能随时调整。",
    cta: "反馈 bug",
    close: "关闭横幅",
  },
} as const;

export function ConstructionBanner({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  /* `null` = not yet hydrated → render (SSR shows it; the inline script
     hides it pre-paint for returning visitors). true = dismissed. */
  const [off, setOff] = useState<boolean | null>(null);

  useEffect(() => {
    const banner = document.getElementById("wb-banner");
    const pre =
      banner?.dataset.preDismissed === "1" ||
      (() => {
        try {
          return localStorage.getItem(STORE_KEY) === "1";
        } catch {
          return false;
        }
      })();
    if (!pre) return;
    /* rAF: react-hooks/set-state-in-effect forbids a synchronous setState in
       the effect body. No user-visible cost — the inline script above already
       hid the banner pre-paint, this only catches the React tree up. */
    const raf = requestAnimationFrame(() => setOff(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const dismiss = () => {
    setOff(true);
    try {
      localStorage.setItem(STORE_KEY, "1");
    } catch {
      /* private mode — session-only dismissal is fine */
    }
  };

  if (off) return null;

  return (
    <section className="shell pt-2 sm:pt-3">
      <div
        id="wb-banner"
        role="status"
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-line bg-surface-tint px-3.5 py-2 text-[13px] leading-snug text-ink"
      >
        <Construction
          aria-hidden
          size={15}
          strokeWidth={2}
          className="shrink-0 text-brand"
        />
        <p className="min-w-0 flex-1">
          {t.note}{" "}
          <Link
            href={lang === "zh" ? "/guestbook/zh" : "/guestbook"}
            className="ml-0.5 whitespace-nowrap font-medium text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
          >
            {t.cta} →
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.close}
          className="-mr-1 shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <X aria-hidden size={14} strokeWidth={2.25} />
        </button>
        {/* Pre-paint hide for returning visitors — runs while the HTML is
            still parsing, before first paint (same trick as theme-script). */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </div>
    </section>
  );
}
