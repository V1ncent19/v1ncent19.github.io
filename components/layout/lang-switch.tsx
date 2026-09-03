"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bilingualBases } from "@/content/navigation";

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

export function LangSwitch({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const alt = alternateFor(pathname);
  if (!alt) return null;

  return (
    <Link
      href={alt.href}
      title={alt.title}
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
