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
import { type CSSProperties, type ReactNode } from "react";
import { useCardLaunch } from "@/lib/use-card-launch";

/** Original stamp beat: rings pop around the existing hover arrow, then hold. */
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

  const { ref, onClick } = useCardLaunch({ delay: CONFIRM_MS, navigate: () => router.push(href) });

  return (
    <Link ref={ref} href={href} style={style} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
