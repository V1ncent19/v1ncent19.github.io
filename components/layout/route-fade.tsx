"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Route-content fade (Task D #4).
 *
 * Every internal navigation used to swap the <main> content instantly. This
 * wrapper keys a div on the current pathname, so each route change remounts the
 * page content and replays the `.route-fade` CSS animation (a short fade + rise,
 * `.route-fade` in globals.css) — the fresh page eases in instead of snapping.
 *
 * Notes:
 *  - Server-rendered children flow through as a normal `children` prop, so this
 *    adds no client round-trip for page data.
 *  - The animation also plays on the very first full load (harmless fade-in).
 *  - Reduced motion is flattened by the global `*` media rule in globals.css.
 *  - Only opacity + a 4px translateY are animated and the final keyframe is
 *    `transform: none`, so no persistent containing block is created for fixed
 *    descendants (the gallery lightbox overlay) after the run. DURING the
 *    260ms run, though, the transform does hijack fixed descendants — which
 *    is why anything fixed that paints on mount (the blog post TOC) portals
 *    itself to <body> instead of living in the page tree.
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-fade">
      {children}
    </div>
  );
}
