"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { navItems, type NavItem } from "@/content/navigation";
import { site } from "@/lib/site";
import { LangSwitch } from "@/components/layout/lang-switch";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Two-part masthead, both parts shared verbatim by every page.
 *
 * 1. Identity block (name + tagline) — sits at the very top of the page in
 *    normal flow and scrolls away naturally. Nothing here is pinned, so the
 *    big serif name never costs vertical space once the reader scrolls.
 * 2. Capsule nav — a separate `position: sticky` sibling (NOT nested inside
 *    the identity block: its containing block is the body, so it can keep
 *    travelling with the page). While the identity is on screen the capsule
 *    simply rides below it; once the name scrolls off, the capsule pins to
 *    the viewport top with a comfortable margin and floats there as a pill.
 *    While actually pinned it turns white translucent frosted glass (backdrop
 *    blur + translucent surface, toggled by a rect.top check) per the user
 *    direction of 2026-09-04.
 *
 * The /zh language switch and the 3-way theme toggle (light/dark/system) live
 * inside the capsule
 * (user-directed 2026-09-04), so they are reachable on every page at any
 * scroll position. Home appears first in the nav (user-confirmed deviation
 * from the Stitch mock). Mobile keeps a horizontally scrolling chip row.
 */
function isActive(pathname: string, item: NavItem): boolean {
  if (item.id === "home") return pathname === "/" || pathname === "/zh";
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    pathname === item.hrefZh
  );
}

/** ui language on /…/zh routes is Chinese, else English. */
function uiLang(pathname: string): "en" | "zh" {
  return pathname.split("/").includes("zh") ? "zh" : "en";
}

function chipClasses(active: boolean) {
  return [
    "ui-text inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-4 text-[15px] font-medium leading-none transition-colors hover:no-underline",
    active
      ? "bg-surface-sink font-semibold text-brand"
      : "text-muted hover:bg-surface-tint hover:text-ink",
  ].join(" ");
}

/** Normalise a route for equality: "/blog/" and "/blog" are the same page. */
function normalizePath(p: string): string {
  return p === "/" || p === "/zh" ? p : p.replace(/\/+$/, "") || "/";
}

/**
 * Task D #1 — clicking the nav chip for the page you are ALREADY on (the active
 * route, exactly) scrolls back to the top instead of doing nothing. Easing is
 * opted-in per call (smooth, unless the OS asks for reduced motion); the global
 * html rule keeps every *automatic* Next.js scroll instant.
 */
function scrollTopSmooth() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function SiteHeader() {
  const pathname = usePathname();
  const lang = uiLang(pathname);
  /** A11y label for the capsule back-to-top control (appears once pinned). */
  const topLabel = lang === "zh" ? "回到顶部" : "Back to top";

  // Once the capsule has actually pinned to the top (the identity block has
  // scrolled away) it turns into white frosted glass. Detection: a sticky
  // element's rect.top equals its top-3/top-4 offset (~12–16px) exactly while
  // it is stuck, and is larger while it still rides below the identity.
  const navRef = useRef<HTMLElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = navRef.current;
      if (el) setStuck(el.getBoundingClientRect().top <= 20);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return (
    <>
      {/* ---- 1 · Identity — scrolls away with the page ---- */}
      <header className="relative">
        <div className="shell flex flex-col pt-5 pb-6 sm:pt-8 sm:pb-7">
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
            <Link
              href={lang === "zh" ? "/zh" : "/"}
              aria-label="Home"
              className="inline-block text-ink no-underline hover:no-underline"
            >
              <span className="text-ink">{site.nameParts.before}</span>
              <span className="text-brand">&quot;</span>
              <span className="text-brand underline decoration-brand/45 decoration-1 underline-offset-[5px] transition-[text-decoration-color,text-shadow,text-underline-offset] duration-200 hover:decoration-brand-strong hover:underline-offset-[7px] hover:[text-shadow:0_2px_14px_var(--brand-soft)]">
                {site.nameParts.handle}
              </span>
              <span className="text-brand">&quot;</span>
              <span className="text-ink">{site.nameParts.after}</span>
            </Link>
          </h1>
          <p className="mt-2 font-serif italic text-lg text-muted sm:text-xl">
            {site.tagline}
          </p>
        </div>
      </header>

      {/* ---- 2 · Capsule nav — pins to the top once the identity scrolls off ---- */}
      <nav
        ref={navRef}
        aria-label="Primary"
        className="ui-text sticky top-3 z-40 mb-6 w-full sm:top-4 sm:mb-7"
      >
        <div className="shell">
          <div
            className={[
              "flex items-center justify-between gap-1.5 rounded-full py-1.5 pr-2 pl-2 transition-[background-color,box-shadow] duration-300",
              stuck
                ? "border border-line bg-white/80 shadow-lg backdrop-blur-xl dark:bg-[#101b2b]/80"
                : "border border-line bg-canvas/90 shadow-md backdrop-blur-md",
            ].join(" ")}
          >
            <ul className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
              {navItems.map((item) => {
                const active = isActive(pathname, item);
                // Keep the reader in the current UI language: nav chips point
                // at the matching /…/zh target on Chinese pages and only the
                // LangSwitch button ever crosses languages.
                const target = lang === "zh" ? item.hrefZh : item.href;
                return (
                  <li key={item.id} className="shrink-0">
                    <Link
                      href={target}
                      aria-current={active ? "page" : undefined}
                      onClick={(e) => {
                        // Clicking the chip for the very page we are on does not
                        // navigate — make it scroll back to the top instead.
                        if (normalizePath(target) === normalizePath(pathname)) {
                          e.preventDefault();
                          scrollTopSmooth();
                        }
                      }}
                      className={chipClasses(active)}
                    >
                      {item.label[lang]}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-line sm:block" />

            <div className="flex shrink-0 items-center">
              {/* Back to top (Task D #5): slides in to the LEFT of the
                  lang/theme toggles once the capsule pins (the identity block
                  has scrolled off). Its slot collapses to zero width at rest so
                  the pill never reflows, and grows smoothly into place. The
                  button matches the ThemeToggle geometry (h-10 w-10 square). */}
              <span
                className={[
                  "overflow-hidden transition-[width] duration-300 ease-out",
                  stuck ? "w-10" : "w-0",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={scrollTopSmooth}
                  aria-label={topLabel}
                  title={topLabel}
                  aria-hidden={!stuck}
                  tabIndex={stuck ? 0 : -1}
                  className="ui-text inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-brand shadow-sm transition-colors hover:bg-surface-tint hover:text-brand-strong hover:no-underline"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden strokeWidth={2} />
                </button>
              </span>
              {/* animated gap — only while the top control is showing */}
              <span
                aria-hidden
                className={[
                  "shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
                  stuck ? "w-2" : "w-0",
                ].join(" ")}
              />
              <span className="flex items-center gap-2">
                <LangSwitch />
                <ThemeToggle />
              </span>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
