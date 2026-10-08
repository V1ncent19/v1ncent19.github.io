import type { Bounds, TrackPoint } from "./types";

/** Binary search: index i such that points[i].ts <= t < points[i+1].ts.
 *  Returns clamped indices at both ends. */
export function indexAtTime(points: TrackPoint[], t: number): number {
  const n = points.length;
  if (n === 0) return -1;
  if (t <= points[0].ts) return 0;
  if (t >= points[n - 1].ts) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].ts <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

const STAY_HOLD_MS = 15 * 60_000; // gaps longer than this...
const STAY_DRIFT_M = 1_000; // ...with less drift are stationary stays (sleep, meals)
const HOLD_FRACTION = 0.9; // pin the marker, ease to the next fix over the tail

function haversineM(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number }
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Interpolated position at time t (epoch ms). */
export function interpolatePosition(
  points: TrackPoint[],
  t: number
): { lon: number; lat: number; idx: number } {
  const i = indexAtTime(points, t);
  if (i < 0) return { lon: 0, lat: 0, idx: 0 };
  const a = points[i];
  const b = points[Math.min(i + 1, points.length - 1)];
  if (b === a || b.ts === a.ts) return { lon: a.lon, lat: a.lat, idx: i };
  let f = Math.min(1, Math.max(0, (t - a.ts) / (b.ts - a.ts)));
  // overnight / meal stays: the phone records nothing, both fixes sit at the
  // same place — pin the marker instead of letting it linearly drift through
  // GPS noise while narrative time crosses the gap.
  if (b.ts - a.ts >= STAY_HOLD_MS && haversineM(a, b) < STAY_DRIFT_M) {
    f = f < HOLD_FRACTION ? 0 : (f - HOLD_FRACTION) / (1 - HOLD_FRACTION);
  }
  return {
    lon: a.lon + f * (b.lon - a.lon),
    lat: a.lat + f * (b.lat - a.lat),
    idx: i,
  };
}

/** Interpolate between two bounds (used for smooth scene transitions). */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function padBounds(b: Bounds, ratio = 0.12): Bounds {
  const dLon = (b[2] - b[0]) * ratio || 0.01;
  const dLat = (b[3] - b[1]) * ratio || 0.01;
  return [b[0] - dLon, b[1] - dLat, b[2] + dLon, b[3] + dLat];
}

/** Format epoch ms in the trip narrative timezone (Asia/Tokyo). */
const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
export function formatNarrativeTime(t: number): string {
  return fmt.format(new Date(t));
}

/** Local HH:MM at time t, taken from the nearest track point's ISO string
 *  (which carries the correct per-point offset — multi-timezone trips). */
export function localClockAt(points: TrackPoint[], t: number): string {
  const i = indexAtTime(points, t);
  return i >= 0 ? points[i].t.slice(11, 16) : "";
}
