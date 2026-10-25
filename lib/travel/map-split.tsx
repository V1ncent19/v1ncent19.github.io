"use client";

/** Shared mobile split. The shell supplies trip-specific storage and type defaults.
 * Writes only --log-map-height on the map column and shared frame. Scroll offsets
 * and MapLibre canvas measurements must update together after a committed drag.
 * Pointer moves remain imperative; React state is committed only at gesture end.
 */

import { LOG_HEIGHT_VAR, LOG_STACKED_QUERY, useLogLayout } from "./log/layout";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_TRAVEL_PX = 50;

const MAX_TRAVEL_VH = 85;

function GripIcon() {
  return (
    <svg
      className="tl-split-grip"
      viewBox="0 0 10 16"
      width="10"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 5.5 5 2.5l3 3" />
      <path d="M2 10.5 5 13.5l3-3" />
    </svg>
  );
}

export function SplitGrip({ dragging }: { dragging: boolean }) {
  return (
    <span
      className={"tl-split-handle" + (dragging ? " is-dragging" : "")}
      aria-hidden="true"
    >
      <GripIcon />
    </span>
  );
}

const DRAG_THRESHOLD = 6;

export const MAP_SPLIT_EVENT = "map-split-change";

function rootScrollPadding(): number {
  if (typeof window === "undefined") return 0;
  const v = parseFloat(
    getComputedStyle(document.documentElement).scrollPaddingTop,
  );
  return Number.isFinite(v) ? v : 0;
}

function frameFor(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>("[data-travel-log]");
}

function landingFor(bandTop: number): number {
  if (!(bandTop > 0)) return 0;
  const pad = rootScrollPadding();
  return Math.max(0, bandTop - Math.min(pad, bandTop * 0.35));
}

function vhToPx(vh: number): number {
  if (typeof window === "undefined") return 0;
  return (window.innerHeight * vh) / 100;
}

function isStackedViewport(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

function clamp(px: number): number {
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  if (!vh) return px;
  return Math.max(MIN_TRAVEL_PX, Math.min(vh * (MAX_TRAVEL_VH / 100), px));
}

function valueFor(px: number, defaultPx: number, query: string): string | null {
  if (!isStackedViewport(query)) return null;
  if (Math.abs(px - defaultPx) < 1) return null;
  return `${Math.round(px)}px`;
}

export type MapSplit = {

  mountColumn: (el: HTMLDivElement | null) => void;

  renderHandle: (props: {
    className: string;
    children: React.ReactNode;
  }) => React.ReactElement;

  height: number;

  isDragging: boolean;

  reset: () => void;
};

export function useMapSplit(): MapSplit {
  const { storageKey, defaultVh, legacyStorageKey } = useLogLayout();
  const cssVar = LOG_HEIGHT_VAR;

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mountColumn = useCallback((el: HTMLDivElement | null) => {
    mapElRef.current = el?.closest<HTMLDivElement>("[data-log-map]") ?? el;
  }, []);

  const initialHeight = () => {
    if (typeof window === "undefined") return 0;
    const d = vhToPx(defaultVh);
    try {
      const s = Number(window.localStorage.getItem(storageKey) ?? (legacyStorageKey ? window.localStorage.getItem(legacyStorageKey) : null) ?? 0);
      if (Number.isFinite(s) && s > 0) return clamp(s);
    } catch {

    }
    return d;
  };
  const [height, setHeight] = useState(initialHeight);
  const [dragging, setDragging] = useState(false);

  const heightRef = useRef(initialHeight());

  const startHRef = useRef(0);
  const startYRef = useRef(0);

  const movedRef = useRef(0);
  const pointerRef = useRef<number | null>(null);

  const activeRef = useRef(false);

  const apply = useCallback(
    (px: number, defaultPx: number) => {
      const el = mapElRef.current;
      const query = LOG_STACKED_QUERY;
      const v = valueFor(px, defaultPx, query);
      if (!el) return;
      // The reading band's top edge and the landing offset it implies, written
      // in the same breath as the height.
      //
      // WHERE THEY GO MATTERS. Both are consumed by the story column, which is
      // a SIBLING of this element, and a custom property inherits down the tree
      // but never across. Written here alone they reach nothing on `.pj-stop`,
      // which is exactly the failure the previous `calc()` had. So they are
      // published on the page frame too (see `frameFor`), which every section
      // does inherit from. The column keeps its own copy: the ritual's other
      // readers (`ChapterNavigation`, `PilgrimageStory.readPanel`) sit inside the
      // story column and only ever look at the frame; the column's copy is the
      // one an inspector sees first when something looks wrong.
      //
      // 2026-10-24 — the HEIGHT joins them. `--pj-map-h` / `--tl-map-h-mobile`
      // were only ever written on the column, so every rule in the story column
      // that derives from them was dead:
      //   • the trip log's `.day-capsule { top: calc(var(--tl-map-h) + 8px) }`
      //     (TravelLog's 900px block) — a SIBLING read of a property declared on
      //     `.map-col`, so empty substitution, invalid at computed-value time,
      //     and the capsule stayed at the default 40vh + 8px = 345.6px no matter
      //     where the strip was dragged (measured: map bottom 338px, capsule
      //     345.6px);
      //   • the pilgrimage page's `--tl-top`-based sticky offsets, same story.
      // So the resolved px goes on the frame as well, under the SAME name — the
      // column's own declaration keeps winning there (it is the element that
      // has a height), and the frame's copy is the one the sibling column
      // inherits.
      const vh = window.innerHeight;
      const bandTop = px + 0.35 * (vh - px);
      const landing = landingFor(bandTop);
      const frame = frameFor(el);
      // Desktop publishes NOTHING. The column there is a full-height sidebar
      // beside the story, not an overlay, so "the band starts under the map"
      // is meaningless — and a stale value would be read by the rail's tick
      // scorer, which only falls back to 35% of the viewport when the property
      // is ABSENT. A tablet rotating past 1024px keeps the last phone number
      // until this clears it, which is why the clear is unconditional.
      const stacked = isStackedViewport(query);
      for (const host of frame ? [el, frame] : [el]) {
        if (stacked) {
          host.style.setProperty("--log-band-top", `${Math.round(bandTop)}px`);
        } else {
          host.style.removeProperty("--log-band-top");
        }
        if (stacked && landing > 0) {
          host.style.setProperty("--log-landing", `${Math.round(landing)}px`);
        } else {
          host.style.removeProperty("--log-landing");
        }
      }

      if (v) {
        el.style.setProperty(cssVar, v);
        el.dataset.splitActive = "";
      } else {
        // Setting the property to "" removes it, which is what lets the
        // sheet's own `height: 58vh` / `--tl-map-h: 40vh` apply again.
        el.style.removeProperty(cssVar);
        delete el.dataset.splitActive;
      }
      // Mirror the RESOLVED height onto the frame, whether it came from the
      // drag or from the sheet's default (`v` is null at the default height —
      // `valueFor` leaves the sheet alone on purpose). Without this the story
      // column keeps a stale number after the reader drags back to the default,
      // which is the same class of bug as the one above.
      if (frame) {
        if (stacked) frame.style.setProperty(cssVar, `${Math.round(px)}px`);
        else frame.style.removeProperty(cssVar);
      }
    },
    [cssVar],
  );

  const handleElRef = useRef<HTMLDivElement | null>(null);
  const handleObserverRef = useRef<ResizeObserver | null>(null);

  const syncHandleHeight = useCallback(() => {
    const strip = handleElRef.current;
    const col = mapElRef.current;
    if (!strip || !col) return;
    const h = Math.round(strip.getBoundingClientRect().height);
    if (h > 0) col.style.setProperty("--tl-attrib-h", `${h}px`);
  }, []);

  const publishHandleHeight = useCallback(
    (el: HTMLDivElement | null) => {
      handleObserverRef.current?.disconnect();
      handleElRef.current = el;
      if (!el) return;
      // The element is in the DOM by the time React runs a callback ref, but
      // its layout may not be — one frame later is enough and costs nothing.
      requestAnimationFrame(syncHandleHeight);
      // The strip's height changes with the viewport (it wraps at 640px) and
      // when the CJK webfont arrives, so keep following it. Detached by the
      // callback ref disconnects the previous observer before attaching.
      if (typeof ResizeObserver !== "undefined") {
        handleObserverRef.current = new ResizeObserver(syncHandleHeight);
        handleObserverRef.current.observe(el);
      }
    },
    [syncHandleHeight],
  );

  useEffect(() => {
    const defaultPx = vhToPx(defaultVh);
    // Publish the band top for the DEFAULT height before anything else runs.
    // Writing the real number here means the reader's first tick-tap lands
    // correctly even if the split is never touched — the sheet's own fallback
    // is arithmetic on 58vh/40vh literals and only covers the prerendered
    // frame.
    apply(defaultPx, defaultPx);
    apply(heightRef.current || defaultPx, defaultPx);

    // A viewport change can cross the breakpoint in either direction, or move
    // the default; recompute rather than trust the last written px. This one
    // DOES setState — it is an event listener, not an effect body, so the
    // render it schedules is the intended one.
    const onResize = () => {
      const d = vhToPx(defaultVh);
      let s = 0;
      try {
        s = Number(window.localStorage.getItem(storageKey) ?? (legacyStorageKey ? window.localStorage.getItem(legacyStorageKey) : null) ?? 0);
      } catch {

      }
      const px = Number.isFinite(s) && s > 0 ? clamp(s) : d;
      heightRef.current = px;
      setHeight(px);
      apply(px, d);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply, defaultVh, storageKey, legacyStorageKey]);

  useEffect(() => {
    const el = mapElRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let timer = 0;
    let last = el.getBoundingClientRect().height;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (Math.abs(h - last) < 1) return;
      last = h;
      // `heightRef` stays the drag's business; this only publishes.
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        window.dispatchEvent(new Event(MAP_SPLIT_EVENT));
      }, 150);
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
    // `mountColumn` is stable; the effect re-runs once the column has mounted.
  }, []);

  useEffect(() => () => handleObserverRef.current?.disconnect(), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Desktop has no split to drag, and a second finger mid-gesture must not
      // hijack the first one's anchor.
      if (!isStackedViewport(LOG_STACKED_QUERY) || activeRef.current) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const el = mapElRef.current;
      if (!el) return;

      // Read the LIVE rect, not the cached state: the address bar may have
      // collapsed since the last commit, and starting from a stale number
      // makes the strip jump on the first pixel of movement.
      startHRef.current = el.getBoundingClientRect().height;
      heightRef.current = startHRef.current;
      startYRef.current = e.clientY;
      movedRef.current = 0;
      pointerRef.current = e.pointerId;
      activeRef.current = true;
      setDragging(true);
      // Capture on the strip: the pointer will leave it (that is the whole
      // gesture), and without capture the moves stop arriving.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      // Stop the page from scrolling under the finger — this is why the strip
      // needs `touch-action: none` while stacked.
      e.preventDefault();
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!activeRef.current || e.pointerId !== pointerRef.current) return;
      const dy = e.clientY - startYRef.current;
      movedRef.current = Math.max(movedRef.current, Math.abs(dy));
      const px = clamp(startHRef.current + dy);
      heightRef.current = px;
      // Direct DOM write per move: no React render in the drag path.
      apply(px, vhToPx(defaultVh));
      // The frame's copy of the height feeds `.day-capsule`'s sticky `top` on
      // the trip log. Sticky offsets are recomputed on the next layout, which a
      // style change on an ancestor already forces — but only if the property
      // landed on that ancestor, which is why `apply` writes it there rather
      // than on the column. Nothing extra is needed here; this note exists so
      // the next reader does not add a redundant per-move readback.
      e.preventDefault();
    },
    [apply, defaultVh],
  );

  const finish = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!activeRef.current || e.pointerId !== pointerRef.current) return;
      activeRef.current = false;
      pointerRef.current = null;
      setDragging(false);
      const px = heightRef.current;
      setHeight(px);

      // A tap on the strip must keep reaching the credit LINK inside it. The
      // strip captures the pointer on pointerdown, which stops the browser
      // from synthesising a click on the anchor — so replay one here, but
      // only when nothing moved.
      if (movedRef.current < DRAG_THRESHOLD) {
        const target = e.target as HTMLElement | null;
        target?.closest("a")?.click();
      }

      try {
        window.localStorage.setItem(storageKey, String(Math.round(px)));
      } catch {

      }
      // The map got shorter/taller, but nothing RESIZED — no window resize, no
      // body height change — so every consumer that measures the map (the
      // progress rails' tick positions, the per-frame band readers) has to be
      // told. One event, dispatched once per gesture, not once per move.
      window.dispatchEvent(new Event(MAP_SPLIT_EVENT));
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    const d = vhToPx(defaultVh);
    heightRef.current = d;
    setHeight(d);
    apply(d, d);
    try {
      window.localStorage.removeItem(storageKey);
      if (legacyStorageKey) window.localStorage.removeItem(legacyStorageKey);
    } catch {

    }
    window.dispatchEvent(new Event(MAP_SPLIT_EVENT));
  }, [apply, defaultVh, storageKey, legacyStorageKey]);

  const renderHandle = useCallback(
    ({ className, children }: { className: string; children: React.ReactNode }) => (
      <div
        ref={publishHandleHeight}
        className={className + (dragging ? " is-dragging" : "")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {children}
        <SplitGrip dragging={dragging} />
      </div>
    ),
    [dragging, onPointerDown, onPointerMove, finish, publishHandleHeight],
  );

  return {
    mountColumn,
    renderHandle,
    height,
    isDragging: dragging,
    reset,
  };
}
