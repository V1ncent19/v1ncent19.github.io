"use client";

import { useCallback, useLayoutEffect, useRef, type MouseEvent, type PointerEvent } from "react";

// Client route changes may remount the source rather than restore its DOM.
const returningCards = new Set<string>();

/** Keep transient confirmation UI out of route caches and browser snapshots. */
export function useCardLaunch({ delay, navigate, resetHoverOnReturn = false }: {
  delay: number;
  navigate: () => void;
  resetHoverOnReturn?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | null>(null);
  const pending = useRef(false);
  const tabIntent = useRef(false);
  const sourcePath = useRef<string | null>(null);
  const returnKey = useCallback(() => ref.current && sourcePath.current ? `${sourcePath.current}|${ref.current.href}` : null, []);

  const reset = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    pending.current = false;
    ref.current?.classList.remove("is-launching");
  }, []);

  const allowHover = useCallback(() => {
    ref.current?.removeAttribute("data-return-idle");
    const key = returnKey();
    if (key) returningCards.delete(key);
  }, [returnKey]);

  const restoreIdle = useCallback(() => {
    reset();
    tabIntent.current = false;
    if (resetHoverOnReturn) {
      ref.current?.setAttribute("data-return-idle", "");
      const key = returnKey();
      if (key) returningCards.add(key);
    }
  }, [reset, resetHoverOnReturn, returnKey]);

  useLayoutEffect(() => {
    reset();
    sourcePath.current ??= window.location.pathname;
    const key = returnKey();
    if (resetHoverOnReturn && key && returningCards.has(key)) {
      ref.current?.setAttribute("data-return-idle", "");
      // Responsive masonry may remount a card again while rebuilding columns.
      // Keep the guard until real interaction, not just the first mount.
    }
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === "back_forward") restoreIdle();
    const show = (event: PageTransitionEvent) => event.persisted ? restoreIdle() : reset();
    const keyDown = (event: KeyboardEvent) => { tabIntent.current = event.key === "Tab"; };
    const keyUp = () => { tabIntent.current = false; };
    window.addEventListener("pagehide", restoreIdle);
    window.addEventListener("pageshow", show);
    window.addEventListener("popstate", restoreIdle);
    if (resetHoverOnReturn) {
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
    }
    return () => {
      reset();
      window.removeEventListener("pagehide", restoreIdle);
      window.removeEventListener("pageshow", show);
      window.removeEventListener("popstate", restoreIdle);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [reset, restoreIdle, resetHoverOnReturn, returnKey]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLAnchorElement>) => {
    // BFCache can restore a hover target without genuine pointer movement.
    if (event.movementX || event.movementY) allowHover();
  }, [allowHover]);

  const onFocus = useCallback(() => {
    // Keep a restored focus ring, but re-open the cover only on a fresh Tab.
    if (tabIntent.current) allowHover();
  }, [allowHover]);

  const onClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pending.current) return;
    allowHover();
    pending.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) event.currentTarget.classList.add("is-launching");
    timer.current = window.setTimeout(() => {
      // Clear before either router navigation or a full-document snapshot.
      restoreIdle();
      navigate();
    }, reduced ? 0 : delay);
  }, [delay, navigate, allowHover, restoreIdle]);

  return { ref, onClick, onPointerMove, onPointerDown: allowHover, onFocus };
}
