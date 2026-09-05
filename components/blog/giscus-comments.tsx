"use client";

import Giscus from "@giscus/react";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

/**
 * Per-post comment thread (giscus), wired to the SAME discussion instance the
 * old homepage used (index.html) so continuity is preserved:
 * repo v1ncent19/v1ncent19.github.io, Discussions category "Announcements".
 *
 * Two mount modes (2026-09-05):
 *  - default (no `term`): mapping="pathname" — one thread per blog post;
 *  - `term` given: mapping="specific" — every page passing the SAME term
 *    shares ONE thread (guestbook messages tab, bug stream). This is how
 *    the guestboard keeps a single comment timeline across /guestbook and
 *    /guestbook/zh.
 *
 * This is a deploy-time feature by nature — giscus refuses localhost / static
 * preview origins, so the embed only becomes live once the site is served from
 * the real deployed origin. Until then it renders nothing.
 */
const GISCUS = {
  repo: "v1ncent19/v1ncent19.github.io",
  repoId: "R_kgDOH_YfXA",
  category: "Announcements",
  categoryId: "DIC_kwDOH_YfXM4CXcBx",
} as const;

/**
 * Map our three theme modes onto giscus's built-in themes. giscus's
 * `preferred_color_scheme` follows the OS colour scheme — exactly right for the
 * site's "system" mode, and no custom palette CSS is needed for v1.
 */
function currentGiscusTheme(): string {
  const mode = document.documentElement.getAttribute("data-theme");
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return "preferred_color_scheme";
}

export function GiscusComments({
  term,
  lang: uiLang = "zh",
  emitMetadata = false,
  className,
}: {
  /** Shared-thread mode: all pages passing the same term see one thread. */
  term?: string;
  /** giscus UI language — blog posts keep the historical zh-CN default. */
  lang?: Lang;
  /** Broadcast discussion metadata (comment counts) via postMessage — used by
      the home note window to detect "a comment was just sent". */
  emitMetadata?: boolean;
  className?: string;
} = {}) {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    // Read the mode on the first frame (no synchronous state writes in the
    // effect body — same rAF idiom as back-to-top.tsx), then keep the embed in
    // sync with the theme toggle via a MutationObserver on <html data-theme>.
    const raf = requestAnimationFrame(() => setTheme(currentGiscusTheme()));
    const observer = new MutationObserver(() => setTheme(currentGiscusTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  // The correct theme is only known after the first frame, so render nothing
  // during SSR/hydration; the thread appears below the article once mounted.
  if (theme === null) return null;

  return (
    <div className={className}>
      <Giscus
        // Re-mount on theme change (and term switch) so the iframe reloads
        // with the new theme / the other discussion thread.
        key={`${theme}-${term ?? "pathname"}`}
        repo={GISCUS.repo}
        repoId={GISCUS.repoId}
        category={GISCUS.category}
        categoryId={GISCUS.categoryId}
        mapping={term ? "specific" : "pathname"}
        term={term}
        strict="0"
        reactionsEnabled="1"
        emitMetadata={emitMetadata ? "1" : "0"}
        inputPosition="top"
        theme={theme}
        lang={uiLang === "zh" ? "zh-CN" : "en"}
        loading="lazy"
      />
    </div>
  );
}
