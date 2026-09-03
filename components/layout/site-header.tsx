"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export function SiteHeader() {
  const pathname = usePathname();
  const lang = uiLang(pathname);

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
              href="/"
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
                return (
                  <li key={item.id} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={chipClasses(active)}
                    >
                      {item.label[lang]}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-line sm:block" />

            <div className="ui-text flex shrink-0 items-center gap-2">
              <LangSwitch />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
