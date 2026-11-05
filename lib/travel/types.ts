// Travel domain model (roadmap §8). GeoJSON conversion happens only at the
// map boundary — this layer is the canonical application representation.

export interface TrackPoint {
  /** ISO-8601 with explicit trip timezone offset, e.g. 2025-06-18T14:37:00+09:00 */
  t: string;
  lon: number;
  lat: number;
  spd?: number;
  /**
   * kind of the link starting at this point (preprocess_gps.py classification):
   * - "ground": continuous recording, normal surface movement
   * - "air": flight — rendered as a geodesic arc (points along it are densified)
   * - "gap": recording hole with real displacement (tunnel etc.) — dotted connector
   */
  k?: "ground" | "air" | "gap";
  /** epoch ms, derived at load time */
  ts: number;
}

/** contiguous run of points — broken by GPS discontinuities/jumps */
export interface TrackSegment {
  startIndex: number;
  endIndex: number;
}

export interface TripDay {
  date: string;
  label: string;
  startIndex: number;
  endIndex: number;
  bounds: Bounds;
  distanceM: number;
  flightM?: number; // air-run mileage attributed to this day (departure-day rule)
}

export type Bounds = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

export interface TripInfo {
  tripId: string;
  title: string;
  timezone: string;
  start: string;
  end: string;
  days: TripDay[];
  bounds: Bounds;
  stats: { points: number; distanceKm: number; segments: number };
}

export interface TripTrack {
  tripId: string;
  timezone: string;
  startTime: string;
  endTime: string;
  points: TrackPoint[];
  segments: TrackSegment[];
  days: TripDay[];
  bounds: Bounds;
}

export interface SceneAttraction {
  name: string;
  match: string;
  anchor?: string;
  excerpt?: string;
  body?: string;
  visited?: boolean;
}

/** hand-curated POI for the attraction layer (plan B): a pure context marker,
 *  drawn (dot + label) only on the narrative day matching the active pane.
 *  v16 (2026-10-07 user request): the click-to-expand review popup is gone —
 *  the dots are not interactive any more. */
export interface Attraction {
  id: string;
  name: string;
  lon: number;
  lat: number;
  /** narrative day number (matches TravelScene.dayNo, Day0-based) */
  dayNo: number;
  /** curated metadata, still kept in attractions.json but no longer rendered
   *  anywhere (the popup that consumed them was removed) */
  rating?: number;
  tags?: string[];
  excerpt?: string;
  /**
   * false = planned but never entered (journal: 放弃 / 售罄 / 装修) — the map
   * draws it as a hollow dot and the legend documents it as "planned only".
   * Omitted or true = actually visited.
   */
  visited?: boolean;
}

export interface TravelScene {
  id: string;
  day: string;
  segment: string;
  title: string;
  startTime: string;
  endTime: string;
  confidence: string;
  city?: string | null;
  /** journal day number (Day0-based), when the journal numbers days */
  dayNo?: number;
  /** journal heading of the day (rendered under the day header) */
  dayTitle?: string;
  /** structural unit (ptes-style day model): title | morning | afternoon | evening | transit */
  unit?: "title" | "morning" | "afternoon" | "evening" | "transit";
  /** day-level journal text that could not be confidently split */
  titleBody?: string | null;
  /** journal narrative, attached to the first scene of each day */
  body?: string;
  attractions: SceneAttraction[];
  gpsPointCount: number;
  gps?: {
    bounds: Bounds;
    center: [number, number];
    /** first GPS fix of the unit — day titles focus here */
    start?: [number, number];
    distanceM: number;
    firstT: string;
    lastT: string;
  } | null;
}
