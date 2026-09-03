"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Appears past ~1 viewport of scroll; clicking eases back to the very top.
 * Visible state is tracked with a passive scroll listener (initial value set on
 * the first animation frame so nothing is written synchronously in an effect). */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    const raf = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={[
        "ui-text fixed right-5 bottom-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface text-brand shadow-lift backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand-strong hover:no-underline",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      ].join(" ")}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
    </button>
  );
}
