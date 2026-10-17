/**
 * Travel hub registry.
 *
 * 2026-10-17 reorganisation: each trip owns a directory under
 * `content/travel/<id>/`, and its hub-card metadata lives in that directory as
 * `card.json` beside the trip's own data files:
 *
 *   content/travel/ptes-2025/
 *     card.json          ← this file
 *     trip.json          ← imported by TravelLog (build-time, single copy)
 *     scenes.json        ← ditto
 *     attractions.json   ← ditto
 *     diagnostics.json   ← ditto (provenance for track.json, not rendered)
 *     track.json         ← ONLY this one is fetched, via
 *                          public/data/travel/<id>/ (mirrored by sync:data)
 *   content/travel/just-because/
 *     card.json          ← this file
 *     page.json          ← imported at build time by the page; GENERATED, but
 *                          overview/outro/stop-notes are hand-written and
 *                          preserved across generator runs
 *     (its generator outputs — route.json, anitabi-212278.json — live in
 *      public/data/travel/just-because/ because nothing hand-edits them)
 *
 * Why the change: the cards used to live as inline objects in one central
 * array, which meant adding a trip required editing a file in `lib/` — the
 * content was spread across the tree with nothing tying it to the trip it
 * described. Now `content/travel/<id>/` is the complete record of a trip
 * (metadata + data + generator inputs), and this module just sweeps the
 * directory.
 *
 * ORDER: sorted by `start` date, oldest first, with `id` as the tiebreak so
 * the result is deterministic. This module's order no longer decides the hub's
 * visual order — app/travel/page.tsx re-sorts its tiles by their anchor date
 * and applies the `pinned` flag itself — so the sort here only needs to be
 * *stable and predictable*, which makes diffs and debugging sane.
 *
 * PRIVACY: `card.json` and the other imported JSONs are build-time content and
 * never ship as separate files, but the mirrored track under
 * `public/data/travel/<id>/` DOES ship. Run `scripts/sanitize-trip-gps.py` on
 * the trip folder before pointing the page at it (2026-09-26 user privacy
 * rule). That public/ file is generated and gitignored — but gitignored is not
 * private: it still reaches the web.
 *
 * To add a trip: create `content/travel/<new-id>/card.json`, add
 * `app/travel/<new-id>/page.tsx` (+ the `/zh` mirror), import the hand-written
 * JSONs in TravelLog, and — if the GPS track is too big to inline — add its
 * `<new-id>/track.json` line to the `MIRRORED` list in
 * `scripts/sync-trip-data.mjs`. The trip folder is flat; "needs a URL" is
 * declared in that script, not by a `data/` subfolder (removed 2026-10-17).
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
  /**
   * Pin the tile to the front of the /travel flow. Default **false**
   * (2026-10-17): a new trip slots into the photo timeline at its own date,
   * which is what a chronological wall should do. Only a trip whose page is a
   * destination in its own right earns the pin.
   */
  pinned?: boolean;
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
