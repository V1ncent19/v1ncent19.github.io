import type { CSSProperties } from "react";
import { BADGE_ART, BADGE_FRAME } from "./badge-art.generated";

/**
 * Travel-stamp badges for the gallery — composed INLINE at build time
 * (user-confirmed plan B, 2026-09-06).
 *
 * A badge is ONE inline <svg>: the shared two-ring frame from
 * `public/assets/gallery/badges/badge-frame.svg` plus the per-key icon from
 * `badges/<key>.svg`, both flattened into `badge-art.generated.ts` by
 * `scripts/build-badges.mjs` (rerun via `npm run badges`, wired as prebuild).
 *
 * Why inline instead of <img>: the artwork is drawn with
 * stroke="currentColor", and SVG loaded through <img> is a separate document
 * that CANNOT inherit CSS colour — every badge would render black and lose
 * the tile-accent tint, hover recolour and dark-mode adaptation. Inlined,
 * the whole badge inherits `color` from the chip that hosts it.
 *
 * An unknown/empty key (no entry in the generated table — decided at build
 * time, no runtime 404 dance) renders the dashed postmark placeholder.
 */

export interface StampProps {
  className?: string;
  style?: CSSProperties;
}

/** Generic dashed postmark + location pin — for empty/unknown badge keys. */
function PlaceholderStamp({ className, style }: StampProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className} style={style}>
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeDasharray="3.6 3.1"
      />
      <circle
        cx="24"
        cy="24"
        r="15.5"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      <path
        d="M24 10.5c-5 0-9 4.05-9 9.05C15 26.35 24 36 24 36s9-9.65 9-16.45c0-5-4-9.05-9-9.05z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="19.5" r="3.1" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

/** Frame + icon composed badge (see module doc). One DOM node, zero requests. */
export function TravelStamp({
  preset,
  className,
  style,
}: {
  preset?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const art = preset ? BADGE_ART[preset] : undefined;
  if (!art) return <PlaceholderStamp className={className} style={style} />;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      aria-hidden
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: BADGE_FRAME + art }}
    />
  );
}
