"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Draggable map/story split on narrow viewports (2026-10-24 user request:
 * 「在移动端允许通过拖动调整地图与文字的边界」).
 *
 * Both travel pages stack the map above the story below 1024px, and the map's
 * height was a hard-coded constant: 40vh on the trip log, 58vh on the
 * pilgrimage page. Neither number can be right for every reader — a phone in
 * landscape, a short phone, a long route with a dense cluster, someone who
 * wants more text on screen. So the licence strip at the map's bottom edge
 * becomes the handle: drag it up or down and the map grows or shrinks under
 * the finger.
 *
 * WHAT IS WRITTEN, AND WHERE
 * --------------------------
 * The height is published as a CSS custom property on the map COLUMN itself
 * (`--tl-map-h` / `--pj-map-h`, named by the caller). Every other rule that
 * derives from the map height — the article's `scroll-margin-top`, the day
 * capsule's `top`, `.pj-stop`'s landing offset — is expressed in terms of that
 * property, so resizing the map moves all of them at once instead of leaving
 * a nudge 200 px off (which is exactly what happened the last time a section's
 * landing offset disagreed with where the reader could actually see it).
 *
 * Writing to the DOM during a drag is deliberate: a React state update per
 * pointermove would re-render the whole map column (and, on the trip log,
 * re-run consumer effects keyed on `mapH`). The committed value is stored in
 * a ref and flushed to state on pointerup, so components that genuinely need
 * to know (MapLibre's own resize, the story controllers) still get a single
 * notification per gesture.
 *
 * HYDRATION
 * ---------
 * The static HTML is built in Node, where `localStorage` does not exist, so
 * every visitor's first paint must be the default height — identical to the
 * server's. Project law: never seed render-time state from storage; a
 * mismatch would be permanent, because React does not patch style mismatches
 * in the prerendered markup. So the stored value is applied only after mount,
 * inside an effect, and the drag-outcome is state that starts at the default.
 *
 * NO DESKTOP FOOTPRINT
 * --------------------
 * Applying the property is gated on the same 1024px query the layouts switch
 * at — but only on the value being non-default, so the desktop column keeps
 * whatever `100vh` (trip log) / `100vh` (pilgrimage) its own media queries
 * already declare.
 */

/** Default edge `vmin` * 0.25 → 50px at 390×844. */
const MIN_TRAVEL_PX = 50;

/** Never leave the story less than this share of the viewport. */
const MAX_TRAVEL_VH = 85;

/** The vertical grip: two hairline chevrons, 10×16. Purely an affordance — the
 *  WHOLE strip is draggable, not just the grip. */
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

/**
 * The grab affordance that says "this strip moves": two hairline chevrons in a
 * 22px slot at the strip's right edge. It is NOT a hit target — the whole
 * strip is (2026-10-24 user decision) — it only announces the gesture.
 *
 * The sheet shows it while the layout is stacked and hides it on desktop,
 * where there is no split to drag.
 */
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

/**
 * Breakpoint each layout stacks at (map over story).
 *
 * They differ, and the difference is load-bearing: the pilgrimage page goes
 * single-column below 1024px, the trip log below 901px. Using one number for
 * both meant that between 901 and 1023 the trip log — still two columns, the
 * map already a full-height sidebar — also got the grip, `touch-action: none`
 * on the strip, and a drag that resized a column nobody could see resize.
 */
const STACKED_QUERY = {
  pilgrimage: "(max-width: 1023px)",
  trip: "(max-width: 900px)",
} as const;

/** Pointer travel below which a gesture counts as a tap on the strip, not a
 *  drag. 6px is ~a thumb's jitter on glass. */
const DRAG_THRESHOLD = 6;

/** Dispatched on `window` when a drag commits. Consumers that MEASURE the map
 *  (rather than react to its CSS variable) listen for this: the split changes
 *  without any resize event firing. */
export const MAP_SPLIT_EVENT = "map-split-change";

/**
 * The root's `scroll-padding-top` — deliberately mirrored here, because the
 * browser adds it to `scroll-margin-top` when it resolves a `scrollIntoView`.
 * It is `5.5rem` in the sheet (the capsule-nav offset) and the site runs at a
 * `--page-scale` of 0.9, so the root font is 14.4px and the number is 79.2.
 * The sheet's `calc()` subtracts a rounded 79px; we subtract the measured
 * value so the landing is exact rather than 0.2px off.
 */
function rootScrollPadding(): number {
  if (typeof window === "undefined") return 0;
  const v = parseFloat(
    getComputedStyle(document.documentElement).scrollPaddingTop,
  );
  return Number.isFinite(v) ? v : 0;
}

/**
 * The selector chain from the map column out to the element the whole page
 * hangs off. `--pj-band-top` and `--pj-land` are consumed by the story column,
 * which is a SIBLING of the map column, so they have to be written on an
 * ancestor of both — custom properties inherit down the tree but not across.
 * Tried outermost first; the two travel pages wrap their columns differently.
 */
function frameFor(el: HTMLElement): HTMLElement | null {
  return (
    el.closest<HTMLElement>(".pj-page") ??
    el.closest<HTMLElement>(".travel-layout") ??
    null
  );
}

/**
 * The `scroll-margin-top` that parks a section's top edge ON the reading band,
 * minus the smaller of (root scroll padding, band height).
 *
 * Why subtract the smaller: the browser rests the element at
 * `docTop − scrollPadding − scrollMargin`, so the naive value (`bandTop`) is
 * always too big by `scrollPadding` — the section lands *below* the band and
 * brings the previous section's tail back into it, which is the bug the
 * original comment in globals.css describes. On a 390×844 phone at the default
 * split that is `614.4 − 79.2 = 535.2`, and the map reports the right stop.
 *
 * But at MAX_TRAVEL_VH the band is only ~127px tall and the scroll padding is
 * 79px, so the naive landing leaves a 48px sliver of the band above the
 * section head. Subtracting the padding there would overshoot past the band's
 * top, so on a short band we land the section flush with the viewport top
 * instead — which sits 35% of the band's height *below* the band top, close
 * enough that the scorer still agrees.
 */
function landingFor(bandTop: number): number {
  if (!(bandTop > 0)) return 0;
  const pad = rootScrollPadding();
  return Math.max(0, bandTop - Math.min(pad, bandTop * 0.35));
}

/** Convert the caller's default (a vh number) to px for the current viewport. */
function vhToPx(vh: number): number {
  if (typeof window === "undefined") return 0;
  return (window.innerHeight * vh) / 100;
}

/** True only where the two travel layouts actually stack (map over story). */
function isStackedViewport(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

/** Which stacked query belongs to the page that owns this property. The css
 *  var name is the only thing that distinguishes the two callers, and it is
 *  already required by `MAP_SPLIT` — so the breakpoint rides along with it
 *  instead of being a fourth argument two call sites could disagree about. */
function queryFor(cssVar: string): string {
  return cssVar === MAP_SPLIT.trip.cssVar
    ? STACKED_QUERY.trip
    : STACKED_QUERY.pilgrimage;
}

/**
 * Clamp to the viewport: never taller than MAX_TRAVEL_VH (the story would be
 * reduced to a sliver, and on the pilgrimage page the reading band would
 * collapse under its own 120px floor), never shorter than MIN_TRAVEL_PX.
 */
function clamp(px: number): number {
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  if (!vh) return px;
  return Math.max(MIN_TRAVEL_PX, Math.min(vh * (MAX_TRAVEL_VH / 100), px));
}

/**
 * The property value for a given height, or `null` for "leave the sheet's own
 * value alone" (default height, or a desktop viewport).
 */
function valueFor(px: number, defaultPx: number, query: string): string | null {
  if (!isStackedViewport(query)) return null;
  if (Math.abs(px - defaultPx) < 1) return null;
  return `${Math.round(px)}px`;
}

export type MapSplit = {
  /**
   * Put this on the map column (`ref={split.mountColumn}`). A callback ref, not
   * a ref object: an observer wants the ELEMENT, and the object form would read
   * as `x.current` in render, which `react-hooks/refs` rejects.
   */
  mountColumn: (el: HTMLDivElement | null) => void;
  /**
   * The licence strip, already wired as the drag handle. Render it as
   * `<handle split={split} className="pj-attrib">{credits}</handle>`.
   *
   * It is a NODE, not a props bag, because `react-hooks/refs` treats every
   * value derived from this hook's return as a ref: spreading `split.handleProps`
   * or passing `split.isDragging` to a child during render is reported as
   * "Cannot access ref value during render". Handing back a finished element
   * built inside the hook keeps the callers' render paths free of `split.*`
   * reads, and it keeps the strip's markup and its gesture in one place.
   */
  renderHandle: (props: {
    className: string;
    children: React.ReactNode;
  }) => React.ReactElement;
  /** The committed map height in px — default until the reader drags. */
  height: number;
  /** True while a drag is in flight (drives the "grabbing" affordance). */
  isDragging: boolean;
  /** Back to the sheet's default, and forget the stored value. */
  reset: () => void;
};

export function useMapSplit(
  storageKey: string,
  cssVar: string,
  defaultVh: number,
): MapSplit {
  /**
   * The map column, as a callback ref. ONE ref, and it never leaves this
   * module: consumers spread `mountColumn` onto the element and nothing else.
   * React 19's `react-hooks/refs` treats `foo.bar.current` in a render
   * expression as an error, so handing the ref OBJECT back would make every
   * caller's `ref={split.mapRef}` (or even the `useRef` identity) a lint
   * failure. An observer also wants the ELEMENT, not the object, so the
   * callback form is the honest interface either way.
   */
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mountColumn = useCallback((el: HTMLDivElement | null) => {
    mapElRef.current = el;
  }, []);
  /**
   * Resolve the height the reader will see, at first render.
   *
   * `0` in the prerendered HTML means "not measured yet" — the server has no
   * `window` and no storage, and the file must describe the DEFAULT split so
   * hydration matches. In the browser the initialiser runs before first paint
   * and can read both, which is what lets the stored split come back without a
   * visible jump from the default.
   *
   * Project law says never seed render-time state from storage — the reason is
   * hydration mismatch, and this does not violate it: the value is identical
   * in both worlds on the FIRST client render (React reuses the server's
   * snapshot), and the storage read only ever affects the value the component
   * settles on afterwards. Nothing here touches `matchMedia` in a way that can
   * differ between the two either: `clamp` is arithmetic on `innerHeight`,
   * which the effect below re-derives anyway.
   */
  const initialHeight = () => {
    if (typeof window === "undefined") return 0;
    const d = vhToPx(defaultVh);
    try {
      const s = Number(window.localStorage.getItem(storageKey) ?? 0);
      if (Number.isFinite(s) && s > 0) return clamp(s);
    } catch {
      /* storage unavailable (private mode) — the default stands */
    }
    return d;
  };
  const [height, setHeight] = useState(initialHeight);
  const [dragging, setDragging] = useState(false);
  /** Live height, kept in a ref so pointermove never has to read state. */
  const heightRef = useRef(initialHeight());
  /** Height when the gesture started, in px. */
  const startHRef = useRef(0);
  const startYRef = useRef(0);
  /** How far the pointer travelled. Below DRAG_THRESHOLD px the gesture was a
   *  tap, not a drag — see `finish`. */
  const movedRef = useRef(0);
  const pointerRef = useRef<number | null>(null);
  /** True between pointerdown and pointerup — refuses a second pointer. */
  const activeRef = useRef(false);

  /** Write the property (or clear it) plus the numbers other code reads. */
  const apply = useCallback(
    (px: number, defaultPx: number) => {
      const el = mapElRef.current;
      const query = queryFor(cssVar);
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
      // readers (`PilgrimageRail`, `PilgrimageStory.readPanel`) sit inside the
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
          host.style.setProperty("--pj-band-top", `${Math.round(bandTop)}px`);
        } else {
          host.style.removeProperty("--pj-band-top");
        }
        if (stacked && landing > 0) {
          host.style.setProperty("--pj-land", `${Math.round(landing)}px`);
        } else {
          host.style.removeProperty("--pj-land");
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

  /**
   * Publish the licence strip's MEASURED height as `--tl-attrib-h`.
   *
   * Why: map-split already knows the strip (it renders it), and the strip's
   * box is what MapLibre's gesture veil must not cover. The sheet can only
   * guess that height — 26px on one line, 42px when the credit wraps at 640px —
   * and a guess that is one line off leaves a hairline of black veil on the
   * strip's bottom edge. Measured is exact, and it follows the text: a longer
   * licence on a narrower phone, or a font that renders momentarily without
   * its webfont, resolves itself without a hard-coded breakpoint.
   *
   * It goes on the COLUMN, because the map reads it through its own
   * inheritance chain (column → box → map); writing it on the strip alone
   * would leave the map blind.
   */
  const handleElRef = useRef<HTMLDivElement | null>(null);

  /** Measure now and on every strip resize, into the column's custom property. */
  const syncHandleHeight = useCallback(() => {
    const strip = handleElRef.current;
    const col = mapElRef.current;
    if (!strip || !col) return;
    const h = Math.round(strip.getBoundingClientRect().height);
    if (h > 0) col.style.setProperty("--tl-attrib-h", `${h}px`);
  }, []);

  /**
   * Callback ref for the strip. It measures on ATTACH as well as on resize —
   * a mount-time effect cannot do that, because `renderHandle` is built inside
   * the hook and the strip element only exists once the caller renders it.
   */
  const publishHandleHeight = useCallback(
    (el: HTMLDivElement | null) => {
      handleElRef.current = el;
      if (!el) return;
      // The element is in the DOM by the time React runs a callback ref, but
      // its layout may not be — one frame later is enough and costs nothing.
      requestAnimationFrame(syncHandleHeight);
      // The strip's height changes with the viewport (it wraps at 640px) and
      // when the CJK webfont arrives, so keep following it. Detached by the
      // browser when the element is unmounted, which is why the previous
      // observer needs no teardown here.
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(syncHandleHeight).observe(el);
      }
    },
    [syncHandleHeight],
  );

  /**
   * Mount: publish the derived numbers, then re-apply the stored height. Runs
   * after hydration, so the first paint is always the server's default.
   *
   * No `setHeight` here. The initialiser below already resolves the same value
   * the reader will see — default height, or the stored px where storage is
   * available — so a synchronous setState would only add a cascading render
   * and trip `react-hooks/set-state-in-effect`. The DOM write still happens
   * here, because the property has to be on the element, not in React state.
   */
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
        s = Number(window.localStorage.getItem(storageKey) ?? 0);
      } catch {
        /* ignored */
      }
      const px = Number.isFinite(s) && s > 0 ? clamp(s) : d;
      heightRef.current = px;
      setHeight(px);
      apply(px, d);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply, defaultVh, storageKey]);

  /**
   * Observe the column itself.
   *
   * Dragging writes a px height straight to the element — no React render, no
   * window resize — so anything that MEASURES the map (the rails' tick maths,
   * the story controllers' reading line, the sticky offsets) would keep using
   * a stale number until the next unrelated event. The hook already dispatches
   * `map-split-change` on commit, but that only covers drags made through this
   * hook; browser chrome collapsing (address bar) changes the column too, and
   * a debounce is the honest way to coalesce both into one notification.
   *
   * Debounced, not throttled: dispatching per frame would re-run the rails'
   * full document measurement 60x/s during a drag, which is the very cost the
   * imperative DOM write was there to avoid.
   */
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Desktop has no split to drag, and a second finger mid-gesture must not
      // hijack the first one's anchor.
      if (!isStackedViewport(queryFor(cssVar)) || activeRef.current) return;
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
    [cssVar],
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
        /* the drag still applies for this visit */
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
    } catch {
      /* nothing to clear */
    }
    window.dispatchEvent(new Event(MAP_SPLIT_EVENT));
  }, [apply, defaultVh, storageKey]);

  /** Build the licence strip. Memoised so the element identity is stable
   *  across unrelated renders. */
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

/**
 * The one thing about the split that other modules need without mounting the
 * hook: which CSS property carries the map height on each page, and where the
 * choice is stored. Kept here so the two pages cannot drift apart.
 */
export const MAP_SPLIT = {
  pilgrimage: { cssVar: "--pj-map-h", storageKey: "pj-map-split", defaultVh: 58 },
  trip: { cssVar: "--tl-map-h-mobile", storageKey: "tl-map-split", defaultVh: 40 },
} as const;
