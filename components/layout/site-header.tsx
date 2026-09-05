"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, ListOrdered, X } from "lucide-react";
import { navItems, type NavItem } from "@/content/navigation";
import { site } from "@/lib/site";
import { copy } from "@/lib/i18n";
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
 * from the Stitch mock).
 *
 * MOBILE (below md, redesigned 2026-09-05 per user brief): the capsule drops
 * the scrolling chip row and shows only the current section's name (plus
 * back-to-top / lang / theme, the first always visible on mobile); chapter
 * switching moved into a floating directory button pinned bottom-right whose
 * menu expands in place (see the FAB block at the bottom).
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

/**
 * Below-768px detector (2026-09-05 mobile nav). SSR/hydration-safe via
 * useSyncExternalStore: the server snapshot is `false` (desktop), the client
 * re-evaluates after hydration — no DOM mismatch, same pattern GalleryTile
 * uses for its "days ago" flip. Used ONLY for behaviour (the always-visible
 * mobile back-to-top); all mobile/desktop visibility itself is CSS-driven.
 */
function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia("(max-width: 767.98px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 767.98px)").matches,
    () => false,
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const lang = uiLang(pathname);
  const s = copy[lang];
  /** A11y label for the capsule back-to-top control (appears once pinned). */
  const topLabel = lang === "zh" ? "回到顶部" : "Back to top";

  // Mobile nav mode (2026-09-05): below md the capsule shows only the current
  // section's name and the chapter switching moves into a bottom-right FAB
  // whose menu expands in place (user-reviewed animation choice).
  const isMobile = useIsMobile();
  const currentItem = navItems.find((item) => isActive(pathname, item));
  const [menuOpen, setMenuOpen] = useState(false);

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

  // FAB menu lifecycle: close after any navigation (menu item clicks close
  // themselves; this render-time adjustment covers back/forward navigation),
  // close on Escape, and lock the page behind the open menu (the backdrop
  // covers the viewport; without the lock a touch-drag on it would scroll the
  // page underneath).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      {/* ---- 1 · Identity — scrolls away with the page ---- */}
      <header className="relative">
        <div className="shell flex flex-col pt-5 pb-6 sm:pt-8 sm:pb-7">
          {/* text-balance keeps the two lines even instead of a widow word;
              the quoted handle is nowrap so a narrow viewport never splits
              `v1ncent19` away from its quotation marks mid-name. */}
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl xl:text-6xl">
            <Link
              href={lang === "zh" ? "/zh" : "/"}
              aria-label="Home"
              className="inline-block text-ink no-underline hover:no-underline"
            >
              <span className="text-ink">{site.nameParts.before}</span>
              <span className="whitespace-nowrap text-brand">
                &quot;
                <span className="text-brand underline decoration-brand/45 decoration-1 underline-offset-[5px] transition-[text-decoration-color,text-shadow,text-underline-offset] duration-200 hover:decoration-brand-strong hover:underline-offset-[7px] hover:[text-shadow:0_2px_14px_var(--brand-soft)]">
                  {site.nameParts.handle}
                </span>
                &quot;
              </span>
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
            {/* Desktop: the full chip row (horizontally scrollable). Mobile:
                only the current section's name — chapter switching lives in
                the bottom-right FAB menu (2026-09-05 user brief). */}
            <ul className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto md:flex">
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
            <span className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
              />
              <span className="truncate text-[15px] font-semibold text-ink">
                {currentItem?.label[lang] ?? (lang === "zh" ? "首页" : "Home")}
              </span>
            </span>

            <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-line sm:block" />

            <div className="flex shrink-0 items-center">
              {/* Back to top (Task D #5): slides in to the LEFT of the
                  lang/theme toggles once the capsule pins (the identity block
                  has scrolled off). On mobile it is ALWAYS visible (2026-09-05
                  user decision) — the top three controls stay constant, so the
                  pill never reflows on scroll. The slot collapses to zero
                  width at desktop rest and grows smoothly into place. The
                  button matches the ThemeToggle geometry (h-10 w-10 square). */}
              <span
                className={[
                  "overflow-hidden transition-[width] duration-300 ease-out",
                  stuck ? "w-10" : "w-10 md:w-0",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={scrollTopSmooth}
                  aria-label={topLabel}
                  title={topLabel}
                  aria-hidden={!stuck && !isMobile}
                  tabIndex={!stuck && !isMobile ? -1 : 0}
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
                  stuck ? "w-2" : "w-2 md:w-0",
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

      {/* ---- 3 · Mobile-only FAB navigation (md:hidden, 2026-09-05) ----
          A floating directory button pinned bottom-right; tapping it expands
          the chapter menu in place. The whole thing lives BELOW the gallery
          lightbox (z-50): while a photo is open the FAB sits under the dim and
          is inert, exactly as a page-level control should be.
          Coherence of the animation (user-reviewed "origin expansion"): every
          moving part shares one duration curve family — the panel scales from
          the FAB corner (origin-bottom-right, scale 0.9→1 + 8px rise), the
          rows stagger upward 35ms apart, the icon crossfades menu→✕ with a
          quarter turn, and the backdrop fades. Reduced motion is flattened by
          the global rule. */}
      <div className="md:hidden">
        {/* Dimmed backdrop — closes on tap */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setMenuOpen(false)}
          className={[
            "fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300",
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        />

        {/* Expanding menu panel, anchored to the FAB corner */}
        <div
          id="mobile-nav-menu"
          className={[
            "fixed right-5 bottom-[4.75rem] z-40 w-56 origin-bottom-right rounded-2xl border border-line bg-surface p-1.5 shadow-2xl transition-[transform,opacity] duration-300 ease-out",
            menuOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-2 scale-90 opacity-0",
          ].join(" ")}
        >
          <nav aria-label={s.nav.menuLabel}>
            <ul className="flex flex-col">
              {navItems.map((item, i) => {
                const active = isActive(pathname, item);
                const target = lang === "zh" ? item.hrefZh : item.href;
                return (
                  <li
                    key={item.id}
                    className={[
                      "transition-[transform,opacity] duration-300 ease-out",
                      menuOpen
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0",
                    ].join(" ")}
                    style={{ transitionDelay: menuOpen ? `${i * 35}ms` : "0ms" }}
                  >
                    <Link
                      href={target}
                      aria-current={active ? "page" : undefined}
                      onClick={(e) => {
                        if (normalizePath(target) === normalizePath(pathname)) {
                          e.preventDefault();
                          scrollTopSmooth();
                        }
                        setMenuOpen(false);
                      }}
                      className={[
                        "ui-text flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-[15px] font-medium leading-none transition-colors hover:no-underline",
                        active
                          ? "bg-surface-sink font-semibold text-brand"
                          : "text-ink hover:bg-surface-tint",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden
                        className={[
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          active ? "bg-brand" : "bg-line-strong",
                        ].join(" ")}
                      />
                      {item.label[lang]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* The FAB itself — icon crossfades menu ↔ close with a quarter turn */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
          aria-label={menuOpen ? s.nav.menuClose : s.nav.menuOpen}
          title={menuOpen ? s.nav.menuClose : s.nav.menuOpen}
          className="fixed right-5 bottom-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg transition-colors hover:bg-brand-strong"
        >
          <span className="relative block h-5 w-5">
            <ListOrdered
              aria-hidden
              strokeWidth={2}
              className={[
                "absolute inset-0 h-5 w-5 transition-all duration-300",
                menuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100",
              ].join(" ")}
            />
            <X
              aria-hidden
              strokeWidth={2}
              className={[
                "absolute inset-0 h-5 w-5 transition-all duration-300",
                menuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0",
              ].join(" ")}
            />
          </span>
        </button>
      </div>
    </>
  );
}
