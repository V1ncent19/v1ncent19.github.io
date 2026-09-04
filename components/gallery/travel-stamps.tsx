import type { ComponentType } from "react";

/**
 * Travel-stamp "badges" for the gallery. Each photo's `badge` value in
 * content/gallery/items.json names a preset stamp. The real per-place vector
 * files arrive later; until then every item renders the generic placeholder
 * below (a dashed postmark ring + location pin, tinted by the item accent).
 *
 * To plug in a real stamp later: register an entry here keyed by the `badge`
 * string you put in items.json (e.g. `kaohsiung: () => <svg …/>`). No other
 * code changes — the tile + lightbox look it up by key.
 *
 * All stamps inherit `currentColor`, so the caller colours them (tiles use the
 * item's theme accent). Keep the drawing inside one <svg> so it scales with
 * the className the caller passes.
 */

export interface StampProps {
  className?: string;
}

/** Registry of real per-place stamps (added when the vector files are ready). */
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

/** Render the stamp for a `badge` preset (placeholder when empty/unknown). */
export function TravelStamp({
  preset,
  className,
}: {
  preset?: string;
  className?: string;
}) {
  const Preset = (preset && STAMP_PRESETS[preset]) || PlaceholderStamp;
  return <Preset className={className} />;
}
