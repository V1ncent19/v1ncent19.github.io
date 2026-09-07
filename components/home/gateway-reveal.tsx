"use client";

/**
 * Scroll-entrance wrapper for the home Site Navigation gateway grid.
 *
 * SSR/no-JS: renders children fully visible (arming only happens in an
 * effect, so the hidden state can never stick without JS). Once armed, the
 * wrapper observes itself; the first intersection adds `.is-in` once and each
 * `.gw-item` child fades/rises in, staggered by its `--gw-i` custom property
 * (CSS in globals.css). Respects prefers-reduced-motion by never arming.
 *
 * Touch-only devices additionally get a scroll-driven reveal: the effect
 * below guards on (hover: none) and toggles `.is-live` on the card
 * straddling the viewport midline, replaying the hover visuals while the
 * card slides past (and the peek image loads through the same decode gate).
 *
 * The visibility classes are applied straight to the DOM node instead of
 * React state: arming is a pure presentation toggle, and going through state
 * would both trip the set-state-in-effect lint rule and re-render the whole
 * subtree for nothing.
 */

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Decode gate: hover swaps data-peek-src into src, but the reveal animation
 * is CSS-driven (.group:hover .gateway-orb), so it cannot wait for the image
 * by itself. The CSS keeps gateway-orb img at opacity 0 until `.peek-ready`
 * lands; we add it as soon as the image can be fully decoded. Slow-network
 * fallback: never hold the veil shut longer than this, or a hover would show
 * nothing at all (worse than a late fade-in of a partially painted image).
 */
const DECODE_FALLBACK_MS = 1500;

/**
 * Decode gate, shared by the hover/focus loader and the touch midline
 * activator below: the orb reveal is pure CSS and cannot wait for the image,
 * so the photo stays at opacity 0 until it can be fully decoded (`.peek-ready`
 * lands). Slow-network fallback: never hold the veil shut longer than
 * DECODE_FALLBACK_MS — a late fade-in beats an empty reveal.
 */
function armPeek(peek: HTMLImageElement) {
  const done = () => peek.classList.add("peek-ready");
  if (peek.complete) {
    done(); // already in cache — decode would resolve instantly anyway
    return;
  }
  peek.decode().then(done, done);
  window.setTimeout(done, DECODE_FALLBACK_MS);
}

/** Swap a card's data-peek-src placeholder into src, then arm the gate. */
function swapPeek(card: HTMLElement) {
  card.querySelectorAll("img[data-peek-src]").forEach((img) => {
    const peek = img as HTMLImageElement;
    peek.src = peek.dataset.peekSrc ?? "";
    peek.removeAttribute("data-peek-src");
    armPeek(peek);
  });
}

export function GatewayReveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Delegated lazy-loader for the gateway polaroid peeks: <img> ships with a
  // data-peek-src placeholder (no network cost on load); the first hover or
  // keyboard focus of a card swaps it into src, then gates the reveal on
  // decode so the circle never uncovers a half-downloaded image. Registered
  // independently of the motion preference — reduced motion only disables
  // animation, not the image itself.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const load = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || !el.contains(link)) return;
      swapPeek(link as HTMLElement);
    };
    el.addEventListener("pointerover", load);
    el.addEventListener("focusin", load);
    return () => {
      el.removeEventListener("pointerover", load);
      el.removeEventListener("focusin", load);
    };
  }, []);

  // Idle prefetch: once the document has fully loaded and the main thread
  // goes idle, silently warm the HTTP cache for every card's peek image
  // (~235 KB total, one fetch per card). Starts strictly after `load`, so it
  // never competes with LCP for bandwidth; by hover time the images are
  // usually already cached and the decode gate above resolves instantly.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const urls = Array.from(
      el.querySelectorAll("img[data-peek-src]"),
      (img) => (img as HTMLImageElement).dataset.peekSrc,
    ).filter((u): u is string => Boolean(u));
    if (urls.length === 0) return;
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      const go = () => urls.forEach((u) => void (new Image().src = u));
      if (typeof window.requestIdleCallback === "function")
        window.requestIdleCallback(go, { timeout: 4000 });
      else window.setTimeout(go, 1200);
    };
    if (document.readyState === "complete") {
      warm();
    } else {
      window.addEventListener("load", warm, { once: true });
      return () => {
        cancelled = true;
        window.removeEventListener("load", warm);
      };
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    el.classList.add("gw-armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove("gw-armed", "is-in");
    };
  }, []);

  // Touch-only devices (hover: none): cards stack vertically and a real
  // :hover never fires, so the photo reveal is driven by scroll position.
  // While a card's box covers the viewport midline (50vh) it carries
  // `.is-live` — the CSS (hover: none block in globals.css) opens the orb
  // exactly like :hover does; sliding away removes it. When several cards
  // straddle the line at once, only the one whose centre is closest to the
  // midline stays live (single focal card). The first activation also swaps
  // the card's peek image in through the same decode gate as hover, so the
  // orb never opens on an empty frame. Desktop (hover: hover) never arms.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: none)").matches) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".gw-item"));
    if (cards.length === 0) return;
    const revealed = new WeakSet<HTMLElement>();
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        if (r.top > mid || r.bottom < mid) continue;
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = card;
        }
      }
      for (const card of cards) card.classList.toggle("is-live", card === best);
      if (best && !revealed.has(best)) {
        revealed.add(best);
        swapPeek(best);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      for (const card of cards) card.classList.remove("is-live");
    };
  }, []);

  return (
    <div ref={ref} className={className ? `${className} gw-reveal` : "gw-reveal"}>
      {children}
    </div>
  );
}
