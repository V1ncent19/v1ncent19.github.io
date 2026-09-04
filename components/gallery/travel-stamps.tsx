import { useState } from "react";
import type { ComponentType } from "react";

/**
 * Travel-stamp "badges" for the gallery. Each photo's `badge` value in
 * content/gallery/items.json names a stamp. Two sources, in priority order:
 *
 *  1. A drop-in SVG file at `public/assets/gallery/badges/<badge>.svg`
 *     (served at `/assets/gallery/badges/<badge>.svg`). Put your real artwork
 *     there, square, and it renders as-is — no code changes needed.
 *  2. The React `STAMP_PRESETS` registry below (used as a fallback while a
 *     badge is set but its .svg has not been added yet, or for stamps that
 *     live inline instead of as files).
 *
 * When neither exists, every item renders the generic dashed placeholder
 * (postmark ring + pin). `onError` makes the file lookup safe: a badge key
 * with no matching .svg still shows the placeholder, never a broken image.
 *
 * All inline stamps inherit `currentColor`, so callers colour them (tiles use
 * the item's theme accent); a real multi-colour .svg is exempt. Keep the
 * drawing square and centred so it scales with the className the caller
 * passes (the mark boxes are h-9..h-10).
 */

export interface StampProps {
  className?: string;
}

/** Registry of real per-place React stamps (added when the vector files are ready). */
const STAMP_PRESETS: Record<string, ComponentType<StampProps>> = {
  // kaohsiung: () => <svg viewBox="0 0 48 48" …/>,
};

/** Generic dashed postmark + location pin — the pre-badge placeholder. */
function PlaceholderStamp({ className }: StampProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
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

/** Render the stamp for a `badge` preset (file → registry → placeholder). */
export function TravelStamp({
  preset,
  className,
}: {
  preset?: string;
  className?: string;
}) {
  // File-backed artwork wins. Start optimistic and fall back on a 404 so a
  // badge key without its .svg yet still shows the placeholder.
  const [missing, setMissing] = useState(false);
  const Registered = (preset && STAMP_PRESETS[preset]) || PlaceholderStamp;
  const fileUrl = preset ? `/assets/gallery/badges/${preset}.svg` : null;
  if (fileUrl && !missing) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fileUrl}
        alt=""
        draggable={false}
        style={{ objectFit: "contain" }}
        onError={() => setMissing(true)}
        className={className}
      />
    );
  }
  return <Registered className={className} />;
}
