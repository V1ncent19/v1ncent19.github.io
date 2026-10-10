"use client";

// REQUIRED: maplibre-gl.css carries the container (.maplibregl-map is
// position:relative / overflow:hidden) plus the attribution + control chrome.
// Without it maplibre's own absolutely-positioned controls fall back to
// in-flow layout and land hundreds of px below the canvas.
import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, LineLayerSpecification } from "maplibre-gl";
import type {
  Attraction,
  Bounds,
  TripInfo,
  TripTrack,
  TrackPoint,
} from "@/lib/travel/types";
import { padBounds, localClockAt } from "@/lib/travel/gps";
import type { StoryState } from "@/lib/travel/use-story-controller";
import { applyTheme, readTheme } from "@/lib/theme";
import type { Theme } from "@/lib/site";
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

// v21 (2026-10-09 user request): the map's top-right control is split into TWO
// INDEPENDENT groups so "page brightness" and "map form" stop fighting:
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
}
// `scenes` kept in Props for the camera rebuild key ordering
import type { TravelScene } from "@/lib/travel/types";

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
  let lastKind: Kind = end > 0 ? kindOf(pts[end - 1]) : "ground";
  let lastFade = fadeOf(Math.max(0, end - 1));
  // R20b: time-stable segmentation key (see FADE_BUCKET_MS above)
  const keyOf = (i: number, k: Kind) =>
    full ? `${k}:full` : `${k}:${Math.floor(pts[i].ts / FADE_BUCKET_MS)}`;
  let lastKey = "";
  for (let i = 0; i < end; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    lastKind =
      kindOf(p) === "ground" && q.ts - p.ts > HOLE_DT_MS && haversineM(p, q) > HOLE_DIST_M
        ? "gap"
        : kindOf(p);
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
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: style0,
        center: [(trip.bounds[0] + trip.bounds[2]) / 2, (trip.bounds[1] + trip.bounds[3]) / 2],
        zoom: 4,
        attributionControl: { compact: true },
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
        map.addSource("position", {
          type: "geojson",
          data: {
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

        // --- marker: breathing halo under the dot (rAF-animated below)
        map.addLayer({
          id: "position-halo",
          type: "circle",
          source: "position",
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
          paint: {
            "circle-radius": 6,
            "circle-color": ACCENT,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
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
      if (map && map.getLayer("position-halo")) {
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
  //   - intro / transit / title / finale: STATIC frame (bounds fit)
  //   - stay scenes: FOLLOW (marker position at the scene's fit zoom)
  // The camera target is a smoothstep blend of the two neighbouring keys
  // within +/-CAM_BLEND_VH viewports of each key top. Keys marked noClamp
  // (intro, finale) release the marker-visibility clamp so the overview can
  // actually settle on the whole route.
  type CamSpec =
    | { kind: "static"; lng: number; lat: number; zoom: number }
    | { kind: "follow"; zoom: number | null };
  type CamKey = { y: number; spec: CamSpec; h?: number; noClamp?: boolean };
  const camRef = useRef<{ lng: number; lat: number; zoom: number } | null>(null);
  const camKeysRef = useRef<CamKey[]>([]);
  const camViewportRef = useRef({ vw: 900, vh: 800 });
  const finaleYRef = useRef<number | null>(null);
  const posRef = useRef({ lng: 0, lat: 0 });
  // Site-integration note: was a render-phase ref write — moved to an effect
  // (committed before the next rAF camera frame reads it).
  useEffect(() => {
    posRef.current = { lng: state.position.lon, lat: state.position.lat };
  }, [state.position.lon, state.position.lat]);
  const CAM_BLEND_VH = 0.35; // transition half-window, in viewport heights

  useEffect(() => {
    const rebuild = () => {
      const el = containerRef.current;
      const vw = el?.clientWidth || 900;
      const vh = el?.clientHeight || 800;
      camViewportRef.current = { vw, vh };
      const keys: CamKey[] = [];
      const [bx0, by0, bx1, by1] = trip.bounds;
      // intro: frame the whole trip
      const introEl = document.querySelector('[data-scene-id="__intro__"]');
      keys.push({
        y: introEl ? introEl.getBoundingClientRect().top + window.scrollY : 0,
        noClamp: true,
        spec: {
          kind: "static",
          lng: (bx0 + bx1) / 2,
          lat: (by0 + by1) / 2,
          zoom: Math.min(6, zoomForBounds(trip.bounds, vw, vh, 40)),
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
            spec: {
              kind: "static",
              lng: (b[0] + b[2]) / 2,
              lat: (b[1] + b[3]) / 2,
              zoom: Math.min(11.5, Math.max(2.2, zoomForBounds(b, vw, vh, 40))),
            },
          });
        } else if (scene.segment === "title") {
          // day capsule: pure UI, no camera correspondence
        } else if (scene.gps) {
          keys.push({
            y,
            spec: {
              kind: "follow",
              zoom: Math.min(14.5, Math.max(7, zoomForBounds(padBounds(scene.gps.bounds, 0.18), vw, vh, 50))),
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
  }, [trip.bounds, mapCreated, scenes]);

  /** camera target at the controller's activation band line (scroll-driven) */
  const evalCamAt = (
    bandY: number
  ): { lng: number; lat: number; zoom: number; noClamp: boolean } | null => {
    const keys = camKeysRef.current;
    if (keys.length === 0) return null;
    const unloaded = posRef.current.lng === 0 && posRef.current.lat === 0;
    const specOf = (k: CamKey): { lng: number; lat: number; zoom: number | null } | null => {
      if (k.spec.kind === "static") return { lng: k.spec.lng, lat: k.spec.lat, zoom: k.spec.zoom };
      // marker at origin means data isn't loaded yet — hold the camera
      if (unloaded) return null;
      return { lng: posRef.current.lng, lat: posRef.current.lat, zoom: k.spec.zoom };
    };
    const fin = (v: { lng: number; lat: number; zoom: number | null } | null, noClamp: boolean) =>
      v ? { lng: v.lng, lat: v.lat, zoom: v.zoom ?? 12, noClamp } : null;
    const { vh } = camViewportRef.current;
    if (bandY <= keys[0].y) return fin(specOf(keys[0]), keys[0].noClamp === true);
    const last = keys[keys.length - 1];
    if (bandY >= last.y) return fin(specOf(last), last.noClamp === true);
    let lo = 0;
    let hi = keys.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (keys[mid].y <= bandY) lo = mid;
      else hi = mid;
    }
    // inside the next key's blend window? smoothstep prev spec -> next spec
    const H = Math.max(60, keys[hi].h ?? CAM_BLEND_VH * vh);
    const t = (bandY - (keys[hi].y - H)) / (2 * H);
    // release the clamp only when BOTH blend partners are overview keys - an OR
// here let the finale's noClamp leak backward across the whole last-transit
// blend, so the Frankfurt->Chicago camera abandoned the marker and panned
// west with no zoom (user 2025-09-15)
    const noClamp = keys[lo].noClamp === true && keys[hi].noClamp === true;
    if (t <= 0) return fin(specOf(keys[lo]), noClamp);
    const sBlend = t >= 1 ? 1 : t * t * (3 - 2 * t);
    const a = specOf(keys[lo]);
    const b = specOf(keys[hi]);
    if (!a || !b) return fin(a ?? b, noClamp);
    const zA = a.zoom ?? b.zoom ?? 12;
    const zB = b.zoom ?? a.zoom ?? 12;
    return {
      lng: a.lng + (b.lng - a.lng) * sBlend,
      lat: a.lat + (b.lat - a.lat) * sBlend,
      zoom: zA + (zB - zA) * sBlend,
      noClamp,
    };
  };

  useEffect(() => {
    if (!mapCreated || state.mode !== "story") return;
    let raf = 0;
    const zoomFastUntilRef = { current: 0 };
    const zoomBigGapRef = { current: 0 }; // largest zoom gap seen in the current move
    // landing-zone state: fixed-duration ease onto the target once residuals
    // are small, so the exponential tail stops re-rendering the map
    const landRef = {
      current: null as null | {
        t0: number;
        from: { lng: number; lat: number; zoom: number };
        to: { lng: number; lat: number; zoom: number };
      },
    };
    let last = performance.now();
    // resume smoothly from wherever the camera currently is (also covers
    // returning from explore mode: glide back to the story instead of snapping)
    const map0 = mapRef.current;
    if (map0 && !camRef.current) {
      camRef.current = { lng: map0.getCenter().lng, lat: map0.getCenter().lat, zoom: map0.getZoom() };
    }
    const CENTER_TAU_MS = 250; // smaller = snappier center follow (marker is already spring-damped)
    const ZOOM_TAU_MS = 1100;  // larger = calmer zoom transitions
    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const map = mapRef.current;
      const bandY = window.scrollY + window.innerHeight * 0.475;
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
        // entering a continent-scale transit the target center runs far ahead
        // of the zoom-out — pull it back toward the marker ("zoom first, then
        // pan") so readers never lose the dot. Released for intro/finale
        // overviews, where the whole route is the point.
        const m = posRef.current;
        const merc = (lat: number) => {
          const phi = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
          return (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2;
        };
        const scale = 512 * Math.pow(2, cam.zoom);
        const R = 0.38 * Math.min(camViewportRef.current.vw, camViewportRef.current.vh);
        // marker already off-screen at the current zoom: collapse the zoom
        // fast so the overview lands before the racing marker is lost for
        // seconds (Frankfurt->Chicago entry; d0-2's EWR layover pin never
        // trips this path, so its approved entry is unchanged)
        const mDx = ((m.lng - cam.lng) / 360) * scale;
        const mDy = (merc(m.lat) - merc(cam.lat)) * scale;
        const offscreen = tgt.zoom < cam.zoom && Math.hypot(mDx, mDy) > R;
        // while collapsing, pull the target center to 0.6R of the marker:
        // the center's chase lag (tau 130ms against a fast-racing target)
        // used to add ~0.3-0.8R on top of the clamp radius, peaking the
        // marker at up to 1.8R during fast scrubs (d16-3 entry)
        const Rc = offscreen ? R * 0.6 : R;
        if (!ev.noClamp) {
          const dx = ((tgt.lng - m.lng) / 360) * scale;
          const dy = (merc(tgt.lat) - merc(m.lat)) * scale;
          const dist = Math.hypot(dx, dy);
          if (dist > Rc) {
            const f = Rc / dist;
            tgt.lng = m.lng + (tgt.lng - m.lng) * f;
            tgt.lat = m.lat + (tgt.lat - m.lat) * f;
          }
        }
        const aC = 1 - Math.exp(-dt / CENTER_TAU_MS);
        // adaptive zoom speed: while casually scrolling the blended target
        // drifts and the gap stays small -> calm tau. Scrubbing the progress
        // bar or jumping days teleports the target, and a fixed 1100ms tau
        // left the map zooming for seconds after the marker had arrived.
        // LATCH, not per-frame tiers: a plain gap threshold drops back to the
        // slow tau as soon as the gap narrows, and the last ~0.3 zoom units
        // crawl for seconds (measured). Once a big gap is seen, stay fast for
        // 1s (re-armed every big-gap frame) so the WHOLE approach is quick.
        const zGap = Math.abs(tgt.zoom - cam.zoom);
        if (zGap > 1.5) {
          zoomFastUntilRef.current = now + 1400;
          if (zGap > zoomBigGapRef.current) zoomBigGapRef.current = zGap;
        }
        // R10 kept the WHOLE approach quick via a 1400ms latch, but
        // transit-scale moves (zoom gap 9+, e.g. 11.5 -> 2.2 into an ocean
        // crossing) still had ~1.4 units left when the latch expired and
        // then crawled at the calm 1100ms tau for ~3.5s (measured 8-10s
        // total entry vs ~2s for ordinary scrubs). Moves that started big
        // stay on the fast tau until the landing zone takes over; ordinary
        // moves keep the approved R10 behavior.
        const bigMove = zoomBigGapRef.current > 3 && zGap > 0.06;
        const zTau = now < zoomFastUntilRef.current || bigMove ? 360 : ZOOM_TAU_MS;
        if (zGap <= 0.06) zoomBigGapRef.current = 0;
        const aZ = 1 - Math.exp(-dt / zTau);
        const aZuse = offscreen ? 1 - Math.exp(-dt / 300) : aZ;
        const aCuse = offscreen ? 1 - Math.exp(-dt / 130) : aC;
        const dLng = tgt.lng - cam.lng;
        const dLat = tgt.lat - cam.lat;
        const dZoom = tgt.zoom - cam.zoom;
        // LANDING ZONE: the exponential tail never reaches the target - it
        // keeps nudging the transform by sub-pixel amounts for ~10s, and on
        // raster basemaps (satellite/terrain) every re-render re-samples the
        // imagery, reading as seconds of shimmer after a scrub (measured:
        // ~680 jumpTo calls in the 12s after a jump). Once BOTH residuals
        // are small, ease onto the target in a fixed 300ms and stop
        // rendering for good; a fresh scrub aborts the landing back to
        // chasing (thresholds below the abort values so completion is exact).
        const remPx = Math.hypot((dLng / 360) * scale, (merc(tgt.lat) - merc(cam.lat)) * scale);
        const ld = landRef.current;
        if (ld) {
          const moved =
            Math.hypot(((tgt.lng - ld.to.lng) / 360) * scale, (merc(tgt.lat) - merc(ld.to.lat)) * scale) > 1.5 ||
            Math.abs(tgt.zoom - ld.to.zoom) > 0.01;
          if (moved) landRef.current = null;
        }
        if (
          !landRef.current &&
          Math.abs(dZoom) < 0.06 &&
          remPx < 15 &&
          (Math.abs(dZoom) > 1e-4 || remPx > 1)
        ) {
          landRef.current = {
            t0: now,
            from: { lng: cam.lng, lat: cam.lat, zoom: cam.zoom },
            to: { lng: tgt.lng, lat: tgt.lat, zoom: tgt.zoom },
          };
        }
        const landNow = landRef.current;
        if (landNow) {
          const u = Math.min(1, (now - landNow.t0) / 300);
          const sL = u * u * (3 - 2 * u);
          cam.lng = landNow.from.lng + (landNow.to.lng - landNow.from.lng) * sL;
          cam.lat = landNow.from.lat + (landNow.to.lat - landNow.from.lat) * sL;
          cam.zoom = landNow.from.zoom + (landNow.to.zoom - landNow.from.zoom) * sL;
          if (u >= 1) {
            // land on the LIVE target (abort threshold keeps it within
            // 1.5px / 0.01 zoom of the captured one) so the loop goes quiet
            cam.lng = tgt.lng;
            cam.lat = tgt.lat;
            cam.zoom = tgt.zoom;
            landRef.current = null;
          }
        } else {
          cam.lng += dLng * aCuse;
          cam.lat += dLat * aCuse;
          cam.zoom += dZoom * aZuse;
        }
        // hard clamp on the camera center: the target-side clamp above leaves
        // the center's chase lag (v_marker * tau) stacked on top of Rc, and
        // during day-jump sweeps the spring moves the marker far faster than
        // any chase tau can follow. Enforce the contract directly - the
        // correction is radial and continuous, so the camera simply rides
        // Rc behind the marker until the sweep settles.
        if (!ev.noClamp) {
          const cdx = ((m.lng - cam.lng) / 360) * scale;
          const cdy = (merc(m.lat) - merc(cam.lat)) * scale;
          const cdist = Math.hypot(cdx, cdy);
          if (cdist > Rc) {
            const f2 = 1 - Rc / cdist;
            cam.lng += (m.lng - cam.lng) * f2;
            cam.lat += (m.lat - cam.lat) * f2;
          }
        }
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
    const fc = routeFeatureCollection(
      track,
      state.pointIdx,
      state.currentTime,
      finaleModeRef.current,
      state.position
    );
    routeFCRef.current = fc;
    (map.getSource("route") as GeoJSONSource | undefined)?.setData(fc);
    const pf: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
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
    <div className="map-pane">
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
    </div>
  );
}
