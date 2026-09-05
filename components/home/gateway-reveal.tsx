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
 * The visibility classes are applied straight to the DOM node instead of
 * React state: arming is a pure presentation toggle, and going through state
 * would both trip the set-state-in-effect lint rule and re-render the whole
 * subtree for nothing.
 */

import { useEffect, useRef, type ReactNode } from "react";

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
  // keyboard focus of a card swaps it into src. Registered independently of
  // the motion preference — reduced motion only disables animation, not the
  // image itself.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const load = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || !el.contains(link)) return;
      link.querySelectorAll("img[data-peek-src]").forEach((img) => {
        const peek = img as HTMLImageElement;
        peek.src = peek.dataset.peekSrc ?? "";
        peek.removeAttribute("data-peek-src");
      });
    };
    el.addEventListener("pointerover", load);
    el.addEventListener("focusin", load);
    return () => {
      el.removeEventListener("pointerover", load);
      el.removeEventListener("focusin", load);
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

  return (
    <div ref={ref} className={className ? `${className} gw-reveal` : "gw-reveal"}>
      {children}
    </div>
  );
}
