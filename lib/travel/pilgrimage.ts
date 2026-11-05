// Pilgrimage page domain model (Just Because! @ 藤泽, 2026-09-21).
//
// Deliberately separate from lib/travel/types.ts: the trip log's model is
// built around a time-interpolated narrative track (scenes with start/end
// times that the camera scrubs through), whereas this page only needs an
// ordered list of stops plus one fixed-scale polyline. Sharing the trip log's
// types would drag in a pile of fields the page never reads.
//
// The rendered source of truth is content/travel/just-because/page.json, produced
// by scripts/pilgrimage-map.mjs.

/**
 * Sentinel stop ids for the two text-only chapters.
 *
 * The cover ("overview") and the send-off ("finale") are chapters in their own
 * right, sitting at the two ends of the ride, so they take part in the reading
 * observer exactly like a photo stop does — the map then has somewhere concrete
 * to put the route's head for them instead of freezing it at the neighbouring
 * photo. They live here (not in a component) because BOTH the story column
 * (which tags the DOM nodes) and the map (which resolves them to a route
 * position) need the same strings.
 *
 * The underscores keep them from ever colliding with a composite id, which is
 * always derived from a phone filename (`img-2748`).
 */
export const CHAPTER_START = "__overview__";
export const CHAPTER_END = "__finale__";

/** One published stop: a hand-made composite plus where/when it was taken. */
export interface PilgrimageStop {
  /** composite id, e.g. "img-2748" (matches the webp filename stem) */
  id: string;
  /** site-rooted path to the shipped composite */
  src: string;
  /**
   * Intrinsic pixel size of the composite.
   *
   * Not decoration — the composites are NOT uniformly shaped. Every one is
   * 1920×2160 except `img-2853` (the 正片海报复刻, 1121×2160) and `img-2748`
   * (1748×2160). The story column reserves the <img>'s box from these numbers
   * before the bytes arrive, and an aspect ratio that is merely *typical*
   * crops the odd ones out (that one lost its top and bottom).
   */
  imgW: number;
  imgH: number;
  lat: number;
  lon: number;
  /** "HH:MM" in the trip's own timezone */
  time: string;
  /** full ISO-8601 with offset */
  shotAt: string;
  /**
   * Index into `route.coordinates` where this photo was taken.
   *
   * Precomputed by scripts/pilgrimage-map.mjs by matching the photo's time
   * against the route's per-vertex `offsets`, NOT by nearest coordinate — the
   * loop passes 藤沢駅 twice, so a spatial match is ambiguous and comes out
   * non-monotonic (the bright line would visibly retract mid-scroll).
   */
  routeIdx: number;
  /** seconds between the anchor vertex's offset and the photo's own time
   *  (large = the rider was standing still; expected, not an error) */
  routeDtSec: number | null;
  /** nearest anitabi pilgrimage point, when one is close enough to claim */
  anitabi: {
    id: string;
    name: string;
    nameCn: string;
    ep: number | null;
    /** seconds into the episode, as recorded by anitabi */
    s: number | null;
    /** metres between the photo and the point — a confidence signal */
    distM: number;
  } | null;
  /** hand-authored caption; empty until the owner writes one */
  note: string;
}

/** The sanitized track. [lon, lat] pairs, GeoJSON order. */
export interface PilgrimageRoute {
  date: string;
  startedAtLocal: string;
  endedAtLocal: string;
  durationSec: number;
  pointCount: number;
  coordinates: [number, number][];
  /** seconds since start, index-aligned with `coordinates` */
  offsets: number[];
}

export interface PilgrimageAttribution {
  text: string;
  href: string;
  license: string;
  basemap: string;
}

/** A block of prose the owner interleaves between stops (optional). */
export interface PilgrimageInterlude {
  /** insert this block immediately BEFORE the stop with this id */
  before: string;
  text: string;
}

export interface PilgrimageData {
  title: string;
  subtitle: string;
  /** trip overview shown on the opening screen (owner-authored) */
  overview: { text: string };
  /** closing note (owner-authored) */
  outro: { title: string; text: string };
  attribution: PilgrimageAttribution;
  route: PilgrimageRoute;
  stops: PilgrimageStop[];
  /** optional prose blocks woven between stops */
  interludes?: PilgrimageInterlude[];
}
