"use client";

// REQUIRED: maplibre-gl.css carries the container (.maplibregl-map is
// position:relative / overflow:hidden) plus the attribution + control chrome.
// Without it maplibre's own absolutely-positioned controls fall back to
// in-flow layout and land hundreds of px below the canvas.
import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Map as MLMap,
  GeoJSONSource,
  LineLayerSpecification,
  ExpressionSpecification,
} from "maplibre-gl";
import type {
  Attraction,
  Bounds,
  TripInfo,
  TripTrack,
  TrackPoint,
  TravelScene,
} from "@/lib/travel/types";
import { padBounds, localClockAt } from "@/lib/travel/gps";
import type { StoryState } from "@/lib/travel/use-story-controller";
import { applyTheme, readTheme } from "@/lib/theme";
import type { Theme } from "@/lib/site";
import { MAP_SPLIT, useMapSplit } from "@/lib/travel/map-split";
import ResumeStoryButton from "./ResumeStoryButton";

// Basemap is swappable without touching travel data (roadmap §24).
const BASEMAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// free raster basemaps as inline style JSON (no key, attribution required)
const ESRI_STYLE = {
  version: 8 as const,
  sources: {
    esri: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "esri", type: "raster" as const, source: "esri" }],
};
const TOPO_STYLE = {
  version: 8 as const,
  sources: {
    otm: {
      type: "raster" as const,
      tiles: [
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, SRTM | style: © OpenTopoMap (CC-BY-SA)",
    },
  },
  layers: [{ id: "otm", type: "raster" as const, source: "otm" }],
};

/**
 * The fixed bottom-strip credits (2026-10-17 user request: adopt the
 * pilgrimage page's pattern — "把 license 和地图数据源这些信息写在地图区底部
 * 固定条上").
 *
 * One entry per style the map can show, because the credit changes with the
 * basemap: the vector pair are CARTO's, and the two raster overrides are Esri
 * and OpenTopoMap (whose own licence requires CC-BY-SA attribution). These
 * strings MUST match the `attribution` fields above — that is the machine-
 * readable copy maplibre would print; this is the human-readable strip.
 */
const BASEMAP_CREDITS: Record<"vector" | Exclude<SpecialBasemap, "">, string> = {
  vector: "Map Data © OpenStreetMap contributors · CARTO",
  sat: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
  topo: "© OpenStreetMap contributors, SRTM | style: © OpenTopoMap (CC-BY-SA)",
};

// v21 (2026-10-09 user request): the map's top-right control is split into TWO// INDEPENDENT groups so "page brightness" and "map form" stop fighting:
//   Group 1 · 明暗 (自/昼/夜) — a 3-way RADIO, always exactly one. It IS the
//     site theme (system/light/dark), written to the SAME key the header
//     toggle uses, so a flip here is already in effect on the main site.
//   Group 2 · 特殊底图 (卫/地) — a TOGGLE, at most one, click again to clear.
//     Empty => the vector basemap follows Group 1 (light -> Positron,
//     dark -> Dark Matter). Set => the raster OVERRIDES it, independent of
//     the page theme (a dark page over satellite imagery is fine).
type SpecialBasemap = "" | "sat" | "topo";

const BASEMAP_KEY = "travel-basemap";
const SPECIAL_OPTIONS: {
  id: Exclude<SpecialBasemap, "">;
  label: string;
  icon: string;
  style: unknown;
}[] = [
  { id: "sat", label: "卫星影像", icon: "卫", style: ESRI_STYLE },
  { id: "topo", label: "地形图", icon: "地", style: TOPO_STYLE },
];
const THEME_OPTIONS: { id: Theme; label: string; icon: string }[] = [
  { id: "system", label: "跟随系统明暗", icon: "自" },
  { id: "light", label: "浅色模式", icon: "昼" },
  { id: "dark", label: "深色模式", icon: "夜" },
];

function isDarkTheme(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  );
}

/** Resolve the maplibre style: a special raster wins, else the vector pair
 *  follows the page theme (light -> Positron, dark -> Dark Matter). */
function resolveStyle(special: SpecialBasemap): unknown {
  if (special === "sat") return ESRI_STYLE;
  if (special === "topo") return TOPO_STYLE;
  return isDarkTheme() ? DARK_STYLE : BASEMAP_STYLE;
}

/**
 * Stored special-basemap choice + one-time migration. The pre-v21 control
 * stored "auto"/"light"/"dark"/"sat"/"topo" under the same key. Only sat/topo
 * are genuine "special basemap" choices; everything else (including the old
 * light/dark basemap locks) now reads as "" — no override — because page
 * brightness lives in the shared theme key instead.
 */
function readSavedSpecial(): SpecialBasemap {
  try {
    const raw = localStorage.getItem(BASEMAP_KEY);
    if (raw === "sat" || raw === "topo") return raw;
  } catch {
    /* storage unavailable */
  }
  return "";
}

const ACCENT = "#1ba7c9";
const AIR = "#d97706";     // flights: amber dashed geodesic arcs
const GAP = "#a8a196";     // recording holes: dotted gray connector
const ATTR = "#c96f2f";    // attraction POIs: warm terracotta dot

type Kind = "ground" | "air" | "gap";

interface Props {
  trip: TripInfo;
  track: TripTrack;
  scenes: TravelScene[];
  /** hand-curated POIs; only the active pane's narrative day is rendered */
  attractions: Attraction[];
  state: StoryState;
  onUserInteract: () => void;
  onResume: () => void;
  /** Fired once when the MapLibre map fires its initial "load" (style ready,
   *  first frame drawn). v11 entry veil: the trip page stays covered until
   *  this fires, so the reveal never exposes a half-initialised map. */
  onMapReady?: () => void;
  /** Page language, used to localise maplibre's OWN UI strings — currently
   *  the cooperative-gesture hint ("Ctrl + scroll to zoom"). Optional so the
   *  English routes need no change; anything other than "zh" falls through
   *  to maplibre's built-in English table. */
  lang?: "en" | "zh";
}
// `scenes` kept in Props for the camera rebuild key ordering
// a GPS recording hole this long AND this far apart would draw as a straight
// chord slicing across streets - render it as a dotted `gap` instead
const HOLE_DT_MS = 120_000;
const HOLE_DIST_M = 300;

function haversineM(a: TrackPoint, b: TrackPoint): number {
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const dla = la2 - la1;
  const dlo = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dla / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** one round of Chaikin corner cutting: each corner is replaced by two points
 * at 1/4 and 3/4 along each incident segment, endpoints preserved. One
 * iteration is enough - two starts erasing real street corners. */
function chaikin(line: number[][]): number[][] {
  if (line.length < 3) return line;
  const out: number[][] = [line[0]];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
    out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  out.push(line[line.length - 1]);
  return out;
}

// Per-frame route rebuilds must stay cheap: the camera rAF shares this thread,
// and un-memoized chaikin over ~41k vertices starved it (the Frankfurt->Chicago
// entry regressed to 4.6R). Polylines are identical across frames except the
// few that the moving tip touches, so cache by content checksum and reuse.
const smoothCache = new Map<string, number[][]>();
const SMOOTH_CACHE_MAX = 600;

function smoothLine(key: string, line: number[][]): number[][] {
  if (line.length < 3 || key.startsWith("gap")) return line;
  let h = 0;
  for (const p of line) {
    h = Math.imul(h, 31) + Math.round(p[0] * 1e6);
    h = Math.imul(h, 31) + Math.round(p[1] * 1e6);
  }
  const ck = `${key}:${line.length}:${h}`;
  const hit = smoothCache.get(ck);
  if (hit) return hit;
  const out = chaikin(line);
  if (smoothCache.size >= SMOOTH_CACHE_MAX) smoothCache.clear();
  smoothCache.set(ck, out);
  return out;
}

function kindOf(p: TrackPoint): Kind {
  return p.k === "air" || p.k === "gap" ? p.k : "ground";
}

/** Kind of the LINK that point `i` sits on — the same predicates
 *  routeFeatureCollection() uses (kind + hole test), so the marker's dot/plane
 *  switch and the line style can never disagree at a boundary. */
function linkKindAt(pts: TrackPoint[], i: number): Kind {
  const p = pts[i];
  if (!p) return "ground";
  const q = pts[i + 1];
  if (q && kindOf(p) === "ground" && q.ts - p.ts > HOLE_DT_MS && haversineM(p, q) > HOLE_DIST_M)
    return "gap";
  return kindOf(p);
}

// Window used to estimate the heading at the marker, in degrees of longitude
// travelled: wide enough that sample noise cannot swing the bearing, narrow
// enough that a curved leg (the North Atlantic great circle turns ~30°) reads
// the LOCAL tangent rather than the whole leg's chord.
const HEAD_WINDOW_DEG = 0.5;

/**
 * Compass bearing (deg CW from north) of the track AT index i — the "mid-frame"
 * direction: average of the local unit vectors toward a fix ~0.5° ahead and one
 * ~0.5° behind. Averaging the two (rather than reading the next chord) puts the
 * nose on the arc's tangent at the marker instead of on the chord of whichever
 * pair of fixes happens to straddle it, which also stops it twitching as the
 * window's endpoints step from one sample to the next.
 *
 * Both endpoints are projected onto the tangent plane at the marker: Δlon is
 * scaled by cos(lat) to become an east displacement, Δlat is already north.
 * Subtracting raw degrees instead would make every leg read due east (a degree
 * of longitude is ~cos(lat) as long as a degree of latitude), and on a
 * 10 000 km leg the endpoints are far enough away that even that breaks down.
 */
function headingAt(pts: TrackPoint[], i: number): number | null {
  if (!Number.isFinite(i) || i < 0 || i >= pts.length) return null;
  const base = pts[i];
  if (!base) return null;
  // east component of a degree of longitude at the marker's latitude
  const cosLat = Math.max(1e-6, Math.cos((base.lat * Math.PI) / 180));
  // Walk out to the window edges. Both loops stop at a REAL point check, not
  // just an index bound: pts can be shorter than the index suggests at the
  // moment the track is being swapped in, and a missing neighbour here would
  // otherwise feed `undefined` into the vector maths below.
  let ahead: TrackPoint | null = null;
  for (let j = i + 1; j < pts.length; j++) {
    const p = pts[j];
    if (!p) break;
    ahead = p;
    if (Math.abs(p.lon - base.lon) >= HEAD_WINDOW_DEG) break;
  }
  let behind: TrackPoint | null = null;
  for (let k = i - 1; k >= 0; k--) {
    const p = pts[k];
    if (!p) break;
    behind = p;
    if (Math.abs(p.lon - base.lon) >= HEAD_WINDOW_DEG) break;
  }
  // fall back to the other side when the marker sits on an endpoint
  if (!ahead) ahead = behind;
  if (!behind) behind = base;
  if (!ahead) return null;
  const vec = (from: TrackPoint, to: TrackPoint) => {
    const dLon = ((to.lon - from.lon) * Math.PI) / 180;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    return { e: dLon * cosLat, n: dLat }; // radians, already comparable
  };
  const fwd = vec(base, ahead);
  const back = vec(behind, base);
  const e = fwd.e + back.e;
  const n = fwd.n + back.n;
  const magn = Math.hypot(e, n);
  if (!(magn > 1e-12)) return null;
  return (Math.atan2(e / magn, n / magn) * 180) / Math.PI;
}

// ---- plane glyph (flight legs) ------------------------------------------
// Drawn into a canvas and added with map.addImage (2x for retina) rather than
// shipped as an asset: no extra file, no extra request, and check:refs never
// has to know about it. The path is authored nose-up (map bearing 0 = north),
// which is exactly what icon-rotate + icon-rotation-alignment:"map" expect.
const PLANE_ICON = "position-plane";
const PLANE_VIEWBOX = 512; // SVG space the path below is authored in

// A four-engine airliner seen from above, nose at y=0.
const PLANE_PATH = [
  "M 256 34",
  "C 274 34 284 62 284 96",       // fuselage, right of the nose
  "L 284 176",
  "L 462 286",                    // right wing leading edge (swept)
  "L 462 318",
  "L 284 256",
  "L 284 388",
  "L 352 434",                    // right horizontal stabiliser
  "L 352 458",
  "L 256 432",
  "L 160 458",
  "L 160 434",
  "L 228 388",
  "L 228 256",
  "L 50 318",
  "L 50 286",
  "L 228 176",
  "L 228 96",
  "C 228 62 238 34 256 34",
  "Z",
].join(" ");

function planeIconData(fill: string): { width: number; height: number; data: Uint8ClampedArray } {
  // 96 px box for a 512-unit path (~0.19 scale) leaves room for the 3 px white
  // outline: the silhouette spans y 34..458, i.e. ~6 px from the top edge at
  // this size, and a 1.5 px half-stroke would otherwise be clipped flat.
  const size = Math.round(PLANE_VIEWBOX * 0.1875); // 96 device px (2x of 48 CSS)
  const strokePx = 3; // white outline width, in device px
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) return { width: size, height: size, data: new Uint8ClampedArray(size * size * 4) };
  const k = size / PLANE_VIEWBOX;
  g.scale(k, k);
  const p = new Path2D(PLANE_PATH);
  g.fillStyle = fill;
  // lineWidth is in the PRE-transform unit (the 512-unit space), so divide by
  // the scale factor to land a strokePx-wide line on the device grid
  g.lineWidth = strokePx / k;
  g.lineJoin = "round";
  g.miterLimit = 2;
  // stroke first, fill on top: the outline ends up outside the silhouette,
  // matching the white ring the ground dot carries
  g.strokeStyle = "#ffffff";
  g.stroke(p);
  g.fill(p);
  const img = g.getImageData(0, 0, size, size);
  return { width: size, height: size, data: img.data };
}

/** R20: continuous narrative-age fade. Opacity/width ramp by how far behind
 *  the marker a segment sits in NARRATIVE time — no per-day boundary jump
 *  (the old d0/d1/d2/old ladder snapped a whole day at once). Stops match the
 *  old ladder values at ~24h spacing; each transition is a smoothstep ramp. */
const AGE_H = 3_600_000;
const FADE_STOPS: { age: number; op: number; w: number }[] = [
  { age: 0, op: 0.9, w: 2.4 },
  { age: 24 * AGE_H, op: 0.32, w: 2.2 },
  { age: 48 * AGE_H, op: 0.16, w: 2.0 },
  { age: 72 * AGE_H, op: 0.07, w: 2.0 },
];
const RAMP_H = 10 * AGE_H; // half-width of each smoothstep transition

function ageFade(ageMs: number): { op: number; w: number } {
  const s = FADE_STOPS;
  if (ageMs <= 0) return { op: s[0].op, w: s[0].w };
  for (let i = 1; i < s.length; i++) {
    if (ageMs <= s[i].age) {
      const a = s[i - 1];
      const t0 = s[i].age - RAMP_H; // plateau end of the previous stop
      if (ageMs <= t0) return { op: a.op, w: a.w };
      const f = (ageMs - t0) / (s[i].age - t0);
      const e = f * f * (3 - 2 * f); // smoothstep
      return { op: a.op + (s[i].op - a.op) * e, w: a.w + (s[i].w - a.w) * e };
    }
  }
  return { op: s[s.length - 1].op, w: s[s.length - 1].w };
}

// quantization keeps the smoothLine cache keys (and feature count) stable
const opQ = (op: number) => Math.round(op / 0.02) * 0.02;
const wQ = (w: number) => Math.round(w / 0.05) * 0.05;
// R20b: segmentation is by kind + a fixed 1h bucket of the segment's OWN
// timestamp — never by the current opacity. A time-dependent key (the original
// R20 kind:opQ(op)) made the opacity-quantum boundaries sweep along the route
// as narrative time advanced: runs re-grouped every frame, MapLibre kept
// re-tessellating chunks of the PAST track and dashed phases visibly
// re-rendered ("the past route keeps refreshing while scrolling"). With a
// time-stable key the per-frame change is limited to the frontier feature
// (extent/tip) plus the few features whose quantized opacity actually stepped.
const FADE_BUCKET_MS = AGE_H; // 1h

/**
 * The completed route as per-kind MultiLineStrings with a CONTINUOUS fade:
 * each segment carries its own opacity/width (data-driven paint), derived
 * from its narrative age at `tMs` — see ageFade(). `full` (finale): the whole
 * route at FULL_STYLE values, band property "full" (kept for the verify
 * probe). `tip` is appended so the drawn path always touches the marker.
 */
function routeFeatureCollection(
  track: TripTrack,
  uptoIdx: number | null,
  tMs: number,
  full: boolean,
  tip?: { lon: number; lat: number }
) {
  const pts = track.points;
  const n = pts.length;
  const end = uptoIdx === null ? n - 1 : Math.min(uptoIdx, n - 1);
  const fadeOf = (i: number): { op: number; w: number } => {
    if (full) return { op: FULL_STYLE.op[0], w: FULL_STYLE.w[0] };
    return ageFade(tMs - pts[i].ts);
  };
  const lines: Partial<Record<string, number[][][]>> = {};
  const props: Partial<Record<string, { op: number; w: number; tRef: number }>> = {};
  let cur: { key: string; line: number[][] } | null = null;
  const flush = () => {
    if (cur && cur.line.length >= 2)
      (lines[cur.key] ??= []).push(smoothLine(cur.key, cur.line));
    cur = null;
  };
  let lastKind: Kind = end > 0 ? linkKindAt(pts, end - 1) : "ground";
  let lastFade = fadeOf(Math.max(0, end - 1));
  // R20b: time-stable segmentation key (see FADE_BUCKET_MS above)
  const keyOf = (i: number, k: Kind) =>
    full ? `${k}:full` : `${k}:${Math.floor(pts[i].ts / FADE_BUCKET_MS)}`;
  let lastKey = "";
  for (let i = 0; i < end; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    // linkKindAt() holds the kind + hole predicate shared with the marker
    lastKind = linkKindAt(pts, i);
    lastFade = fadeOf(i);
    const key = keyOf(i, lastKind);
    if (!cur || cur.key !== key) {
      flush();
      cur = { key, line: [[p.lon, p.lat]] };
      props[key] = { op: opQ(lastFade.op), w: wQ(lastFade.w), tRef: p.ts };
    }
    lastKey = key;
    cur.line.push([q.lon, q.lat]);
  }
  flush();
  if (tip && end >= 0 && end < n - 1 && lastKey) {
    const arr = lines[lastKey];
    if (arr && arr.length > 0) arr[arr.length - 1].push([tip.lon, tip.lat]);
  }
  const features = [];
  for (const key of Object.keys(lines)) {
    const k = key.split(":")[0] as Kind;
    const pr = props[key] ?? { op: FULL_STYLE.op[0], w: FULL_STYLE.w[0], tRef: 0 };
    // stable feature id: lets the GeoJSON source diff match features across
    // setData calls so only frontier/opacity-stepped features re-tessellate
    const ki = k === "air" ? 1 : k === "gap" ? 2 : 0;
    const id = full ? 1_000_000 + ki : Math.round(+key.split(":")[1]) * 3 + ki;
    features.push({
      type: "Feature" as const,
      id,
      properties: {
        kind: k,
        op: full ? FULL_STYLE.op[ki] : pr.op,
        w: full ? FULL_STYLE.w[ki] : pr.w,
        band: full ? "full" : "dyn",
        tRef: pr.tRef,
      },
      geometry: { type: "MultiLineString" as const, coordinates: lines[key] ?? [] },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

/** Marker decoration at narrative time tMs — computed from the SAME index the
 *  route was drawn up to, so the plane can never appear on a link whose line
 *  has not been reached yet. */
interface MarkerState {
  kind: Kind;
  /** compass deg, null when the track is stationary there (no heading) */
  bearing: number | null;
  /** 1 normally; the flight glyph fades with its arc (user 2026-10-24) */
  op: number;
}

function markerStateAt(
  track: TripTrack,
  uptoIdx: number | null,
  tMs: number,
  full: boolean
): MarkerState {
  const pts = track?.points;
  if (!pts || pts.length < 2) return { kind: "ground", bearing: null, op: 1 };
  const n = pts.length;
  // clamp defensively: Math.min(NaN, n-1) is NaN, and pts[NaN] is undefined —
  // a NaN index reaches here on the very first frames (currentTime still 0
  // while the controller's rAF-driven initialisation is pending)
  const raw = uptoIdx === null ? n - 1 : uptoIdx;
  const i = Number.isFinite(raw) ? Math.max(0, Math.min(raw, n - 1)) : 0;
  const kind = linkKindAt(pts, i);
  return {
    kind,
    bearing: headingAt(pts, i),
    // the arc's own age fade, quantized identically so plane and dash step
    // together; finale renders everything at full style, hence 1
    op: full ? 1 : opQ(ageFade(tMs - pts[i].ts).op),
  };
}

/** web-mercator zoom that fits `b` into a viewport of width x height */
function zoomForBounds(b: Bounds, width: number, height: number, padding: number): number {
  const lngSpan = Math.max(1e-6, b[2] - b[0]);
  const merc = (lat: number) => {
    const phi = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
    return (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
  };
  const spanY = Math.max(1e-9, Math.abs(merc(b[3]) - merc(b[1])));
  const zx = ((width - 2 * padding) * 360) / (512 * lngSpan);
  const zy = (height - 2 * padding) / (512 * spanY);
  return Math.log2(Math.min(zx, zy));
}

/** First narrative GPS scene, used to establish a grounded opening view. */
function openingFrame(
  trip: TripInfo,
  scenes: TravelScene[],
  width: number,
  height: number
): { center: [number, number]; zoom: number } {
  const firstScene = scenes.find(
    (scene) => scene.gps && scene.segment !== "title" && scene.segment !== "transit"
  );
  if (!firstScene?.gps) {
    return {
      center: [(trip.bounds[0] + trip.bounds[2]) / 2, (trip.bounds[1] + trip.bounds[3]) / 2],
      zoom: Math.min(6, zoomForBounds(trip.bounds, width, height, 40)),
    };
  }
  const bounds = padBounds(firstScene.gps.bounds, 0.18);
  return {
    center: firstScene.gps.center,
    zoom: Math.min(14.5, Math.max(7, zoomForBounds(bounds, width, height, 50))),
  };
}

// R20: per-kind route layers use data-driven opacity/width (each feature
// carries `op`/`w` from the continuous age fade). Finale (band "full")
// features ride the same layers with FULL_STYLE values.
const FULL_STYLE: { op: [number, number, number]; w: [number, number, number] } = {
  op: [0.95, 1, 0.9],
  w: [2.6, 2.4, 1.8],
};

// Site-integration note (2026-09-25): the return type annotation is required
// under the main site's TS resolution — without it the data-driven
// expressions ("get", "op") widen to string[] and fail style-spec assignability.
function linePaint(k: Kind): LineLayerSpecification["paint"] {
  if (k === "air")
    return {
      "line-color": AIR,
      /* v9 (2026-09-28 user request): flight arcs run THINNER than ground
         track — scale the shared age-width down by 0.6 (2.4 → ~1.4px). */
      "line-width": ["*", ["get", "w"], 0.6] as unknown as number,
      "line-dasharray": [1.5, 1.5] as [number, number],
      "line-opacity": ["get", "op"],
    };
  if (k === "gap")
    return {
      "line-color": GAP,
      "line-width": ["get", "w"],
      "line-dasharray": [0.5, 2.5] as [number, number],
      "line-opacity": ["get", "op"],
    };
  return { "line-color": ACCENT, "line-width": ["get", "w"], "line-opacity": ["get", "op"] };
}

export default function TravelMap({
  trip,
  track,
  scenes,
  attractions,
  state,
  onUserInteract,
  onResume,
  onMapReady,
  lang = "en",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // camera ops (jumpTo) work before the basemap style finishes loading, so the
  // follow camera starts as soon as the instance exists — only data-source
  // updates wait for `load` (mapReady).
  const [mapCreated, setMapCreated] = useState(false);
  // finale mode: past the 完结撒花 section the whole unfaded route is drawn
  const [finaleMode, setFinaleMode] = useState(false);
  // last-rendered overlay data, re-applied after a basemap swap remounts the
  // style (the per-frame effects don't re-run on their own while reading)
  const remountRef = useRef<(() => void) | null>(null);
  const routeFCRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const positionFRef = useRef<GeoJSON.Feature | null>(null);
  const attractionsFCRef = useRef<GeoJSON.FeatureCollection | null>(null);
  // Group 2: "" = no override (vector basemap follows the theme); sat/topo set.
  const [specialBasemap, setSpecialBasemap] = useState<SpecialBasemap>("");
  // mirror for the theme observer, whose closure would otherwise go stale
  const specialRef = useRef<SpecialBasemap>("");
  // Group 1: the chosen theme MODE (system/light/dark) — drives the radio's
  // active segment. The resolved brightness lives on <html class="dark">.
  const [themeMode, setThemeMode] = useState<Theme>("system");
  // v14 (2026-09-28 user request): the legend ate map space on small screens —
  // collapsible, COLLAPSED by default on every viewport.
  const [legendOpen, setLegendOpen] = useState(false);
  /** Draggable map/story split (mobile only) — same hook as the pilgrimage
   *  page; the licence strip at the map's bottom edge is the handle. */
  const { mountColumn, renderHandle } = useMapSplit(
    MAP_SPLIT.trip.storageKey,
    MAP_SPLIT.trip.cssVar,
    MAP_SPLIT.trip.defaultVh,
  );
  const finaleModeRef = useRef(false);
  const modeRef = useRef(state.mode);
  // Site-integration note: was a render-phase ref write — moved to an effect.
  useEffect(() => {
    modeRef.current = state.mode;
  }, [state.mode]);

  // ---- init once (roadmap §23)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let themeObs: MutationObserver | null = null;
    // v13 (2026-09-28 bugfix, kept): the stored choice used to restore the
    // BUTTON state only — the map itself always booted on the light style, so
    // the control showed one thing while the map showed another (user report).
    // Read storage synchronously BEFORE the dynamic import and boot the map on
    // the resolved style; the UI state follows one frame later (rAF — sync
    // setState inside an effect body is forbidden by the site's lint).
    // Nothing stored = no basemap override, so the vector pair follows the
    // page theme that the pre-paint script already applied to <html>.
    const savedSpecial = readSavedSpecial();
    specialRef.current = savedSpecial;
    const style0 = resolveStyle(savedSpecial) as Exclude<
      Parameters<MLMap["setStyle"]>[0],
      null
    >;
    const stateRaf = requestAnimationFrame(() => {
      if (cancelled) return;
      setSpecialBasemap(savedSpecial);
      setThemeMode(readTheme());
    });
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;
      const opening = openingFrame(
        trip,
        scenes,
        containerRef.current.clientWidth || 900,
        containerRef.current.clientHeight || 800
      );
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: style0,
        center: opening.center,
        zoom: opening.zoom,
        // 2026-10-17 user request: the licence and basemap credits now live in
        // a FIXED STRIP along the bottom of the map area — the pattern the
        // pilgrimage page already used — instead of maplibre's collapsible
        // "i" chip, which hid the credit behind a click and floated over the
        // map. The native control is disabled so the credit is not printed
        // twice; `.map-attrib` below renders the same information from
        // `BASEMAP_CREDITS`, which must stay in step with the style objects.
        attributionControl: false,
        // The map column is 100vh on desktop and 40-60vh on mobile, i.e. a
        // large share of the viewport the reader scrolls THROUGH. With
        // maplibre's default gesture set, every wheel tick over the map zooms
        // instead of scrolling the page, so reading the story gets stuck the
        // moment the pointer drifts across the map. `cooperativeGestures`
        // inverts the priority: page scroll always wins, the wheel zooms only
        // with ⌘/Ctrl, and a phone needs two fingers.
        //
        // The grey scrim and the hint text are NOT ours — maplibre renders
        // `.maplibregl-cooperative-gesture-screen` (40% black, pointer-events
        // none) on first blocked gesture and fades it out again. Its wording
        // comes from the UI string table, so `locale` below is the only thing
        // needed to make the hint read in the page's language.
        cooperativeGestures: true,
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
      setMapCreated(true);
      // debug handle (harmless in production)
      (window as unknown as Record<string, unknown>).__tmap = map;

      const EMPTY_FC = { type: "FeatureCollection" as const, features: [] as never[] };

      // All custom sources/layers sit on top of the swappable basemap. A
      // basemap swap wipes the style, so this stack is (re)mounted on every
      // load AND styledata; after a swap, last-rendered data is re-applied
      // from the refs (the mapReady effects don't re-run while reading).
      const mountOverlays = () => {
        if (map.getSource("route")) return; // already mounted
        map.addSource("route", { type: "geojson", data: EMPTY_FC });
        // Seed with the CURRENT marker state, not empty properties: a basemap
        // swap remounts this stack from scratch while the reader sits
        // mid-flight, and the layer filters + icon-rotate read `kind` and
        // `bearing` off this feature.
        map.addSource("position", {
          type: "geojson",
          data: positionFRef.current ?? {
            type: "Feature" as const,
            properties: {},
            geometry: { type: "Point", coordinates: [state.position.lon, state.position.lat] },
          },
        });

        // --- completed route: one layer per kind; opacity/width are
        // data-driven (each feature carries its continuous-fade values, see
        // ageFade). Finale features ride the same layers.
        for (const k of ["ground", "air", "gap"] as Kind[]) {
          map.addLayer({
            id: `route-${k}`,
            type: "line",
            source: "route",
            filter: ["==", ["get", "kind"], k],
            layout: { "line-join": "round" as const, "line-cap": "round" as const },
            paint: linePaint(k),
          });
        }

        // --- attraction POIs (plan B): source updated per-day by the
        // filter effect; layers sit above routes, below the marker
        map.addSource("attractions", { type: "geojson", data: EMPTY_FC });
        // v14.2 (2026-10-07): planned-but-not-entered attractions (journal:
        // 放弃 / 售罄 / 装修围起来) render as a hollow dot — white fill with a
        // terracotta ring — so a "wanted to, couldn't" stop still shows up
        // without pretending it was visited.
        map.addLayer({
          id: "attraction-dot",
          type: "circle",
          source: "attractions",
          paint: {
            "circle-radius": ["case", ["==", ["get", "planned"], 1], 4, 4.5],
            "circle-color": ["case", ["==", ["get", "planned"], 1], "#ffffff", ATTR],
            "circle-opacity": 0.95,
            "circle-stroke-color": ["case", ["==", ["get", "planned"], 1], ATTR, "#ffffff"],
            "circle-stroke-width": ["case", ["==", ["get", "planned"], 1], 1.8, 1.6],
          },
        });
        map.addLayer({
          id: "attraction-label",
          type: "symbol",
          source: "attractions",
          minzoom: 8,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color": ["case", ["==", ["get", "planned"], 1], "#8a7c6b", "#374151"],
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.4,
          },
        });

        // --- marker: breathing halo under the dot (rAF-animated below).
        // Ground/gap links show the accent dot; flight links swap to the plane
        // glyph (added below) so the marker says "I am on an arc" as clearly as
        // the amber dashed line does. Both read the same `kind` property off
        // the `position` source, so the swap is a filter flip, not a fade.
        const notAir: ExpressionSpecification = ["!=", ["get", "kind"], "air"];
        map.addLayer({
          id: "position-halo",
          type: "circle",
          source: "position",
          filter: notAir,
          paint: {
            "circle-radius": 10,
            "circle-color": ACCENT,
            "circle-opacity": 0.18,
          },
        });
        map.addLayer({
          id: "position-dot",
          type: "circle",
          source: "position",
          filter: notAir,
          paint: {
            "circle-radius": 6,
            "circle-color": ACCENT,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        // --- flight marker: plane glyph, nose along the track tangent.
        // icon-rotation-alignment "map" is the point of the whole thing — the
        // nose follows the compiled bearing, not the screen, so it stays on the
        // arc's forward direction even when the reader rotates the map.
        const icon = planeIconData(AIR);
        if (!map.hasImage(PLANE_ICON)) map.addImage(PLANE_ICON, icon as never);
        map.addLayer({
          id: "position-plane",
          type: "symbol",
          source: "position",
          filter: ["==", ["get", "kind"], "air"],
          layout: {
            "icon-image": PLANE_ICON,
            // 96 device px icon → 0.275 = ~26 css px box; the silhouette is
            // ~79% of that, i.e. a ~14 px long plane — half the previous 0.55
            // at the user's request (2026-10-24), roughly the dot's footprint.
            "icon-size": 0.275,
            "icon-rotate": ["coalesce", ["get", "bearing"], 0],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
          paint: {
            "icon-opacity": ["coalesce", ["get", "op"], 1],
          },
        });

        if (routeFCRef.current)
          (map.getSource("route") as GeoJSONSource).setData(routeFCRef.current);
        if (positionFRef.current)
          (map.getSource("position") as GeoJSONSource).setData(positionFRef.current);
        if (attractionsFCRef.current)
          (map.getSource("attractions") as GeoJSONSource).setData(attractionsFCRef.current);
      };

      let overlaysMounted = false;
      map.on("load", () => {
        mountOverlays();
        overlaysMounted = true;

        // v16 (2026-10-07 user request): the attraction click-to-expand review
        // popup is gone. The dots carry context only, so NO layer click/hover
        // handler is registered — a leftover `cursor: pointer` would advertise
        // an interaction that no longer exists. (Dropping the popup also drops
        // the old focusAfterOpen page-scroll bug it had to work around, and
        // `.map-pane` no longer needs maplibre's popup CSS.)
        setMapReady(true);
        (window as unknown as Record<string, unknown>).__tmapReady = true;
        onMapReady?.();
        console.log("[map] load complete, mapReady=true");
      });

      // basemap swap: rebuild the overlay stack once the new style is in.
      // styledata alone is unreliable here - for inline raster styles it stops
      // firing before isStyleLoaded() turns true, and nothing re-triggers the
      // mount. Poll instead (mountOverlays is re-entrance guarded).
      const tryRemount = () => {
        if (!overlaysMounted || map.getSource("route")) return;
        if (!map.isStyleLoaded()) {
          setTimeout(tryRemount, 250);
          return;
        }
        mountOverlays();
      };

      remountRef.current = tryRemount;

      // explore mode: any direct manipulation pauses the story camera
      const explore = () => {
        if (modeRef.current === "story") onUserInteract();
      };
      map.on("dragstart", explore);
      map.on("wheel", explore);
      map.on("touchstart", explore);

      // v21: with no special basemap chosen, the vector pair follows
      // <html class="dark"> — the 自/昼/夜 radio, or the OS when the mode is
      // "system", both flip that class. A satellite/terrain override makes this
      // a no-op (the raster is theme-agnostic on purpose).
      themeObs = new MutationObserver(() => {
        if (specialRef.current) return;
        map.setStyle(resolveStyle("") as Parameters<MLMap["setStyle"]>[0]);
        setTimeout(() => remountRef.current?.(), 300);
      });
      themeObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(stateRaf);
      themeObs?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- breathing halo (independent of story mode)
  useEffect(() => {
    if (!mapReady) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const map = mapRef.current;
      // on a flight link the halo belongs to the dot, and the dot is filtered
      // out — skip the write instead of animating an invisible circle
      if (map && map.getLayer("position-halo") && positionFRef.current?.properties?.kind !== "air") {
        const ph = 0.5 + 0.5 * Math.sin(((now - t0) / 2600) * Math.PI * 2);
        map.setPaintProperty("position-halo", "circle-radius", 8 + 10 * ph);
        map.setPaintProperty("position-halo", "circle-opacity", 0.04 + 0.2 * (1 - ph));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mapReady]);

  // ---- scroll-blended camera field (continuous transitions).
  // Each section registers one camera key at its document-space top edge:
  //   - intro / transit / finale: STATIC frame (bounds fit)
  //   - GPS scenes: a stable frame around that scene's route bounds
  // The camera target blends one neighbouring key pair across each complete
  // transition window. Bounds-fit keys (intro, transit, finale) release the
  // marker-visibility clamp so their entire route frames remain stable.
  type CamSpec =
    | { kind: "static"; lng: number; lat: number; zoom: number }
    | { kind: "follow"; zoom: number | null };
  type CamKey = { y: number; spec: CamSpec; h?: number; noClamp?: boolean; wide?: boolean };
  const camRef = useRef<{ lng: number; lat: number; zoom: number } | null>(null);
  const camKeysRef = useRef<CamKey[]>([]);
  const camViewportRef = useRef({ vw: 900, vh: 800 });
  const finaleYRef = useRef<number | null>(null);
  const posRef = useRef({ lng: 0, lat: 0 });
  const readingYRef = useRef(state.readingY);
  // Site-integration note: was a render-phase ref write — moved to an effect
  // (committed before the next rAF camera frame reads it).
  useEffect(() => {
    posRef.current = { lng: state.position.lon, lat: state.position.lat };
  }, [state.position.lon, state.position.lat]);
  useEffect(() => {
    readingYRef.current = state.readingY;
  }, [state.readingY]);
  const CAM_BLEND_VH = 0.35; // transition half-window, in viewport heights

  useEffect(() => {
    const rebuild = () => {
      const el = containerRef.current;
      const vw = el?.clientWidth || 900;
      const vh = el?.clientHeight || 800;
      camViewportRef.current = { vw, vh };
      const keys: CamKey[] = [];
      const [bx0, by0, bx1, by1] = trip.bounds;
      // intro: open on the first narrative scene (Evanston–ORD for PTES)
      const introEl = document.querySelector('[data-scene-id="__intro__"]');
      const opening = openingFrame(trip, scenes, vw, vh);
      keys.push({
        y: introEl ? introEl.getBoundingClientRect().top + window.scrollY : 0,
        noClamp: true,
        wide: true,
        spec: {
          kind: "static",
          lng: opening.center[0],
          lat: opening.center[1],
          zoom: opening.zoom,
        },
      });
      // day-title capsules hold no camera key (user 2025-09-25): the camera
      // blends straight from the previous unit into the next one
      for (const scene of scenes) {
        const sec = document.querySelector<HTMLElement>(`[data-scene-id="${scene.id}"]`);
        if (!sec) continue;
        const rect = sec.getBoundingClientRect();
        if (rect.height <= 0) continue;
        const y = rect.top + window.scrollY;
        if (scene.gps && scene.segment === "transit") {
          const b = padBounds(scene.gps.bounds, 0.3);
          keys.push({
            y,
            // The complete leg is fitted into this frame. Letting the marker
            // clamp pull its center toward live GPS positions made the view
            // drift and hunt around transit handoffs.
            noClamp: true,
            wide: true,
            spec: {
              kind: "static",
              lng: (b[0] + b[2]) / 2,
              lat: (b[1] + b[3]) / 2,
              // Long-distance legs need to zoom farther out on narrow/mobile
              // viewports. A 2.2 floor cropped the route even though the
              // bounds-fit calculation had correctly asked for a wider view.
              zoom: Math.max(0, Math.min(11.5, zoomForBounds(b, vw, vh, 40))),
            },
          });
        } else if (scene.segment === "title") {
          // day capsule: pure UI, no camera correspondence
        } else if (scene.gps) {
          // Keep the camera anchored to the scene's route footprint instead
          // of chasing every GPS sample. At city scale, a marker-following
          // center exposes every small turn and GPS wobble as camera shake.
          const b = padBounds(scene.gps.bounds, 0.18);
          keys.push({
            y,
            spec: {
              kind: "static",
              lng: (b[0] + b[2]) / 2,
              lat: (b[1] + b[3]) / 2,
              zoom: Math.min(14.5, Math.max(7, zoomForBounds(b, vw, vh, 50))),
            },
          });
        } else {
          keys.push({ y, spec: { kind: "follow", zoom: null } });
        }
      }
      // finale: whole-trip overview, one last static key
      const finEl = document.querySelector('[data-scene-id="__finale__"]');
      if (finEl) {
        const fy = finEl.getBoundingClientRect().top + window.scrollY;
        finaleYRef.current = fy;
        keys.push({
          y: fy,
          noClamp: true,
          wide: true,
          spec: {
            kind: "static",
            lng: (bx0 + bx1) / 2,
            lat: (by0 + by1) / 2,
            zoom: Math.min(5.5, zoomForBounds(trip.bounds, vw, vh, 40)),
          },
        });
      } else {
        finaleYRef.current = null;
      }
      keys.sort((a, b) => a.y - b.y);
      // per-key blend half-width, capped by the gap to each neighbour so the
      // windows of short sections never overlap (overlaps made the target
      // zoom pulse up then down at tight boundaries)
      for (let i = 0; i < keys.length; i++) {
        const gapUp = i > 0 ? keys[i].y - keys[i - 1].y : Infinity;
        const gapDown = i < keys.length - 1 ? keys[i + 1].y - keys[i].y : Infinity;
        keys[i].h = Math.min(CAM_BLEND_VH * vh, 0.45 * Math.min(gapUp, gapDown), 600);
      }
      camKeysRef.current = keys;
    };
    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(document.body);
    window.addEventListener("resize", rebuild);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", rebuild);
    };
  }, [trip, mapCreated, scenes]);

  /** camera target at the controller's activation band line (scroll-driven) */
  const evalCamAt = (
    bandY: number
  ): { lng: number; lat: number; zoom: number; clamp: number } | null => {
    const keys = camKeysRef.current;
    if (keys.length === 0) return null;
    const unloaded = posRef.current.lng === 0 && posRef.current.lat === 0;
    const specOf = (k: CamKey): { lng: number; lat: number; zoom: number | null } | null => {
      if (k.spec.kind === "static") return { lng: k.spec.lng, lat: k.spec.lat, zoom: k.spec.zoom };
      // marker at origin means data isn't loaded yet — hold the camera
      if (unloaded) return null;
      return { lng: posRef.current.lng, lat: posRef.current.lat, zoom: k.spec.zoom };
    };
    const fin = (v: { lng: number; lat: number; zoom: number | null } | null, clamp: number) =>
      v ? { lng: v.lng, lat: v.lat, zoom: v.zoom ?? 12, clamp } : null;
    const clampOf = (k: CamKey) => (k.noClamp === true ? 0 : 1);
    const { vh } = camViewportRef.current;
    if (bandY <= keys[0].y) return fin(specOf(keys[0]), clampOf(keys[0]));
    let lo = 0;
    let hi = keys.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (keys[mid].y <= bandY) lo = mid;
      else hi = mid - 1;
    }

    // Keep one key pair for the whole blend window. Switching pairs at the
    // key's exact y used to change a half-blended target to the new key in one
    // frame, causing the visible jump at scene handoffs.
    let from = lo;
    let to = lo;
    let h = 0;
    if (lo > 0) {
      const currentH = keys[lo].h ?? CAM_BLEND_VH * vh;
      if (bandY <= keys[lo].y + currentH) {
        from = lo - 1;
        to = lo;
        h = currentH;
      }
    }
    if (from === to && lo < keys.length - 1) {
      const nextH = keys[lo + 1].h ?? CAM_BLEND_VH * vh;
      if (bandY >= keys[lo + 1].y - nextH) {
        from = lo;
        to = lo + 1;
        h = nextH;
      }
    }
    if (from === to) return fin(specOf(keys[lo]), clampOf(keys[lo]));
    const H = Math.max(1, h);
    const t = (bandY - (keys[to].y - H)) / (2 * H);
    const sBlend = t >= 1 ? 1 : t * t * (3 - 2 * t);
    const a = specOf(keys[from]);
    const b = specOf(keys[to]);
    // Keep the marker inside the viewport for the entire handoff whenever
    // either camera key is a narrative scene. Fading the clamp toward zero at
    // the transit key let the marker slip offscreen during the final part of
    // the zoom-out, even though the transit frame itself fits the full route.
    // Pure overview-to-overview blends (intro/finale) can stay unclamped.
    const clamp = clampOf(keys[from]) === 0 && clampOf(keys[to]) === 0 ? 0 : 1;
    if (!a || !b) return fin(a ?? b, clamp);
    const zA = a.zoom ?? b.zoom ?? 12;
    const zB = b.zoom ?? a.zoom ?? 12;
    let centerBlend = sBlend;
    let zoomBlend = sBlend;
    if (keys[from].wide || keys[to].wide) {
      // Stage wide-scene handoffs so the marker does not get stranded between
      // a moving center and a zoom level that has not caught up yet. On zoom
      // out, establish the wide frame before panning; on zoom in, settle the
      // center first and tighten the zoom after it is in place.
      const smooth = (v: number) => {
        const x = Math.max(0, Math.min(1, v));
        return x * x * (3 - 2 * x);
      };
      if (zB < zA) {
        zoomBlend = smooth(sBlend / 0.42);
        centerBlend = smooth((sBlend - 0.42) / 0.58);
      } else if (zB > zA) {
        centerBlend = smooth(sBlend / 0.58);
        zoomBlend = smooth((sBlend - 0.42) / 0.58);
      }
    }
    return {
      lng: a.lng + (b.lng - a.lng) * centerBlend,
      lat: a.lat + (b.lat - a.lat) * centerBlend,
      zoom: zA + (zB - zA) * zoomBlend,
      clamp,
    };
  };

  useEffect(() => {
    if (!mapCreated || state.mode !== "story") return;
    let raf = 0;
    // Re-sync after explore mode so a user-panned map does not resume from a
    // stale story-camera ref.
    const map0 = mapRef.current;
    if (map0) {
      camRef.current = { lng: map0.getCenter().lng, lat: map0.getCenter().lat, zoom: map0.getZoom() };
    }
    const step = () => {
      const map = mapRef.current;
      // Marker time and camera key both use the controller's spring-damped
      // reading line, so neither can run ahead on a separate scroll clock.
      const bandY = readingYRef.current;
      // finale flips the route rendering to the unfaded full track
      const fy = finaleYRef.current;
      const full = fy !== null && bandY >= fy - 2;
      if (full !== finaleModeRef.current) {
        finaleModeRef.current = full;
        setFinaleMode(full);
      }
      const ev = evalCamAt(bandY);
      const cam = camRef.current;
      if (map && ev && cam) {
        const tgt = { lng: ev.lng, lat: ev.lat, zoom: ev.zoom };
        // keep the marker inside the viewport while the camera crosses scales:
        // entering a continent-scale transit the target center can run ahead
        // of the zoom-out — pull it toward the marker so readers do not lose
        // the dot. The influence fades across the same transition as the
        // camera target. Released for intro/finale overviews.
        const m = posRef.current;
        const merc = (lat: number) => {
          const phi = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
          return (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
        };
        const targetScale = 512 * Math.pow(2, tgt.zoom);
        const R = 0.38 * Math.min(camViewportRef.current.vw, camViewportRef.current.vh);
        // Keep the marker in the visible region while ordinary scene bounds
        // are active; transit route frames are already fitted and opt out.
        // A fixed radius avoids switching clamp thresholds as the marker
        // crosses an offscreen test, which made the camera center twitch.
        const Rc = R;
        if (ev.clamp > 0) {
          const dx = ((tgt.lng - m.lng) / 360) * targetScale;
          const dy = (merc(tgt.lat) - merc(m.lat)) * targetScale;
          const dist = Math.hypot(dx, dy);
          if (dist > Rc) {
            const f = Rc / dist;
            const clampedLng = m.lng + (tgt.lng - m.lng) * f;
            const clampedLat = m.lat + (tgt.lat - m.lat) * f;
            tgt.lng += (clampedLng - tgt.lng) * ev.clamp;
            tgt.lat += (clampedLat - tgt.lat) * ev.clamp;
          }
        }
        const dLng = tgt.lng - cam.lng;
        const dLat = tgt.lat - cam.lat;
        const dZoom = tgt.zoom - cam.zoom;
        // No second camera easing stage: the shared damped reading line is
        // the only clock for both marker and camera, preventing zoom lag.
        cam.lng = tgt.lng;
        cam.lat = tgt.lat;
        cam.zoom = tgt.zoom;
        // skip micro-moves to avoid churn when settled
        if (Math.abs(dLng) > 1e-6 || Math.abs(dLat) > 1e-6 || Math.abs(dZoom) > 1e-4) {
          map.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom });
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mapCreated, state.mode]);

  // ---- time -> route progress + marker (never rebuild the map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const full = finaleModeRef.current;
    const fc = routeFeatureCollection(
      track,
      state.pointIdx,
      state.currentTime,
      full,
      state.position
    );
    routeFCRef.current = fc;
    (map.getSource("route") as GeoJSONSource | undefined)?.setData(fc);
    // marker: the kind/bearing/opacity ride on the feature so the layer
    // FILTERS (dot vs plane) and icon-rotate are pure style, no per-frame
    // setLayoutProperty churn.
    const mk = markerStateAt(track, state.pointIdx, state.currentTime, full);
    const pf: GeoJSON.Feature = {
      type: "Feature",
      properties: { kind: mk.kind, bearing: mk.bearing ?? 0, op: mk.op },
      geometry: { type: "Point", coordinates: [state.position.lon, state.position.lat] },
    };
    positionFRef.current = pf;
    (map.getSource("position") as GeoJSONSource | undefined)?.setData(pf);
  }, [state.pointIdx, state.position.lon, state.position.lat, state.currentTime, track, mapReady, finaleMode]);

  // ---- attraction dots: only the active pane's narrative day (plan B).
  // Pure source-data swap — no camera keys are registered, so the camera
  // field is untouched.
  const activeDayNo = useMemo(() => {
    const s = scenes.find((x) => x.id === state.activeSceneId);
    return s?.dayNo ?? null;
  }, [scenes, state.activeSceneId]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const fc = {
      type: "FeatureCollection" as const,
      features: attractions
        .filter((a) => a.dayNo === activeDayNo)
        .map((a) => ({
          type: "Feature" as const,
          properties: {
            // the two attraction layers read `name` (symbol label) and
            // `planned` (hollow-dot case expression) only — with the popup
            // gone, rating/tags/excerpt have no consumer on the map
            id: a.id,
            name: a.name,
            // 1 = planned but never entered (see Attraction.visited)
            planned: a.visited === false ? 1 : 0,
          },
          geometry: { type: "Point" as const, coordinates: [a.lon, a.lat] },
        })),
    };
    attractionsFCRef.current = fc;
    (map.getSource("attractions") as GeoJSONSource | undefined)?.setData(fc);
  }, [attractions, activeDayNo, mapReady]);

  // Group 1 · 明暗 (自/昼/夜): a RADIO — always exactly one. It writes the SAME
  // theme key as the site header; applyTheme flips <html class="dark">, which
  // the observer above turns into a vector-basemap swap when no special basemap
  // is set. (When the class does not actually change — e.g. "system" and the OS
  // already agree with the previous choice — the basemap is already correct, so
  // no swap is needed.)
  const switchTheme = (mode: Theme) => {
    setThemeMode(mode);
    applyTheme(mode);
  };

  // Group 2 · 特殊底图 (卫/地): a TOGGLE — clicking the active one clears it.
  // A special raster OVERRIDES the theme pair; "" hands control back to it.
  const switchBasemap = (id: Exclude<SpecialBasemap, "">) => {
    const map = mapRef.current;
    if (!map) return;
    const next: SpecialBasemap = specialRef.current === id ? "" : id;
    specialRef.current = next;
    setSpecialBasemap(next);
    try {
      localStorage.setItem(BASEMAP_KEY, next);
    } catch {
      /* ignore */
    }
    map.setStyle(resolveStyle(next) as Parameters<MLMap["setStyle"]>[0]);
    setTimeout(() => remountRef.current?.(), 300);
  };

  const finaleActive = state.activeSceneId === "__finale__";
  const activeSceneDay = useMemo(
    () => scenes.find((s) => s.id === state.activeSceneId)?.day ?? null,
    [scenes, state.activeSceneId]
  );

  return (
    <div className="map-pane" ref={mountColumn}>
      <div ref={containerRef} className="map-container" />
      {/* v21 (2026-10-09 user request): two INDEPENDENT pills so page
          brightness and map form stop fighting. LEFT: 自/昼/夜, a 3-way radio
          (always one) wired to the site theme. RIGHT: 卫/地, a toggle (at most
          one, click again to clear) that overrides the basemap. */}
      <div className="basemap-ctl">
        <div className="bm-group" role="radiogroup" aria-label="页面明暗">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={themeMode === t.id}
              className={"bm-btn" + (themeMode === t.id ? " on" : "")}
              title={t.label}
              onClick={() => switchTheme(t.id)}
            >
              {t.icon}
            </button>
          ))}
        </div>
        <div className="bm-group" role="group" aria-label="特殊底图">
          {SPECIAL_OPTIONS.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={specialBasemap === b.id}
              className={"bm-btn" + (specialBasemap === b.id ? " on" : "")}
              title={b.label}
              onClick={() => switchBasemap(b.id)}
            >
              {b.icon}
            </button>
          ))}
        </div>
      </div>
      <div className="map-overlay-top">
        <div className="timeline-indicator">
          <div className="timeline-day">{finaleActive ? "Finale" : (activeSceneDay ?? trip.start)}</div>
          <div className="timeline-time">{localClockAt(track.points, state.currentTime)}</div>
          {finaleActive && <div className="timeline-scene">完结撒花 🎉</div>}
        </div>
      </div>
      <div className={"map-legend" + (legendOpen ? " open" : "")}>
        <button
          type="button"
          className="lg-toggle"
          aria-expanded={legendOpen}
          title={legendOpen ? "Collapse legend" : "Expand legend"}
          onClick={() => setLegendOpen((o) => !o)}
        >
          <span className="lg-swatch" aria-hidden="true">
            <i className="lg lg-ground" />
            <i className="lg lg-air" />
            <i className="lg lg-gap" />
          </span>
          <span>Legend</span>
          <svg className="lg-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M3 1.5 7 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {legendOpen && (
          <>
            <i className="lg lg-ground" aria-hidden="true" /><span>on the ground</span>
            <i className="lg lg-air" aria-hidden="true" /><span>flight</span>
            <i className="lg lg-gap" aria-hidden="true" /><span>GPS gap</span>
            <i className="lg-attr" aria-hidden="true" /><span>attraction</span>
            <i className="lg-attr lg-attr-planned" aria-hidden="true" /><span>planned only</span>
          </>
        )}
      </div>
      {state.mode === "explore" && <ResumeStoryButton onResume={onResume} />}

      {/* Licence + data-source strip, pinned to the map's bottom edge.
          Same anatomy as the pilgrimage page's `.pj-attrib`: a translucent
          panel that the map reads through, one line, wrapping on narrow
          screens. It replaces maplibre's collapsible attribution chip so the
          credit is ALWAYS visible rather than one tap away. */}
      {renderHandle({
        className: "map-attrib",
        children: <span>{BASEMAP_CREDITS[specialBasemap || "vector"]}</span>,
      })}
    </div>
  );
}
