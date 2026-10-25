"use client";

import { useCallback, useRef } from "react";

/**
 * Pointer-drag scrubbing for the mobile progress bar (2026-10-24).
 *
 * The bar used to be a row of invisible day buttons riding on the track. The
 * user wanted the opposite kind of control — "做成一个普通的可拖动进度条就
 * 可以。不过在拖动的时候，端点上可以浮现出一个方框，标示拖到的是哪个章节":
 * one continuous slider you drag, with a small box naming the chapter under
 * the playhead while you drag.
 *
 * Why a hook rather than inline handlers in each component: TravelNav (trip
 * log) and PilgrimageStory (anitabi) both own a bar and must behave
 * identically.
 *
 * THE CONSTRAINT THAT SHAPES THIS FILE: both bars are driven by a rAF loop
 * that imperatively rewrites `style` and toggles `.read` / `.active` classes
 * every frame. A `useState` that flips on pointerdown would re-render the
 * component mid-gesture, and React would reconcile the nodes the loop is
 * mutating from outside. So the drag state lives in a ref, and the visual
 * consequences are written straight to the DOM through `onScrub`. The only
 * React state kept is a `useState`-free boolean exposed via `isDragging()`
 * for callers that genuinely need to re-render once (neither does today).
 *
 * `touch-action: none` must be set in CSS on the surface, or the browser
 * claims the gesture for page scrolling before pointermove ever fires.
 */
export function useScrubTrack({
  onScrub,
  onRelease,
}: {
  /** Called on every drag move (and on the initial press) with 0..1. */
  onScrub: (fraction: number) => void;
  /** Called once on pointerup/cancel with the final fraction. */
  onRelease?: (fraction: number) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fractionAt = useCallback((clientX: number) => {
    const el = surfaceRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Primary button only; on touch there is only ever one.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      draggingRef.current = true;
      onScrub(fractionAt(e.clientX));
    },
    [fractionAt, onScrub]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      onScrub(fractionAt(e.clientX));
    },
    [fractionAt, onScrub]
  );

  const end = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const f = fractionAt(e.clientX);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      onRelease?.(f);
    },
    [fractionAt, onRelease]
  );

  const cancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    },
    []
  );

  return {
    surfaceRef,
    isDragging: useCallback(() => draggingRef.current, []),
    surfaceProps: {
      ref: surfaceRef,
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: cancel,
    } as const,
  };
}
