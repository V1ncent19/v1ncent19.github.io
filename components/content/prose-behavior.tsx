"use client";

import { useEffect } from "react";

/**
 * Touch/keyboard convenience for the About-page prose widgets.
 *
 * heimu spoilers (`<span class="heimu">`) reveal on :hover via CSS, which is a
 * no-op on touch screens. This mounts one delegated click handler that toggles
 * `.is-open` on any tapped spoiler so it stays revealed (tap again to re-hide).
 * Renders nothing; used once on the About pages next to <Prose />.
 */
export function ProseBehavior() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const spoiler = target?.closest<HTMLElement>(".heimu");
      if (!spoiler) return;
      spoiler.classList.toggle("is-open");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
