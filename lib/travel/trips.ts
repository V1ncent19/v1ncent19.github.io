/**
 * Travel hub registry.
 *
 * Each trip has a content/travel/<id>/card.json, discovered here by directory
 * scan. Hand-authored story files stay beside the card. Imported derived map
 * data lives in generated/travel/<id>/; PTES's large track is mirrored to the
 * unchanged public/data/travel/ptes-2025/track.json runtime URL by sync:data.
 *
 * ORDER: sorted by `start` date, oldest first, with `id` as the tiebreak so
 * the result is deterministic. This module's order no longer decides the hub's
 * visual order — the travel hub merges story tiles with photos by their anchor
 * date and applies the `featured` band itself — so the sort here only needs to be
 * *stable and predictable*, which makes diffs and debugging sane.
 *
 * PRIVACY: generated trip data is committed and may be bundled into the site.
 * Only sanitized coordinates belong there. The PTES mirror under public/ also
 * ships at its existing URL. Original GPS stays under ignored assets-src/.
 *
 * To add a trip: create `content/travel/<new-id>/card.json`, add
 * `app/travel/<new-id>/page.tsx` (+ the `/zh` mirror), import the hand-written
 * JSONs in its definition, and — if a GPS track is too big to inline — put
 * the sanitized track under generated/ and add its `<new-id>/track.json` to
 * `scripts/sync-trip-data.mjs`.
 * Never write public/data/ by hand. Nothing in this file needs editing.
 */

import fs from "node:fs";
import path from "node:path";
import { pickList } from "@/lib/localized";

export interface TripCard {
  id: string;
  title: { en: string; zh: string };
  blurb: { en: string; zh: string };
  /** ISO dates, shown as-is. */
  start: string;
  end: string;
  days: number;
  distanceKm: number;
  gpsPoints: number;
  beta: boolean;
  /** Keep this trip above the featured band on the Travel hub. */
  pinned?: boolean;
  /** Join the same curated band as featured gallery photos. */
  featured?: boolean;
  /** Optional visible pin icon, independent of featured placement. */
  showPinnedBadge?: boolean;
  /**
   * Hub-card place chips (2026-09-26 "H+J" card enrichment) — display-only,
   * hand-curated; last entry conventionally summarizes the smaller stops.
   */
  stops?: { en: string[]; zh: string[] };
  /**
   * Optional hub-card cover photo. Shown as the right-hand / top image on the
   * /travel hub card. For gallery-backed trips point it at one of the trip's
   * own photos in content/travel/gallery/items.json; a trip with its own asset tree
   * may point anywhere under /assets.
   */
  cover?: string;
  /** object-position for the hover-orb cover, e.g. "center 30%". */
  coverPos?: string;
  /**
   * Per-trip overrides for the hub card's stat line / meta / CTA.
   *
   * Needed because the default trio ("N days · X km · N GPS pts") only makes
   * sense for a tracked multi-day road trip. The pilgrimage (2026-10-16) is a
   * single 2.5-hour ride whose "photos" are composites, so it counts scenes
   * rather than GPS samples and reads "Anime pilgrimage map" instead of
   * "Interactive map log". Omit these and the trip-log defaults apply.
   */
  cardMeta?: { en: string; zh: string };
  cardCta?: { en: string; zh: string };
  /** The stat line, already formatted. Overrides days/distance/gpsPoints. */
  cardFacts?: { en: string[]; zh: string[] };
}

const TRAVEL_DIR = path.join(process.cwd(), "content", "travel");

/** Fields a card.json must carry; anything else is rejected so a typo in a
 *  new card fails the BUILD rather than silently rendering an empty tile. */
const REQUIRED: (keyof TripCard)[] = [
  "id",
  "title",
  "blurb",
  "start",
  "end",
  "days",
  "distanceKm",
  "gpsPoints",
  "beta",
];

/**
 * Read every `content/travel/<id>/card.json`.
 *
 * Synchronous on purpose: this runs once per build, at module evaluation, the
 * same as the hand-written array it replaces. Returning a plain module-level
 * array keeps the two hub pages (`app/travel/page.tsx` and its zh mirror)
 * untouched — they still just import `tripCards`.
 */
function readTripCards(): TripCard[] {
  if (!fs.existsSync(TRAVEL_DIR)) return [];

  const cards: TripCard[] = [];
  for (const entry of fs.readdirSync(TRAVEL_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    /* Anything without a card.json is not a trip. That is already implied by
       the existsSync below, but a trip folder may now also contain a `data/`
       subfolder (ptes's fetched track) — named here so a future reader does
       not mistake either for a trip of its own. */
    const file = path.join(TRAVEL_DIR, entry.name, "card.json");
    if (!fs.existsSync(file)) continue;

    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<TripCard>;
    const missing = REQUIRED.filter((k) => raw[k] === undefined);
    if (missing.length) {
      throw new Error(
        `${path.relative(process.cwd(), file)} is missing: ${missing.join(", ")}. ` +
          "Every trip card needs these fields (see lib/travel/trips.ts).",
      );
    }
    for (const field of ["pinned", "featured", "showPinnedBadge"] as const) {
      if (raw[field] !== undefined && typeof raw[field] !== "boolean") {
        throw new Error(`${path.relative(process.cwd(), file)}: ${field} must be a boolean.`);
      }
    }
    /* The directory name is the URL segment and the hub tile's key, so a card
       whose `id` disagrees with its folder would produce a dead link that only
       fails at click time. Catch it here instead. */
    if (raw.id !== entry.name) {
      throw new Error(
        `content/travel/${entry.name}/card.json declares id "${raw.id}" — ` +
          "it must match its directory name.",
      );
    }
    cards.push(raw as TripCard);
  }

  /* Oldest departure first. Ties broken by id so the order is deterministic
     (two trips can genuinely start on the same day). */
  cards.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  return cards;
}

export const tripCards: TripCard[] = readTripCards();

/**
 * The date a travel log is PUBLISHED — i.e. the date that card sorts and
 * displays by on the home gateway, the /travel hub and the Blog index.
 *
 * It is `end`, not `start` (2026-10-25, user decision): a travel log can only
 * be written once the trip is over, so its "post date" is the return day. The
 * two are NOT interchangeable for sorting: a trip that departs 2025-12-15 and
 * returns 2026-01-01 sorts under December while every other post dated
 * 2025-12-31 would appear *above* it.
 *
 * Deliberately a function rather than a field on `TripCard`, so the manifest
 * never carries the same fact twice: `start` / `end` stay the trip's real
 * window (shown verbatim by TravelStory as "start → end"), and this derives
 * the publication date from it.
 *
 * Do NOT use this for the ordered trip list (`cards.sort` above) — that one
 * is "oldest departure first" on purpose, and the hub tiles keep that order.
 */
export function tripPostedAt(trip: TripCard): string {
  return trip.end || trip.start;
}

/**
 * The hub card's stat line — ONE implementation, because the same numbers now
 * appear twice: on the /travel tile and on the trip's card in the Blog index
 * (lib/blog-travel.ts, 2026-10-17). `cardFacts` wins verbatim when the trip
 * overrides it (the pilgrimage counts composites, not GPS samples); otherwise
 * the generic trio applies.
 */
export function tripFacts(
  trip: TripCard,
  lang: "en" | "zh",
): string[] {
  const override = pickList(trip.cardFacts, lang);
  if (override.length) return override;
  const km = trip.distanceKm.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
  const pts = trip.gpsPoints.toLocaleString("en-US");
  return lang === "zh"
    ? [`${trip.days} 天`, `${km} km`, `${pts} 轨迹点`]
    : [`${trip.days} days`, `${km} km`, `${pts} GPS pts`];
}
