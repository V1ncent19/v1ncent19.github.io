"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Map as MLMap, GeoJSONSource, MapMouseEvent, Point } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PilgrimageStop, PilgrimageRoute, PilgrimageAttribution } from "@/lib/travel/pilgrimage";
import { CHAPTER_END, CHAPTER_START } from "@/lib/travel/pilgrimage";
import {
  applyTheme,
  getThemeSnapshot,
  subscribeTheme,
  THEME_SERVER_SNAPSHOT,
} from "@/lib/theme";
import type { Theme } from "@/lib/site";
import { MAP_SPLIT, useMapSplit } from "@/lib/travel/map-split";

/**
 * Pilgrimage map — one map, zoom and pan enabled, auto-follow while reading.
 *
 * The camera model, and why it changed (2026-10-17):
 *
 *   • A FIXED, un-zoomable scale was the original design, and it fails on the
 *     points that matter. Thirty-six composites sit inside a 17.7 km loop, and
 *     several clusters are metres apart: at the fitted scale img-2846 and
 *     img-2848 are 1.2 px apart, i.e. the SAME PIXEL on a 390 px-wide map.
 *     Tapping such a cluster cannot resolve which stop was meant — measured,
 *     `queryRenderedFeatures` returns both and the nearest-dot tie-break picks
 *     whatever happens to be a hair closer. That is not a bug to fix in the
 *     click handler; it is a scale where the information does not exist.
 *     At zoom 18 the minimum separation across all 36 stops is 17.5 px —
 *     above the 14 px hit radius — so the dots finally become distinct.
 *
 *   • So the map keeps its resting state (the whole loop framed, which is the
 *     opening composition the page wants) but the reader can now pinch/drag
 *     in. Nothing about the trace's meaning changes; you just get closer.
 *
 *   • Following is ON by default: while the reader scrolls the story column
 *     the camera eases to the stop being read, at a zoom where the dots are
 *     separable. Turning it off leaves the camera wherever the reader dragged
 *     it — no forced re-framing, because now there is a way back (drag/pinch).
 *
 * Differences from the trip log's TravelMap, all deliberate:
 *   • the trace "grows": a dim full-route line sits underneath, and a bright
 *     line up to the CURRENT photo's position is drawn on top of it.
 *   • a traveller cursor slides between stops instead of teleporting, so the
 *     dot the reader watches always matches the stretch of line that is blue.
 *   • stops are persistent dots (never re-created per frame), so they can be
 *     clicked at any time.
 *   • the popup is a plain React card positioned over the stop, not a
 *     MapLibre popup — that keeps the composite image and the caption in the
 *     normal DOM, so they inherit the page's typography (and can be frosted).
 */

const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** localStorage key for the camera mode. Changed from a 0/1 follow flag to
 *  the mode string itself on 2026-10-17: `overview` is now the DEFAULT and
 *  must be remembered like the others, which a boolean cannot express. Old
 *  values ("0"/"1") still parse — see `readCameraMode`. */
const FOLLOW_KEY = "pilgrimage-camera-mode";

/** See the `cameraMode` state in PilgrimageMap. */
type CameraMode = "follow" | "overview" | "manual";

/** The mode the page boots into when the reader has no stored preference.
 *  "follow" (2026-10-24 user decision, reversed from the 2026-10-17
 *  "overview" pick): entering the page should already track the stop being
 *  read, so the map and the text column agree without a click. 全 is still
 *  one tap away, and anything the reader picks is remembered — this only
 *  governs the FIRST visit on a device. */
const DEFAULT_CAMERA_MODE: CameraMode = "follow";

/** Parse the stored mode, tolerating the old boolean flag ("1" = follow,
 *  "0" = manual — "0" meant "the reader moved the camera themselves"). */
function readCameraMode(): CameraMode {
  if (typeof window === "undefined") return DEFAULT_CAMERA_MODE;
  try {
    const v = window.localStorage.getItem(FOLLOW_KEY);
    if (v === "follow" || v === "overview" || v === "manual") return v;
    if (v === "1") return "follow";
    if (v === "0") return "manual";
    return DEFAULT_CAMERA_MODE;
  } catch {
    return DEFAULT_CAMERA_MODE;
  }
}

/** Persist the mode. Best-effort: a private-mode localStorage throws. */
function storeCameraMode(mode: CameraMode) {
  try {
    window.localStorage.setItem(FOLLOW_KEY, mode);
  } catch {
    /* ignore */
  }
}

/*
 * Camera mode lives in a module-level store rather than in useState.
 *
 * Why (2026-10-17): the static export prerenders in Node, where localStorage
 * does not exist, so the HTML always says "overview". Seeding useState from
 * localStorage made the toolbar disagree with that HTML on hydration — and
 * React does NOT patch attribute mismatches, so a reader whose stored mode was
 * "follow" got 全 highlighted (wrong pill, wrong aria-pressed) until they
 * clicked something. `useSyncExternalStore` renders the server value during
 * hydration, then switches to the stored one in a normal post-hydration
 * update, which React can apply.
 */
const cameraListeners = new Set<() => void>();
let cameraSnapshot: CameraMode | null = null;

function subscribeCameraMode(onChange: () => void): () => void {
  cameraListeners.add(onChange);
  return () => {
    cameraListeners.delete(onChange);
  };
}

function getCameraSnapshot(): CameraMode {
  if (cameraSnapshot === null) cameraSnapshot = readCameraMode();
  return cameraSnapshot;
}

const getCameraServerSnapshot = (): CameraMode => DEFAULT_CAMERA_MODE;

/** Set + persist + notify. Replaces the old setState, so every caller writes
 *  through the same path and the toolbar can never disagree with storage. */
function applyCameraMode(mode: CameraMode): void {
  const changed = cameraSnapshot !== mode;
  cameraSnapshot = mode;
  storeCameraMode(mode);
  if (changed) for (const cb of cameraListeners) cb();
}

/** Padding (px) kept clear around the route when fitting it to the viewport.
 *  The bottom is larger to leave room for the attribution strip. */
const FIT_PADDING = { top: 56, bottom: 72, left: 48, right: 48 };

/** How long the traveller cursor takes to slide from one stop to the next.
 *  Long enough to read as movement, short enough that a fast scroll never
 *  leaves the dot lagging behind the line. */
const CURSOR_MS = 420;

/** How far the follow camera pushes in beyond the overview framing, in zoom
 *  levels, PER VIEWPORT CLASS.
 *
 *  The number is chosen for SEPARABILITY — the minimum pixel distance between
 *  any two of the 36 dots — and that distance depends on how many pixels of
 *  map there are, not on the zoom alone. Measured over the whole set:
 *
 *    fitted scale      min separation        (mobile 390 px / desktop 662 px)
 *    zoom 12.2 (phone)     0.6 px
 *    zoom 13.2 (desktop)   1.2 px
 *
 *  and the hit radius is 14 px, so at the fitted scale several pairs are a
 *  single target — tapping them cannot resolve which stop was meant. That is
 *  why zoom exists now at all.
 *
 *  +5 on a phone (12.2 → 17.2) yields the first framing with zero collisions
 *  and ~7 stops on screen: close enough to read the streets, wide enough to
 *  keep the thread of the loop. A desktop column is 662×900, i.e. 2.6× the
 *  area of the phone band, so the same +5 lands at 18.2 where Positron has
 *  stopped drawing street names and most of the frame is empty paper around a
 *  handful of blocks. +4 (→ 17.2, the same zoom the phone uses) keeps the same
 *  visual density and still clears the hit radius by a factor of ~2.
 *
 *  2026-10-17 user feedback — "跟随模式的镜头稍微有点近了，往回退 1/2 吧": the
 *  push-in is now HALF of the values the paragraph above argues for (+2 wide,
 *  +2.5 narrow). Checked against the closest pair of dots (img-2846 /
 *  img-2848, 8.5 m apart): at zoom 14.2 / 16.7 those two are 641 px / 565 px
 *  apart, i.e. the framing is still nowhere near merging them. */
const FOLLOW_ZOOM_DELTA_WIDE = 2;
const FOLLOW_ZOOM_DELTA_NARROW = 2.5;

/** Never push in past this even if the fitted zoom is unusually low (a very
 *  large viewport). Past ~19 the basemap has nothing left to draw. */
const FOLLOW_MAX_ZOOM = 19;

/** Zoom the reader may pinch out to: the fitted overview. Going further is
 *  allowed by MapLibre but leaves the loop as a speck. */
const MIN_ZOOM = 10;

/** Size of the popup card, in px. Deliberately small — it is a thumbnail
 *  pointer at the pin, not a reader: the full composite and its caption live
 *  in the story column, and the time plate already names the stop. The
 *  previous 300 × ~248 card covered a third of the map. This one is ~1/10 of
 *  that area. Keep POPUP_W in sync with `.pj-popup { width }` in globals.css,
 *  and POPUP_H with the rendered height (image + border) — the placement
 *  maths uses it to decide whether to flip above or below the dot. */
const POPUP_W = 80;
const POPUP_H = 104;

/** Colour ramp for the line, pulled from the site palette. A single hue keeps
 *  the map calm — the bright/dim contrast carries the progress, not colour. */
const ACCENT = "#1ba7c9";
const ACCENT_DARK = "#3ccfff";
/** The not-yet-visited part of the route. Kept clearly visible against the
 *  Positron basemap (a hairline dashed line disappears into the map's own
 *  gray roads at this scale — it needs both weight and contrast). */
const TRAIL_LIGHT = "#8ba3b0";
const TRAIL_DARK = "#5d7280";
/** Stops that actually have a composite — i.e. every published stop. Orange,
 *  on purpose: the trace itself is one blue hue (ACCENT for the visited part,
 *  TRAIL_* for the rest), so blue dots sat inside blue linework and the map
 *  read as "a line with some bumps". Orange is the one hue on this palette
 *  that nothing else uses, so a stop is visible at a glance WITHOUT being
 *  mistaken for progress. Kept darker in light mode than in dark mode so it
 *  still clears the pale Positron paper. */
const STOP_LIGHT = "#e8722c";
const STOP_DARK = "#ff9f4d";

const THEME_OPTIONS: { id: Theme; label: string; icon: string }[] = [
  { id: "system", label: "跟随系统明暗", icon: "自" },
  { id: "light", label: "浅色模式", icon: "昼" },
  { id: "dark", label: "深色模式", icon: "夜" },
];

interface Props {
  stops: PilgrimageStop[];
  route: PilgrimageRoute;
  /** which stop is currently being read; null while on the overview/finale */
  activeStopId: string | null;
  /** stop whose popup is open; controlled by the parent so the story column
   *  and the map always agree on what is showing */
  openStopId: string | null;
  onOpenStop: (id: string | null) => void;
  /** the reader clicked a dot: take them to that stop in the story column */
  onNavigateToStop: (id: string) => void;
  /** CC BY-NC-SA 4.0 credit for the pilgrimage point data (required). */
  attribution: PilgrimageAttribution;
  isDark: boolean;
  /** Page language, used to localise maplibre's OWN UI strings — currently
   *  the cooperative-gesture hint. Optional; anything other than "zh" falls
   *  through to maplibre's built-in English table. */
  lang?: "en" | "zh";
  /** Fired once the style is loaded and the initial framing has been applied.
   *  The entry curtain (body.pj-boot) waits on this so it never retracts onto
   *  a grey half-painted canvas — same gate the trip log uses. */
  onMapReady?: () => void;
}

/** Seconds from the route's first sample to a stop's photo, i.e. the value to
 *  feed fracAtOffset. Derived from `shotAt`, NOT from `routeDtSec`: the latter
 *  is signed (a photo taken while stationary can predate its nearest-vertex
 *  anchor) and would send the cursor backwards mid-scroll.
 *
 *  `startedAtLocal` is "YYYY-MM-DD HH:MM:SS" in the trip's own timezone, while
 *  `shotAt` is full ISO with offset. The date part is shared, so appending the
 *  offset the data already carries makes both absolute instants comparable
 *  without this file needing to know the timezone (JST, +09:00, which is what
 *  scripts/pilgrimage-route.mjs crops with). If the formats ever stop lining
 *  up, the subtraction yields NaN and the callers fall back to `routeIdx` —
 *  the old behaviour, not a broken map. */
function routeOffsetOf(route: PilgrimageRoute, shotAt: string): number | null {
  const m = /([+-]\d{2}:\d{2})$/.exec(shotAt) ?? /(Z)$/.exec(shotAt);
  if (!m) return null;
  const start = Date.parse(route.startedAtLocal.replace(" ", "T") + (m[1] === "Z" ? "Z" : m[1]));
  const shot = Date.parse(shotAt);
  if (!Number.isFinite(start) || !Number.isFinite(shot)) return null;
  return (shot - start) / 1000;
}

/** Metres per second the rider was covering at `offsetsSec`, read straight off
 *  the track (central difference over ±SNAP_HEAD_S seconds). Used to tell
 *  "parked, shooting" from "passing through at speed" — see stopFrac. */
function speedAt(route: PilgrimageRoute, proj: Projected[], offsetsSec: number | null): number {
  const at = (t: number) => {
    const f = fracAtOffset(route, t);
    if (f == null) return 0;
    const i = Math.max(0, Math.min(proj.length - 2, Math.floor(f)));
    return proj[i].s + (proj[i + 1].s - proj[i].s) * (f - i);
  };
  if (offsetsSec == null) return 0;
  const h = SNAP_HEAD_S;
  return (at(offsetsSec + h) - at(offsetsSec - h)) / (2 * h);
}

/** The fractional vertex a stop sits at — the single answer both the traveller
 *  cursor and the bright line's end are drawn from.
 *
 *  Three candidate answers, and the choice between them is a PRINCIPLE, not a
 *  tuning knob:
 *
 *    1. where the photo's own fix projects onto the line, if the clock agrees;
 *    2. otherwise where the clock says the rider was;
 *    3. never behind the previous stop.
 *
 *  (1) alone is the obvious answer and it is visibly wrong. The photos come in
 *  bursts — seven composites inside one minute at 08:32–08:33, 15 m apart —
 *  while the track is sampled every ~61 m of riding. A burst therefore has no
 *  room to move along the line: every photo in it lands on the same point, and
 *  the cursor sits still while the story advances, then teleports. Scrolling
 *  the other way it runs backwards. That is a WORSE reading than a small
 *  lateral offset, because the offset is invisible at the follow zoom while
 *  the stutter is not.
 *
 *  So: if the rider was effectively parked (a photo session — GPS under
 *  SNAP_PARK_KMH), the fix is the better position; the pause is real and the
 *  dot should hold still. If they were moving, the clock is the better
 *  position — the photo happened somewhere between two samples, and time is
 *  what we actually know. Either way the answer is clamped to the window
 *  around the clock estimate, so a fix that disagrees by more than ~60 m (or
 *  belongs to the other pass of 藤沢駅) cannot drag the cursor off.
 *
 *  Monotonicity is enforced by the caller, which owns "previous stop". */
function stopFrac(
  route: PilgrimageRoute,
  proj: Projected[] | null,
  stop: PilgrimageStop,
  floor: number,
): number {
  const byTime = fracAtOffset(route, routeOffsetOf(route, stop.shotAt));
  const guess = byTime ?? stop.routeIdx;
  if (!proj) return Math.max(floor, guess);
  const snap = snapToRoute(route, proj, stop.lon, stop.lat, guess, SNAP_WINDOW);
  const parked = Math.abs(speedAt(route, proj, routeOffsetOf(route, stop.shotAt))) * 3.6 < SNAP_PARK_KMH;
  const useFix = parked && Math.abs(snap.frac - guess) <= SNAP_MAX_VERTICES;
  return Math.max(floor, useFix ? snap.frac : guess);
}

/** A polyline vertex in local metres relative to a reference point, plus the
 *  arc length from the start of the line up to it. */
interface Projected {
  /** [x, y] in metres east / north of the reference */
  xy: [number, number];
  /** metres along the line at this vertex */
  s: number;
}

/** Metres per degree at this latitude — good to a few centimetres over a
 *  20 km loop, and constant enough that straightness in this frame is
 *  straightness on the ground. */
const M_PER_DEG_LAT = 110_574;
function mPerDegLon(lat: number) {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

/**
 * Project the whole route into metres ONCE. Two things need it and both used
 * to be done in the wrong space:
 *
 *   • the stop → route snap (nearest point ON the line, not nearest vertex);
 *   • the cursor glide (constant ground speed, not constant index speed).
 *
 * Everything is a plain 2-D problem at this scale, so plain 2-D maths is the
 * honest tool. Longitude is scaled by cos(latitude), which is what makes a
 * metre east a metre north — without it, "straight" on this map is a different
 * line from the one drawn, and nearest-point is off by up to ~20 %.
 */
function projectRoute(route: PilgrimageRoute): Projected[] | null {
  const coords = route.coordinates;
  if (coords.length < 2) return null;
  const lon0 = coords[0][0];
  const lat0 = coords[0][1];
  const kx = mPerDegLon(lat0);
  const ky = M_PER_DEG_LAT;
  let s = 0;
  const out: Projected[] = [];
  for (let i = 0; i < coords.length; i++) {
    const xy: [number, number] = [(coords[i][0] - lon0) * kx, (coords[i][1] - lat0) * ky];
    if (i > 0) {
      const p = out[i - 1].xy;
      s += Math.hypot(xy[0] - p[0], xy[1] - p[1]);
    }
    out.push({ xy, s });
  }
  return out;
}

/** Nearest point on the polyline to (lon, lat), as a continuous vertex index,
 *  searching only the segments around `guess` (see stopFrac).
 *
 *  Constrained on purpose. The loop passes 藤沢駅 twice — the same street, the
 *  SAME COORDINATES, 8 km of riding apart — so an unconstrained nearest-point
 *  search happily returns the copy on the other side of the day. The photos
 *  also come in bursts 10–20 m apart, which at 61 m of sampling is inside the
 *  noise: neighbourhoods of 2–4 stops collapse to a single point on the line
 *  no matter how carefully each is projected. The search window keeps every
 *  stop on the correct lap; the exact spot within the window is decided by
 *  the projection, not by the sampling. */
function snapToRoute(
  route: PilgrimageRoute,
  proj: Projected[],
  lon: number,
  lat: number,
  guess: number,
  win: number,
): { frac: number; d: number } {
  const org = route.coordinates[0];
  const px = (lon - org[0]) * mPerDegLon(org[1]);
  const py = (lat - org[1]) * M_PER_DEG_LAT;
  const a = Math.max(0, Math.floor(guess) - win);
  const b = Math.min(proj.length - 2, Math.ceil(guess) + win);
  let best = { d2: Infinity, frac: guess };
  for (let i = a; i <= b; i++) {
    const p = proj[i].xy;
    const q = proj[i + 1].xy;
    const vx = q[0] - p[0];
    const vy = q[1] - p[1];
    const len2 = vx * vx + vy * vy;
    let t = len2 > 0 ? ((px - p[0]) * vx + (py - p[1]) * vy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const dx = p[0] + vx * t - px;
    const dy = p[1] + vy * t - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < best.d2) best = { d2, frac: i + t };
  }
  return { frac: best.frac, d: Math.sqrt(best.d2) };
}

/** How far a stop may be moved from its TIME estimate and still count as
 *  "the same place on the line", in vertices. Sampling is 61 m per step on
 *  average, so ±3 vertices ≈ ±180 m — enough to place a photo exactly across a
 *  stop the rider made, not enough to jump to another street or another lap. */
const SNAP_WINDOW = 3;
/** If the photo's own coordinates lie further than this MANY VERTICES from the
 *  time estimate, the two disagree about where the rider was; trust the clock
 *  (progress) over the fix (position) and leave the cursor where time puts it.
 *  A vertex is roughly 60 m here, so 1.0 ≈ 60 m of tolerated GPS disagreement. */
const SNAP_MAX_VERTICES = 1;
/** "Parked" threshold for a photo session, in km/h. On this ride the apparent
 *  speed at a photo is either 0.4–4 km/h (stopped, phone out) or 10 km/h and
 *  up (shooting from the saddle) — nothing lives in between, so the exact cut
 *  barely matters. */
const SNAP_PARK_KMH = 6;
/** Half-width of the window the speed is measured over, in seconds. Wide
 *  enough to average out the 15–40 s sampling, narrow enough not to smear a
 *  stop into the riding either side of it. */
const SNAP_HEAD_S = 3;

/** Where along the polyline a given "seconds since start" falls, expressed as
 *  a continuous VERTEX index (2.4 = 40 % of the way from vertex 2 to 3).
 *
 *  This is the one conversion the whole "line and dot agree" contract rests
 *  on, and getting it wrong is invisible-ish rather than broken, which is
 *  exactly what it was: the map used to lerp between vertices in INDEX space
 *  while treating the result as seconds. Route vertices are NOT evenly spaced
 *  in time (the rider stops to photograph — img-2802 the GPS sat still for
 *  37 s at one vertex), so index fraction ≠ time fraction, and the bright
 *  line stopped one vertex short of the cursor: measured 30–70 m, i.e. exactly
 *  one sampled step. Interpolating against `offsets` removes the assumption.
 *
 *  Clamped to the sampled range: a photo taken while standing still has
 *  dt beyond the last vertex (or before the first) and must not extrapolate
 *  off the line. */
function fracAtOffset(route: PilgrimageRoute, offsetsSec: number | null | undefined): number | null {
  const { coordinates, offsets } = route;
  if (offsetsSec == null || !Number.isFinite(offsetsSec)) return null;
  if (coordinates.length < 2 || offsets.length !== coordinates.length) return null;
  if (offsetsSec <= offsets[0]) return 0;
  const last = offsets.length - 1;
  if (offsetsSec >= offsets[last]) return last;
  // Binary search for the last vertex at or before `offsetsSec`. The track is
  // monotone by construction (offsets are seconds since start).
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= offsetsSec) lo = mid;
    else hi = mid;
  }
  const span = offsets[hi] - offsets[lo];
  // Duplicate timestamps (two samples in the same second) would divide by
  // zero; the later vertex is the honest answer there.
  return span > 0 ? lo + (offsetsSec - offsets[lo]) / span : hi;
}

/** The point the traveller cursor is drawn at, given a fractional vertex
 *  index (see fracAtOffset). */
function cursorFeature(route: PilgrimageRoute, fracIdx: number) {
  const coords = route.coordinates;
  if (!coords.length) {
    return { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [0, 0] } };
  }
  const clamped = Math.max(0, Math.min(coords.length - 1, fracIdx));
  const i = Math.floor(clamped);
  const t = clamped - i;
  const a = coords[i];
  const b = coords[Math.min(coords.length - 1, i + 1)];
  // Lerp in lon/lat space. Over a few hundred metres that is visually
  // indistinguishable from a geodesic, and it never surprises us at the
  // antimeridian (which this route is nowhere near).
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    },
  };
}

/** Build the GeoJSON for the two route lines. `headFrac` is a FRACTIONAL
 *  vertex index: the bright line is cut between two vertices at that fraction
 *  and its last vertex is the interpolated point, so it terminates exactly
 *  where the cursor sits. Rounding to the nearest vertex instead left the line
 *  and the dot up to half a sampled step apart (30–70 m here), which reads as
 *  the dot floating one "body length" ahead of the blue end. */
function routeFeatures(route: PilgrimageRoute, headFrac: number) {
  const coords = route.coordinates;
  if (coords.length < 2) {
    return { full: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [] } },
             head: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [] } } };
  }
  const n = coords.length;
  const clamped = Math.max(0, Math.min(n - 1, headFrac));
  const i = Math.floor(clamped);
  const t = clamped - i;
  const tip: [number, number] = t < 1e-6
    ? coords[i]
    : [
        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t,
        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t,
      ];
  // A line of fewer than two points is dropped by the renderer, so the head
  // keeps the vertex before the tip even when the tip is at the very start.
  const head = i >= 1 ? coords.slice(0, i).concat([tip]) : [coords[0], tip];
  return {
    full: {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: coords },
    },
    head: {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: head },
    },
  };
}

function stopsFeature(stops: PilgrimageStop[], activeStopId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: stops.map((s) => ({
      type: "Feature" as const,
      // a stable id lets MapLibre diff features across updates instead of
      // tearing the whole source down on every active-stop change
      id: s.id,
      properties: { id: s.id, active: s.id === activeStopId ? 1 : 0 },
      geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
    })),
  };
}

/**
 * Add (or re-add, after a basemap swap) every one of our sources and layers.
 *
 * Extracted because a theme change calls setStyle(), which throws away all of
 * our layers with it — re-declaring them in two places is how the light and
 * dark maps silently drift apart. One definition, called from both paths.
 */
function addLayers(
  m: MLMap,
  route: PilgrimageRoute,
  stops: PilgrimageStop[],
  activeStopId: string | null,
  cursorFrac: number,
  /** fractional vertex index for the bright line — must be the SAME number
   *  the cursor is drawn at, or the two drift apart by up to one step */
  headFrac: number,
  isDark = false,
) {
  // Defensive: a re-add that runs against a style which already has our
  // layers would throw and take the rest of the stack down with it. Cheap to
  // check, and it makes the "swap theme twice quickly" case safe.
  if (m.getSource("pj-route-full")) return;
  if (m.getLayer("pj-cursor")) return;

  const { full, head } = routeFeatures(route, headFrac);

  m.addSource("pj-route-full", { type: "geojson", data: full });
  m.addLayer({
    id: "pj-route-full",
    type: "line",
    source: "pj-route-full",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      // Solid, not dashed: at this zoom the loop folds back on itself in
      // several places and a dashed line reads as noise against the
      // basemap's own gray road network. Weight + colour do the work.
      "line-color": isDark ? TRAIL_DARK : TRAIL_LIGHT,
      "line-width": 3.5,
      "line-opacity": 0.75,
    },
  });

  m.addSource("pj-route-head", { type: "geojson", data: head });
  m.addLayer({
    id: "pj-route-head",
    type: "line",
    source: "pj-route-head",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": isDark ? ACCENT_DARK : ACCENT,
      "line-width": 5,
    },
  });

  m.addSource("pj-stops", { type: "geojson", data: stopsFeature(stops, activeStopId) });
  // HIT TARGET — keep separate from the visible dot.
  //
  // MapLibre hit-tests a layer using its RENDERED radius, and the visible dot
  // is only 3.5 px (6 px active) so that the 16 stops packed into ~1 km around
  // 辻堂/茅崎 stay visually distinct. That made every dot nearly impossible to
  // click: `queryRenderedFeatures` returned nothing 6 px off-centre, i.e. a
  // ~10 px-wide target that a mouse can barely hit and a fingertip cannot hit
  // at all. This transparent layer gives each dot a 14 px radius (28 px across,
  // close to the ~44 px touch guidance) WITHOUT changing how the map looks.
  // It is added BEFORE the dot layers so a click still resolves to "pj-stops"
  // first when the two overlap — the handler listens on `pj-stops`.
  m.addLayer({
    id: "pj-stops-hit",
    type: "circle",
    source: "pj-stops",
    paint: {
      "circle-radius": 14,
      "circle-color": "#000000",
      "circle-opacity": 0,
    },
  });
  // halo under the dot, so an active dot reads at a glance
  m.addLayer({
    id: "pj-stops-halo",
    type: "circle",
    source: "pj-stops",
    paint: {
      "circle-radius": ["case", ["==", ["get", "active"], 1], 12, 0],
      "circle-color": isDark ? STOP_DARK : STOP_LIGHT,
      "circle-opacity": 0.25,
    },
  });
  m.addLayer({
    id: "pj-stops",
    type: "circle",
    source: "pj-stops",
    paint: {
      // Deliberately small. Several stops sit only metres apart (the cluster
      // around 辻堂/茅崎 has 16 composites inside ~1 km), and anything bigger
      // merges them into a single blob. The active one grows so the current
      // stop stays legible even inside a cluster.
      //
      // Fill is ALWAYS the orange stop colour, active or not: on this map the
      // dot marks "a photo was taken here", which does not change when you
      // scroll onto it. What the active state changes is RANK — the dot grows
      // 6 px and gains the halo above — not identity.
      "circle-radius": ["case", ["==", ["get", "active"], 1], 6, 3.5],
      "circle-color": isDark ? STOP_DARK : STOP_LIGHT,
      // Paper-coloured ring so the dot separates from the blue line it sits
      // on (and from a neighbouring dot 3 px away).
      "circle-stroke-width": 1.5,
      "circle-stroke-color": isDark ? "#0e1620" : "#ffffff",
    },
  });

  // The traveller cursor: one point, drawn ON TOP of the dots, that slides
  // along the route as the reader scrolls. Its fill is the "here" indicator —
  // the active dot underneath reads as the stop it belongs to.
  m.addSource("pj-cursor", { type: "geojson", data: cursorFeature(route, cursorFrac) });
  m.addLayer({
    id: "pj-cursor-halo",
    type: "circle",
    source: "pj-cursor",
    paint: {
      "circle-radius": 13,
      "circle-color": isDark ? ACCENT_DARK : ACCENT,
      "circle-opacity": 0.22,
    },
  });
  m.addLayer({
    id: "pj-cursor",
    type: "circle",
    source: "pj-cursor",
    paint: {
      "circle-radius": 6.5,
      "circle-color": isDark ? ACCENT_DARK : ACCENT,
      "circle-stroke-width": 2.5,
      "circle-stroke-color": isDark ? "#0e1620" : "#ffffff",
    },
  });
}

export default function PilgrimageMap({
  stops,
  route,
  activeStopId,
  openStopId,
  onOpenStop,
  onNavigateToStop,
  attribution,
  isDark,
  lang = "en",
  onMapReady,
}: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  /** Draggable map/story split (mobile only). Writes --pj-map-h on the column;
   *  the strip at the map's bottom edge is the handle. See lib/travel/map-split. */
  const { mountColumn, renderHandle } = useMapSplit(
    MAP_SPLIT.pilgrimage.storageKey,
    MAP_SPLIT.pilgrimage.cssVar,
    MAP_SPLIT.pilgrimage.defaultVh,
  );
  /** Keeps the canvas matched to its container as the layout settles. */
  const roRef = useRef<ResizeObserver | null>(null);
  /** The zoom produced by the one-time fitBounds. Every later camera move
   *  (follow, popup repositioning) reuses it, which is what keeps the scale
   *  fixed for the whole page. */
  const fittedZoomRef = useRef<number | null>(null);
  /** False while "the whole loop in frame" is still the correct camera, which
   *  is the state the map boots into. Flipped to true as soon as the reader
   *  pans/zooms or the follow camera centres on a stop — after that a viewport
   *  resize must only resize the canvas, never re-fit (see the ResizeObserver
   *  in the load handler). */
  const cameraOwnedRef = useRef(false);
  /** Which theme the CURRENT map style represents. The style-swap effect must
   *  not run on mount (that would re-add every layer on top of the ones the
   *  load handler already added), so it compares against this. */
  const initialStyleDoneRef = useRef<boolean | null>(null);
  const [ready, setReady] = useState(false);
  /**
   * Camera mode — ONE explicit tri-state, because the old model (a `follow`
   * boolean plus a `userMovedRef` flag that the follow effect consumed and
   * reset) lost its own decision the moment the page scrolled:
   *
   *   "全" → reframe to the whole loop, `follow` stays true.
   *   scroll → next stop changes → follow effect runs → camera dives back in.
   *
   * It also meant the 随/全 pill could never show 全 as selected: "not
   * following" and "looking at the whole loop" were different concepts and
   * only the first one had a button.
   *
   *   "follow"   — the camera tracks the stop being read (default).
   *   "overview" — the whole route; scrolling does NOT re-acquire. Any manual
   *                pan/zoom turns this into "manual". THIS IS THE DEFAULT
   *                (2026-10-17 user pick: "默认地图模式是全局").
   *   "manual"   — the reader dragged/zoomed; the camera stays put. This is
   *                what ptes does implicitly, and it is why dragging the map
   *                no longer gets yanked back on the next scroll.
   *
   * ALL THREE are persisted now, including "overview" (which used to be a
   * transient view): with overview as the default, remembering "the reader
   * last chose overview" and "the reader has never chosen anything" are the
   * same rendering but not the same fact — an explicit choice should survive a
   * reload just like 随 does. SSR has no window, so the server snapshot is the
   * default and hydration is unaffected (the map is created in an effect,
   * long after mount). */
  const cameraMode = useSyncExternalStore(
    subscribeCameraMode,
    getCameraSnapshot,
    getCameraServerSnapshot,
  );
  /** Read inside event handlers and the follow effect (never during render),
   *  so the mode is available without re-subscribing map listeners on every
   *  change. */
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);
  /** The active-stop change we last eased the camera to, so a re-render with
   *  the same active stop does not re-trigger a pan. */
  const lastFollowedRef = useRef<string | null>(null);

  /** The site theme mode (自/昼/夜), shared with the header toggle.
   *
   *  Read through an external store, NOT `useState(() => readTheme())`: the
   *  static HTML is prerendered in Node where storage does not exist, so it
   *  always ships "system". Seeding state from localStorage made the hydrating
   *  render disagree with that HTML, and React never patches attribute
   *  mismatches — a reader on a stored "light" mode saw 自 lit until the next
   *  click. The store renders the server value first, then the applied one. */
  const themeMode = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => THEME_SERVER_SNAPSHOT,
  );

  const openStop = useMemo(
    () => stops.find((s) => s.id === openStopId) ?? null,
    [stops, openStopId],
  );
  const activeStop = useMemo(
    () => stops.find((s) => s.id === activeStopId) ?? null,
    [stops, activeStopId],
  );

  /* ------------------------------------------------------- cursor position */

  /** Fractional VERTEX index the cursor is currently drawn at. Held in a ref
   *  (not state) because the animation writes to it every frame — putting it
   *  in state would re-render the whole component 60 times a second.
   *  Already converted out of the seconds domain: see fracAtOffset. */
  const cursorFracRef = useRef(0);
  /** Where the cursor is heading, so a mid-flight retarget works. */
  const cursorTargetRef = useRef(0);
  const cursorRafRef = useRef<number | null>(null);
  /** The route index the cursor starts from on the very first paint. */
  const cursorStartRef = useRef<number | null>(null);
  /** Route index the bright line currently ends at. Mirrored in a ref so a
   *  style swap can rebuild the layers at exactly the same progress instead of
   *  guessing. It retreats freely — see the head effect below. */
  const headIdxRef = useRef(0);
  /** The route projected into local metres, computed once per route. Both the
   *  stop snap and the glide read it; null until the first project. */
  const routeProjRef = useRef<Projected[] | null>(null);
  if (routeProjRef.current === null) routeProjRef.current = projectRoute(route);
  /** Stops in READING order (== shooting order), so "the previous stop" is
   *  well defined when enforcing that the cursor never runs backwards. */
  const orderedStops = useMemo(() => [...stops].sort((a, b) => a.routeIdx - b.routeIdx), [stops]);
  /** The fraction each stop resolved to, so a later stop can never be clamped
   *  to something behind an earlier one that has already been visited. */
  const lastFracRef = useRef(new Map<string, number>());

  /**
   * Latest click callbacks, kept in refs.
   *
   * The map is created once (mount-only effect), but the props it must call
   * change on every render — `openStopId` in particular. Reading them through
   * the closure would freeze them at their mount-time values (openStopId is
   * always null then), so the "clicking the dot that is already open should
   * not re-scroll" guard would never fire. Mirrors the trip log's approach.
   */
  const openStopIdRef = useRef(openStopId);
  useEffect(() => {
    openStopIdRef.current = openStopId;
  }, [openStopId]);
  const onOpenRef = useRef(onOpenStop);
  useEffect(() => {
    onOpenRef.current = onOpenStop;
  }, [onOpenStop]);
  const onNavRef = useRef(onNavigateToStop);
  useEffect(() => {
    onNavRef.current = onNavigateToStop;
  }, [onNavigateToStop]);

  /** Push the cursor's current position into its GeoJSON source. */
  const paintCursor = useCallback(() => {
    const map = mapRef.current;
    const src = map?.getSource("pj-cursor") as GeoJSONSource | undefined;
    src?.setData(cursorFeature(route, cursorFracRef.current));
    // The bright line is drawn from the SAME fractional position the dot is at,
    // so the two can never disagree. Previously the line was cut at an integer
    // route index set instantly on stop change, while the dot eased over
    // CURSOR_MS — so the line snapped ahead and the dot spent 420 ms catching
    // up, which reads as "the line teleports, then the dot arrives".
    const headSrc = map?.getSource("pj-route-head") as GeoJSONSource | undefined;
    headSrc?.setData(routeFeatures(route, cursorFracRef.current).head);
  }, [route]);

  /**
   * Slide the cursor to a fractional vertex over CURSOR_MS.
   *
   * Eased with an ease-out cubic so it reads as "settling onto" the stop
   * rather than as a linear crawl. Retargeting mid-flight restarts from the
   * CURRENT fractional position, so a fast scroll (which can fire several
   * targets in quick succession) never snaps backwards.
   *
   * The interpolation runs in ARC LENGTH (metres along the line), not in
   * vertex index. Sampling is uneven — 23 m to 370 m per step on this track —
   * so a constant index speed is visibly wrong: the dot crawls through the
   * densely-sampled 藤沢駅 area and teleports through the sparse 江の島 leg.
   * Arc length makes it a constant ground speed, which is what "the traveller
   * moved" looks like.
   */
  const slideCursorTo = useCallback(
    (target: number) => {
      cursorTargetRef.current = target;
      const proj = routeProjRef.current;
      const arcOf = (frac: number) => {
        if (!proj) return frac;
        const i = Math.max(0, Math.min(proj.length - 2, Math.floor(frac)));
        const t = frac - i;
        return proj[i].s + (proj[i + 1].s - proj[i].s) * t;
      };
      const fracOfArc = (s: number) => {
        if (!proj) return s;
        const last = proj.length - 1;
        if (s <= 0) return 0;
        if (s >= proj[last].s) return last;
        let lo = 0;
        let hi = last;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (proj[mid].s <= s) lo = mid;
          else hi = mid;
        }
        const span = proj[hi].s - proj[lo].s;
        return span > 0 ? lo + (s - proj[lo].s) / span : hi;
      };
      const from = cursorFracRef.current;
      const fromS = arcOf(from);
      const toS = arcOf(target);
      const t0 = performance.now();
      if (cursorRafRef.current != null) cancelAnimationFrame(cursorRafRef.current);
      if (Math.abs(target - from) < 0.005) {
        cursorFracRef.current = target;
        headIdxRef.current = target;
        paintCursor();
        return;
      }
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / CURSOR_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        cursorFracRef.current = fracOfArc(fromS + (toS - fromS) * eased);
        // Keep the ref honest mid-flight too, so a theme swap that happens
        // during the slide rebuilds both layers at the same fraction.
        headIdxRef.current = cursorFracRef.current;
        paintCursor();
        cursorRafRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      cursorRafRef.current = requestAnimationFrame(step);
    },
    [paintCursor],
  );

  /* ---------------------------------------------------------------- setup */

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !holderRef.current) return;

      map = new maplibregl.Map({
        container: holderRef.current,
        style: isDark ? DARK_STYLE : LIGHT_STYLE,
        // The whole loop is framed once and then never re-zoomed; fitting the
        // bounds (below) picks the zoom, so we only give a sane midpoint here.
        center: [139.505, 35.323],
        zoom: 12.4,
        attributionControl: false,
        // Zoom and pan are ON. The original design disabled both so the scale
        // was fixed — but at that scale several stops overlay each other to
        // within a pixel (see the header), which made dot taps unresolvable.
        // Nothing about the page's meaning depends on a fixed scale now that
        // following centres the camera for the reader.
        dragRotate: false,
        pitchWithRotate: false,
        // Pinch-zoom YES, twist-rotate NO: a two-finger rotation on a dense
        // map is an accident waiting to happen (rotation is disabled just
        // below as well, since the constructor flag only covers drag).
        touchZoomRotate: true,
        scrollZoom: true,
        doubleClickZoom: true,
        dragPan: true,
        minZoom: MIN_ZOOM,
        maxZoom: FOLLOW_MAX_ZOOM + 1,
        // The map column is 100vh on desktop, so plain wheel-zoom would turn
        // every attempt to scroll the story — whenever the pointer happens to
        // be over the map — into a zoom and swallow the page scroll. With
        // cooperative gestures the wheel needs ⌘/Ctrl and a phone needs two
        // fingers, which is exactly the "page scroll wins by default"
        // behaviour this two-column layout needs.
        cooperativeGestures: true,
        // The scrim and the hint text belong to maplibre
        // (`.maplibregl-cooperative-gesture-screen`, rendered on the first
        // blocked gesture). Only the wording is ours, and it comes from the UI
        // string table — patching `locale` is the whole of the localisation.
        ...(lang === "zh"
          ? {
              locale: {
                "CooperativeGesturesHandler.WindowsHelpText": "按 Ctrl + 滚轮缩放地图",
                "CooperativeGesturesHandler.MacHelpText": "按 ⌘ + 滚轮缩放地图",
                "CooperativeGesturesHandler.MobileHelpText": "用两指移动地图",
              },
            }
          : {}),
      });
      mapRef.current = map;
      // Handy from the console when checking that the line and the cursor
      // really do agree (the two GeoJSON sources are the ground truth).
      (window as unknown as { __pjMap?: MLMap }).__pjMap = map;
      map.touchZoomRotate.disableRotation();

      map.on("load", () => {
        if (cancelled || !map) return;
        const m = map;

        // MapLibre captures the container size once at construction. The
        // container is position:absolute/inset:0 inside a 100vh (desktop) or
        // 58vh (mobile) sticky column, so at the moment the map is created the
        // flex layout may not have settled yet — MapLibre then caches a
        // 300px-tall canvas and every later projection is wrong.
        const holder = holderRef.current;
        /** Fit the whole loop. Used for the initial framing only. */
        const frame = () => {
          if (!m.isStyleLoaded()) return;
          const lons = route.coordinates.map((c) => c[0]);
          const lats = route.coordinates.map((c) => c[1]);
          m.fitBounds(
            [
              [Math.min(...lons), Math.min(...lats)],
              [Math.max(...lons), Math.max(...lats)],
            ],
            { padding: FIT_PADDING, duration: 0, maxZoom: 14 },
          );
          fittedZoomRef.current = m.getZoom();
        };
        if (holder && typeof ResizeObserver !== "undefined") {
          let lastW = holder.clientWidth;
          let lastH = holder.clientHeight;
          /** The canvas must always track its box; the CAMERA must not.
           *  Before zoom existed the two were the same thing: the only valid
           *  camera was "the whole loop in frame", so a viewport change had to
           *  re-fit. Now re-fitting would yank the camera out of wherever the
           *  reader dragged it, and it fires constantly — every time a phone's
           *  address bar collapses during a scroll, for instance. So: resize
           *  always, re-fit only while the camera is still ours to place (i.e.
           *  nobody has panned, zoomed, or been followed to a stop yet). */
          roRef.current = new ResizeObserver(() => {
            const w = holder.clientWidth;
            const h = holder.clientHeight;
            if (w === lastW && h === lastH) return;
            lastW = w;
            lastH = h;
            m.resize();
            if (!cameraOwnedRef.current) frame();
          });
          roRef.current.observe(holder);
        }
        m.resize();
        frame();

        // Reveal gate: the style is loaded and the initial framing is applied,
        // so the curtain retracts onto a painted map rather than a grey canvas.
        onMapReady?.();

        // Seed the cursor: overview starts at the first stop, so the dot has
        // somewhere sensible to be before the reader scrolls at all.
        const startFrac = stops[0] ? stopFrac(route, routeProjRef.current, stops[0], 0) : 0;
        cursorFracRef.current = startFrac;
        cursorTargetRef.current = startFrac;
        cursorStartRef.current = startFrac;
        headIdxRef.current = startFrac;

        addLayers(m, route, stops, activeStopId, startFrac, startFrac);
        initialStyleDoneRef.current = isDark;

        // Click a dot → open that stop AND take the reader to it. Click empty
        // map → close.
        //
        // Query BOTH layers (`pj-stops` is only 3.5 px; `pj-stops-hit` is the
        // 14 px invisible target) and pick the dot nearest the pointer, so
        // overlapping dots resolve to the one actually aimed at rather than to
        // whatever MapLibre happened to return first.
        const pickStop = (e: MapMouseEvent & { point: Point }) => {
          const hits = m.queryRenderedFeatures(e.point, {
            layers: ["pj-stops", "pj-stops-hit"],
          });
          let best: { id: string; d: number } | null = null;
          for (const f of hits) {
            const id = String(f.properties?.id ?? "");
            if (!id) continue;
            // Project the feature's own geometry to measure real distance —
            // `f.geometry` is present for rendered features.
            const g = f.geometry;
            if (g.type !== "Point") continue;
            const p = m.project(g.coordinates as [number, number]);
            const d = Math.hypot(p.x - e.point.x, p.y - e.point.y);
            if (!best || d < best.d) best = { id, d };
          }
          return best?.id ?? null;
        };

        m.on("click", "pj-stops-hit", (e) => {
          const id = pickStop(e);
          if (!id) return;
          onOpenRef.current(id);
          // A click on the dot that is already open should not fight the
          // scroll it just triggered, so only navigate when it changes.
          if (id !== openStopIdRef.current) onNavRef.current(id);
        });
        m.on("click", "pj-stops", (e) => {
          const id = pickStop(e);
          if (!id) return;
          onOpenRef.current(id);
          if (id !== openStopIdRef.current) onNavRef.current(id);
        });
        m.on("mouseenter", "pj-stops-hit", () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", "pj-stops-hit", () => {
          m.getCanvas().style.cursor = "";
        });

        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      if (cursorRafRef.current != null) cancelAnimationFrame(cursorRafRef.current);
      roRef.current?.disconnect();
      roRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
    // Intentionally mount-only: style swaps are handled by a separate effect
    // that swaps in place, so the map instance is never torn down mid-page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------- data → map updates */

  // Bright head line + cursor. Both are driven by the ACTIVE stop's position
  // ALONG THE LINE — a fractional vertex derived from the photo's timestamp
  // (stopFrac) — so the blue stretch of line and the dot sitting at its end
  // are always describing the same moment.
  //
  // The head is BIDIRECTIONAL: scrolling back up retracts it in step with the
  // reading position, so the blue stretch always means "the photos I have
  // scrolled past", not "how far I once got". (An earlier version kept a
  // high-water mark; that left a long blue tail hanging in front of the
  // reader after they scrolled back, which is exactly what the trace is not
  // supposed to say.)
  //
  // The two text-only chapters are POSITIONS ON THE ROUTE, not just prose:
  // the cover is the first vertex and the send-off is the last one, so the
  // bright line has a proper beginning and a proper end instead of a stub left
  // where the neighbouring photo happened to be. Reading forwards, the finale
  // therefore closes the loop — the whole 17.7 km goes blue at 完结撒花.
  useEffect(() => {
    if (!ready) return;
    if (activeStopId === CHAPTER_START) {
      headIdxRef.current = 0;
      slideCursorTo(0);
      return;
    }
    if (activeStopId === CHAPTER_END) {
      headIdxRef.current = route.coordinates.length - 1;
      slideCursorTo(route.coordinates.length - 1);
      return;
    }
    // No stop in the band at all (between two blocks): leave the line where
    // it is rather than guessing.
    if (!activeStop) return;
    // The line is bidirectional, but a single stop must never sit BEHIND its
    // predecessor: photo B is by definition newer than photo A, so a fix or a
    // rounding that puts it upstream would make the cursor jump backwards
    // while the story scrolls forwards. `orderedStops` lists the stops in
    // reading order, which is the order they were shot.
    const prevId = orderedStops[orderedStops.findIndex((s) => s.id === activeStop.id) - 1]?.id;
    const floor = prevId ? lastFracRef.current.get(prevId) ?? 0 : 0;
    const frac = stopFrac(route, routeProjRef.current, activeStop, floor);
    lastFracRef.current.set(activeStop.id, Math.max(floor, frac));
    headIdxRef.current = frac;
    // ONLY the cursor is animated here; paintCursor() (one rAF step) moves the
    // bright line's endpoint to the same fraction, so the line grows and
    // retracts in lockstep with the dot instead of jumping to it.
    slideCursorTo(frac);
  }, [ready, route, activeStop, activeStopId, orderedStops, slideCursorTo]);

  // Stop dots (active flag)
  useEffect(() => {
    if (!ready) return;
    const src = mapRef.current?.getSource("pj-stops") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(stopsFeature(stops, activeStopId));
  }, [ready, stops, activeStopId]);

  /* ----------------------------------------------------------- dark theme */

  useEffect(() => {
    if (!ready) return;
    const m = mapRef.current;
    if (!m) return;
    // First run: the map is still on its initial style, so there is nothing to
    // swap and re-adding would duplicate every layer.
    if (initialStyleDoneRef.current === isDark) return;
    initialStyleDoneRef.current = isDark;
    m.setStyle(isDark ? DARK_STYLE : LIGHT_STYLE);
    // setStyle() destroys every source and layer we own. Re-add once the new
    // style is fully in.
    //
    // Use `style.load` (fires exactly once per style, after it is ready) NOT
    // `styledata` — styledata fires many times during the swap, including
    // BEFORE the new style settles, and the first such firing can happen while
    // isStyleLoaded() is still true for the OLD style. Checking the flag then
    // passes, addLayers runs against a half-torn-down style, throws on a
    // duplicate id, and because we had already unsubscribed the listener the
    // route silently vanished for the rest of the page's life. (Seen exactly
    // that: dark mode with a completely empty map.)
    const reAdd = () => {
      m.off("style.load", reAdd);
      // Rebuild at the CURRENT progress, not the furthest one — the head is
      // bidirectional, so headIdxRef may well be behind the first stop.
      addLayers(m, route, stops, activeStopId, cursorFracRef.current, headIdxRef.current, isDark);
    };
    m.on("style.load", reAdd);
    return () => {
      m.off("style.load", reAdd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isDark]);

  /* ------------------------------------------------------ follow camera */

  /** The zoom the follow camera holds: the overview framing pushed in by an
   *  amount chosen for the shape of THIS viewport (see the constants above —
   *  a wide column needs a smaller push to reach the same visual density). */
  const followZoom = useCallback(() => {
    const base = fittedZoomRef.current ?? mapRef.current?.getZoom() ?? 13;
    const wide = (holderRef.current?.clientWidth ?? 0) >= 560;
    const delta = wide ? FOLLOW_ZOOM_DELTA_WIDE : FOLLOW_ZOOM_DELTA_NARROW;
    return Math.min(base + delta, FOLLOW_MAX_ZOOM);
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    // Only REAL gestures. Deliberately NOT `zoomstart`: our own easeTo fires it
    // too, so listening there would have the follow camera pause itself the
    // instant it moved. `dragstart` covers pointer/touch panning, `wheel` the
    // modifier-wheel zoom, `touchstart` the two-finger pinch (pinch zoom also
    // produces `dragstart` on some platforms, but not all).
    //
    // A gesture parks the camera in "manual". It does NOT quietly re-arm
    // following for the next stop, which is what the old one-shot
    // `userMovedRef` did — that made "look at something else for a second"
    // impossible without turning the mode off in the pill.
    const onUser = () => {
      cameraOwnedRef.current = true;
      if (cameraModeRef.current === "follow" || cameraModeRef.current === "overview") {
        cameraModeRef.current = "manual";
        applyCameraMode("manual");
      }
    };
    m.on("dragstart", onUser);
    m.on("wheel", onUser);
    m.on("touchstart", onUser);
    return () => {
      m.off("dragstart", onUser);
      m.off("wheel", onUser);
      m.off("touchstart", onUser);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || cameraMode !== "follow" || !activeStopId) return;
    if (lastFollowedRef.current === activeStopId) return;

    const m = mapRef.current;
    if (!m) return;

    // The two text chapters are stations on the route as well, and in follow
    // mode they must FRAME like one. They used to fall through this effect
    // entirely (it looks the id up in `stops`, finds nothing, returns), so the
    // camera stayed parked on whichever photo came last — which is why the
    // cover and the finale were not facing 鎌倉高校前 even though the cursor
    // and the bright line had correctly moved to the route's head/tail.
    //
    // The loop STARTS and ENDS at 鎌倉高校前駅 (route[0] and route[last] are
    // 72 m apart), so both chapters share one framing. The offset is dropped
    // here: it exists to keep a stop's thumbnail out of the way, and a chapter
    // has no popup.
    if (activeStopId === CHAPTER_START || activeStopId === CHAPTER_END) {
      const isEnd = activeStopId === CHAPTER_END;
      const p = isEnd
        ? route.coordinates[route.coordinates.length - 1]
        : route.coordinates[0];
      if (!p) return;
      lastFollowedRef.current = activeStopId;
      cameraOwnedRef.current = true;
      m.easeTo({
        center: [p[0], p[1]],
        zoom: followZoom(),
        duration: 700,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
      return;
    }

    const stop = stops.find((s) => s.id === activeStopId);
    if (!stop) return;
    lastFollowedRef.current = activeStopId;
    // Zoom in as well as re-centre. The offset keeps the popup (which opens
    // toward the right) and the time plate from covering the dot.
    cameraOwnedRef.current = true;
    m.easeTo({
      center: [stop.lon, stop.lat],
      zoom: followZoom(),
      duration: 650,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      offset: [0, 40],
    });
  }, [ready, cameraMode, activeStopId, stops, followZoom, route]);

  /** Back to the whole loop — the 全 button. Sets the mode to "overview",
   *  which is a real state and not a one-shot re-frame: scrolling afterwards
   *  must NOT re-acquire the camera (that was the bug the reader reported —
   *  click 全, scroll once, and the camera dives back in). The camera is
   *  handed back to the page (cameraOwnedRef = false) so a viewport resize can
   *  re-fit it, and viewport-sized padding keeps the route clear of the
   *  time plate and the follow/theme pills. */
  const reframeOverview = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    const lons = route.coordinates.map((c) => c[0]);
    const lats = route.coordinates.map((c) => c[1]);
    cameraOwnedRef.current = false;
    cameraModeRef.current = "overview";
    applyCameraMode("overview");
    // Clearing the memo lets the follow effect fire the instant the reader
    // switches back to 随, even if the active stop never changed in between.
    lastFollowedRef.current = null;
    m.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: FIT_PADDING, duration: 700, easing: (t) => 1 - Math.pow(1 - t, 3) },
    );
  }, [route]);

  /** 随 → on: re-acquire the camera on the NEXT stop change (clearing
   *  lastFollowedRef makes the follow effect fire immediately for the current
   *  one too). Anything else → "manual", i.e. stop following but leave the
   *  camera exactly where it is — pulling it back to the overview would be
   *  the same yank we are avoiding, and 全 already exists for that. */
  const toggleFollow = useCallback(() => {
    if (cameraModeRef.current === "follow") {
      cameraModeRef.current = "manual";
      applyCameraMode("manual");
      return;
    }
    cameraModeRef.current = "follow";
    applyCameraMode("follow");
    lastFollowedRef.current = null;
  }, []);

  /** Switch the page theme — the SAME key the site header writes, so a flip
   *  here is already in effect everywhere else (and vice versa). */
  const switchTheme = useCallback((mode: Theme) => {
    // applyTheme writes the DOM + storage AND notifies the store, so the
    // toolbar re-renders from the same value the page is now using.
    applyTheme(mode);
  }, []);

  /* ------------------------------------------------------------- popup */

  // Where to pin the popup: adjacent to the open stop, always inside the map.
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !openStop || !m) {
      setPopupPos(null);
      return;
    }
    const box = holderRef.current;
    if (!box) return;

    /** Place the card beside its dot: centred horizontally on the dot, above
     *  it when there is room, below when there is not, then clamped so it can
     *  never leave the map. The previous version always assumed "above", so
     *  any dot in the upper half was pushed to the top-left corner with the
     *  card nowhere near the pin it belonged to. */
    const place = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      const p = m.project([openStop.lon, openStop.lat]);
      const PW = Math.min(POPUP_W, w - 16);
      const x = Math.max(8, Math.min(w - PW - 8, p.x - PW / 2));
      const above = p.y - POPUP_H - 12;
      const y = above >= 8 ? above : Math.min(h - POPUP_H - 8, p.y + 16);
      setPopupPos({ x, y: Math.max(8, y) });
    };

    place();
    // A pan would invalidate the projection; re-project on move so the card
    // stays glued to its dot.
    m.on("move", place);
    return () => {
      m.off("move", place);
    };
  }, [ready, openStop]);

  /** Stop number for the time plate, 1-based, matching the story column. */
  const activeNo = activeStop
    ? String(stops.findIndex((s) => s.id === activeStop.id) + 1).padStart(2, "0")
    : null;

  return (
    <div className="pj-map-col" ref={mountColumn}>
      {/* The MapLibre container deliberately carries NO styling class of ours.
          maplibre-gl.css ships `.maplibregl-map { position: relative }`, and an
          equal-specificity rule that loads later wins — so a `.pj-map` on the
          same element was being overridden to position:relative and its
          height:100% collapsed to zero. Keeping our own class on a separate
          wrapper makes the two stylesheets independent. */}
      <div className="pj-map-box">
        <div ref={holderRef} className="pj-map" />

        {/* Time plate, top-left — mirrors the trip log's timeline indicator.
            Shows which photo the map is currently reporting, plus its capture
            time; the route's own start/end sit underneath as context. The two
            text chapters show no "N / 36" at all — they are not photos — and
            own the plate outright: the cover is the departure, the finale the
            return, so the same numbers never appear twice in a row. */}
        <div className="pj-map-overlay-top">
          <div className="pj-time-plate">
            {activeStop ? (
              <>
                <div className="pj-time-day">
                  {activeNo} / {String(stops.length).padStart(2, "0")} · {activeStop.anitabi?.name ?? "圣地巡礼地点"}
                </div>
                <div className="pj-time-clock">{activeStop.time}</div>
              </>
            ) : (
              <>
                <div className="pj-time-day">
                  {activeStopId === CHAPTER_END ? "完结撒花 · 返回" : "开场 · 出发"} ·{" "}
                  {route.startedAtLocal.slice(0, 10)}
                </div>
                <div className="pj-time-clock">
                  {activeStopId === CHAPTER_END
                    ? `${route.endedAtLocal.slice(11, 16)} 回到镰仓高校前`
                    : `${route.startedAtLocal.slice(11, 16)} 镰仓高校前`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Controls, top-right: page brightness (a 3-way radio, same storage
            key as the site header) and the follow-camera toggle side by side. */}
        <div className="pj-map-tools">
          <div className="pj-tools-group" role="radiogroup" aria-label="页面明暗">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={themeMode === t.id}
                className={"pj-tool-btn" + (themeMode === t.id ? " on" : "")}
                title={t.label}
                onClick={() => switchTheme(t.id)}
              >
                {t.icon}
              </button>
            ))}
          </div>
          <div className="pj-tools-group" role="group" aria-label="镜头模式">
            {/* ONE segmented control, one selection — exactly like the trip
                log's 卫/地 pill. The previous version drew these as two
                independent switches, so 全 could never look "on": after it was
                pressed the pill reset to 随's colours and the reader had no
                way to tell which framing they were in. */}
            <button
              type="button"
              className={"pj-tool-btn" + (cameraMode === "follow" ? " on" : "")}
              aria-pressed={cameraMode === "follow"}
              onClick={() => {
                if (cameraMode !== "follow") toggleFollow();
              }}
              title="随阅读移动镜头"
            >
              随
            </button>
            <button
              type="button"
              className={"pj-tool-btn" + (cameraMode === "overview" ? " on" : "")}
              aria-pressed={cameraMode === "overview"}
              onClick={reframeOverview}
              title="回到全貌（整条路线）"
            >
              全
            </button>
          </div>
        </div>
      </div>

      {openStop && popupPos && (
        <figure
          className="pj-popup"
          style={{ left: popupPos.x, top: popupPos.y }}
          role="dialog"
          aria-label={`${openStop.time} 的对比图`}
          title={`${openStop.time} · ${openStop.anitabi?.name ?? "圣地巡礼地点"}`}
        >
          <div className="pj-popup-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={openStop.src} alt={`${openStop.time} 圣地巡礼对比图`} loading="lazy" />
            <button
              type="button"
              className="pj-popup-close"
              aria-label="关闭"
              onClick={() => onOpenStop(null)}
            >
              ×
            </button>
          </div>
        </figure>
      )}

      {/* anitabi's point data and the anime stills are CC BY-NC-SA 4.0, which
          requires attribution AND a link back wherever they are rendered —
          this strip is a licence obligation, not decoration. The basemap
          credit is required by OpenStreetMap's own licence. */}
      {renderHandle({
        className: "pj-attrib",
        children: (
          <>
            <a href={attribution.href} target="_blank" rel="noopener noreferrer">
              {attribution.text}
            </a>
            <span className="pj-attrib-sep">·</span>
            <span>{attribution.license}</span>
            <span className="pj-attrib-sep">·</span>
            <span>{attribution.basemap}</span>
          </>
        ),
      })}
    </div>
  );
}
