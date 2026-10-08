/**
 * Travel hub registry (2026-09-25). Hand-written display metadata for the
 * /travel hub cards — the heavy per-trip data (track/scenes/trip JSON) stays
 * in public/data/travel/<id>/ and is fetched client-side by TravelLog; only
 * these summary fields are baked into the hub at build time. IMPORTANT: any
 * data placed in public/ ships to the web — run
 * scripts/sanitize-trip-gps.py on every trip folder first so the raw
 * home-area GPS head/tail never deploys (2026-09-26 user privacy rule).
 * When a new trip is added (lab pipeline → sanitize → public/data/travel/<id>),
 * add a row here and an app/travel/<id>/page.tsx (+ zh mirror).
 */

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
   * Hub-card place chips (2026-09-26 "H+J" card enrichment) — display-only,
   * hand-curated; last entry conventionally summarizes the smaller stops.
   */
  stops?: { en: string[]; zh: string[] };
  /**
   * Optional hub-card cover photo (a gallery thumb URL, ideally landscape).
   * Shown as the right-hand / top image on the /travel hub card. Point it at
   * one of the trip's own photos in content/gallery/items.json.
   */
  cover?: string;
}

export const tripCards: TripCard[] = [
  {
    id: "ptes-2025",
    title: {
      en: "Iberia 2025 — Portugal · Spain · Christmas",
      zh: "伊比利亚 2025 — 葡萄牙 · 西班牙 · 圣诞",
    },
    blurb: {
      en: "Two weeks over Christmas and New Year: Lisbon, Porto, Madrid, Barcelona and the towns between — the route grows as the story scrolls.",
      zh: "圣诞与新年的两周：里斯本、波尔图、马德里、巴塞罗那与沿途小城——轨迹随故事滚动而生长。",
    },
    start: "2025-12-15",
    end: "2026-01-01",
    /* 17 = tracked days after GPS sanitization: the raw track's 18th day
       (2026-01-01) was a single at-home arrival ping, trimmed by
       scripts/sanitize-trip-gps.py — the trip page intro derives its number
       from trip.days.length, so this card must match. */
    days: 17,
    distanceKm: 18039.7,
    /* Post-sanitization count (scripts/sanitize-trip-gps.py, 2026-09-26):
       the raw track's head/tail dwell within 3 km of home is trimmed before
       deploy — the public folder only ever carries the trip's own GPS. */
    gpsPoints: 21863,
    beta: true,
    stops: {
      en: ["Lisbon", "Porto", "Madrid", "Barcelona", "+6 towns"],
      zh: ["里斯本", "波尔图", "马德里", "巴塞罗那", "+6 小城"],
    },
    // Porto riverside, 2025-12-16 (landscape) — from the trip's own photos.
    cover: "/assets/gallery/thumb/img-5489.webp",
  },
  // japan-2025 raw data was moved OUT of public/ to assets-src/travel-data/
  // (2026-09-26 user privacy decision: nothing unpublished ships GPS). To
  // publish: run scripts/sanitize-trip-gps.py on it, copy to
  // public/data/travel/japan-2025, add a card row here + page (+ zh mirror).
];
