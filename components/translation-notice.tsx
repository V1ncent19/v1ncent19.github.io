import Link from "next/link";
import { Languages } from "lucide-react";

/**
 * "Machine-translation draft" notice (2026-09-07) — mounted on the Chinese
 * pages whose copy is still a temporary auto-translation (currently the zh
 * home and the zh CV, both from the 2026-09-06 draft batch). Non-dismissible
 * by design: it is a content disclaimer for readers, not a UI nicety.
 *
 * Removal is manual and per page — once the user hand-writes a page's
 * translation, delete that page's <TranslationNotice> mount (the banner
 * component itself stays for the remaining drafts).
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
