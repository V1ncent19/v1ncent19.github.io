"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-driven multilingual greeting for the About pages.
 *
 * Interaction model (user direction 2026-09-08): a typewriter as the base
 * effect, but never auto-cycling — the language only advances when the reader
 * scrolls, and holds still while the page is at rest. Every WINDOW_VH
 * viewport-heights of scroll progress plays one full lap over the greetings
 * (one segment per greeting); the laps loop indefinitely, so continuous
 * scrolling keeps cycling languages instead of stopping at the last one.
 * Crossing a segment boundary starts a typewriter swap to that language
 * (scrolling up swaps back). Bilingual note: the greeting is identical in
 * en.md and zh.md, so one instance serves both.
 *
 * Progressive enhancement: the server renders the full "a / b / c" list
 * (exactly the old markdown line); this effect only rewrites the node after
 * hydration, so no-JS/crawler/reduced-motion visitors keep the static text.
 *
 * Maintenance interface: to add a language, append one entry to GREETINGS —
 * the scroll window and segment count adapt automatically. Do not reorder
 * existing entries casually: the mapping scroll→language is positional.
 */
const GREETINGS = [
  "Hello!",
  "你好！",
  "Bonjour!",
  "こんにちは！",
  "Γεια σας!",
  "¡Hola!",
  "안녕하세요!",
  "Ciao!",
];

/** Scroll distance (in viewport heights) over which one full cycle plays. */
const WINDOW_VH = 0.5;
const TYPE_MS = 60;
const ERASE_MS = 25;

export function GreetingCycle() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* token guards the in-flight typewriter: any newer target cancels it
       (fast scrolling across several segments jumps straight to the last) */
    let token = 0;
    let idx = -1;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const typeTo = async (text: string, myToken: number) => {
      const current = el.textContent ?? "";
      for (let d = current.length; d >= 0; d--) {
        if (myToken !== token) return;
        el.textContent = current.slice(0, d);
        await sleep(ERASE_MS);
      }
      for (let c = 1; c <= text.length; c++) {
        if (myToken !== token) return;
        el.textContent = text.slice(0, c);
        await sleep(TYPE_MS);
      }
    };

    const settle = () => {
      const vh = window.innerHeight || 1;
      /* continuous segment counter, wrapped modulo the list length so the
         laps loop indefinitely (positive mod keeps upward scroll correct) */
      const seg = (window.scrollY / (WINDOW_VH * vh)) * GREETINGS.length;
      const next =
        ((Math.floor(seg) % GREETINGS.length) + GREETINGS.length) %
        GREETINGS.length;
      if (next === idx) return;
      idx = next;
      token += 1;
      void typeTo(GREETINGS[idx], token);
    };

    /* flip from the static SSR list into cycle mode (caret comes with it) */
    el.dataset.mode = "cycle";
    el.textContent = "";
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        settle();
      });
    };
    settle(); // initial pass — also handles restored scroll positions
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      token += 1;
    };
  }, []);

  return (
    <p ref={ref} className="greeting-cycle" aria-label={GREETINGS.join(" / ")}>
      {GREETINGS.join(" / ")}
    </p>
  );
}
