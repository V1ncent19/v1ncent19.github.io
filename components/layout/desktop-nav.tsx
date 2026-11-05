"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";

type Entry = { id: string; href: string; label: string; active: boolean; badge?: ReactNode };

export function DesktopNav({ entries, routeKey, onCurrentPage }: {
  entries: Entry[];
  routeKey: string;
  onCurrentPage: () => void;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const indicator = useRef<HTMLLIElement>(null);
  const hovered = useRef<HTMLAnchorElement | null>(null);

  const place = useCallback((target: HTMLAnchorElement | null, instant = false) => {
    const root = rail.current, plate = indicator.current;
    if (!root || !plate) return;
    if (!target || !root.getBoundingClientRect().width) {
      plate.style.opacity = "0";
      return;
    }
    const r = root.getBoundingClientRect(), t = target.getBoundingClientRect();
    plate.style.transition = instant ? "none" : "";
    plate.style.transform = `translate3d(${t.left - r.left + root.scrollLeft}px, ${t.top - r.top}px, 0)`;
    plate.style.width = `${t.width}px`;
    plate.style.height = `${t.height}px`;
    plate.style.opacity = "1";
    root.setAttribute("data-indicator-ready", "");
  }, []);

  const returnToSelection = useCallback((instant = false) => {
    const root = rail.current;
    if (!root) return;
    const focused = document.activeElement;
    const keyboardTarget = focused instanceof HTMLAnchorElement && root.contains(focused) && focused.matches(":focus-visible") ? focused : null;
    place(hovered.current ?? keyboardTarget ?? root.querySelector<HTMLAnchorElement>('a[aria-current="page"]'), instant);
  }, [place]);

  useLayoutEffect(() => {
    hovered.current = null;
    returnToSelection(true);
    const root = rail.current;
    if (!root) return;
    let cancelled = false;
    const measure = () => returnToSelection(true);
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    root.querySelectorAll("a").forEach(link => resize.observe(link));
    document.fonts.ready.then(() => { if (!cancelled) measure(); });
    root.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelled = true;
      resize.disconnect();
      root.removeEventListener("scroll", measure);
    };
  }, [routeKey, returnToSelection]);

  return <ul ref={rail}
    className="primary-nav-rail no-scrollbar relative isolate hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto md:flex"
    onPointerLeave={() => { hovered.current = null; returnToSelection(); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) returnToSelection(); }}>
    <li ref={indicator} className="primary-nav-indicator" aria-hidden="true" />
    {entries.map(entry => <li key={entry.id} className="shrink-0">
      <Link href={entry.href} data-nav-id={entry.id} aria-current={entry.active ? "page" : undefined}
        className={[
          "primary-nav-link ui-text relative inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-medium leading-none transition-colors hover:no-underline",
          entry.active ? "bg-surface-sink font-semibold text-brand" : "text-muted hover:bg-surface-tint hover:text-ink",
        ].join(" ")}
        onPointerEnter={event => { if (event.pointerType !== "touch") { hovered.current = event.currentTarget; place(event.currentTarget); } }}
        onFocus={event => { hovered.current = null; place(event.currentTarget); }}
        onClick={event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          if (entry.href.replace(/\/$/, "") === routeKey.replace(/\/$/, "")) { event.preventDefault(); onCurrentPage(); }
        }}>
        <span className="primary-nav-label">{entry.label}</span>{entry.badge}
      </Link>
    </li>)}
  </ul>;
}
