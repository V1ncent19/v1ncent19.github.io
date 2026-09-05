"use client";

/**
 * Launch-confirm wrapper for the home Site Navigation gateway links.
 *
 * Plain links swap pages the instant you click, which can feel like the site
 * never acknowledged the press. This wrapper intercepts the first click,
 * plays a short "stamp" confirmation on the card (CSS keyed off the
 * `.is-launching` class in globals.css), and only then hands off to the
 * router — so navigation visibly *responds* before it happens.
 *
 * Deliberately left native:
 * - modifier/middle clicks (new tab/window) fall through untouched;
 * - no-JS visitors get the plain next/link behaviour (the stamp never plays);
 * - prefers-reduced-motion navigates immediately (no stamp, no delay).
 *
 * A second click while the stamp is out is ignored, so double-clicks can't
 * double-push the route.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

/** How long the confirm stamp plays before the route actually changes. */
const CONFIRM_MS = 360;

export function GatewayLink({
  href,
  style,
  className,
  children,
}: {
  href: string;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return; // let the browser handle new-tab / modified clicks natively
      }
      event.preventDefault();

      const link = event.currentTarget;
      if (link.classList.contains("is-launching")) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!reduced) link.classList.add("is-launching");
      window.setTimeout(() => router.push(href), reduced ? 0 : CONFIRM_MS);
    },
    [href, router],
  );

  return (
    <Link href={href} style={style} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
