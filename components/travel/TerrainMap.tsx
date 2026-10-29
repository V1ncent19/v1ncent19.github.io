"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { GeoJSONSource, Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LogLang } from "@/lib/travel/log/types";
import { TERRAIN_COMPLETE_SCENE_ID, TERRAIN_INTRO_SCENE_ID, type TerrainTravelData } from "@/lib/travel/terrain";
import type { TerrainReadingState } from "./TerrainTravelLog";
import MapToolbar from "./log/MapToolbar";
import ResumeStoryButton from "./ResumeStoryButton";
import { useMapSplit } from "@/lib/travel/map-split";
import { applyTheme, getThemeSnapshot, subscribeTheme, THEME_SERVER_SNAPSHOT } from "@/lib/theme";
import type { Theme } from "@/lib/site";
import { Satellite } from "lucide-react";

// Full z13 contour envelope plus one complete tile ring around the route.
const TERRAIN_BOUNDS: [number, number, number, number] = [-91.0107421875, 14.34954783718537, -90.615234375, 14.689881366618769];
const COMPLETE_CAMERA = { center: [-90.8053, 14.5471] as [number, number], zoom: 10.5, pitch: 56, bearing: -135 };
const COMPLETE_ORBIT_MS = 48_000;
const COMPLETE_ORBIT_DELAY_MS = 2_100;
const DEFAULT_MOUNTAIN_ZOOM_MARGIN = 0.75;
const MOUNTAIN_ZOOM_MARGINS: Record<string, number> = {
  trailhead: 0.15,
  "high-traverse": 0.3,
  camp: 0.2,
  "fuego-crossing": 0.15,
  "night-return": 0.15,
  "eruption-night": 0.2,
  descent: 0.15,
};
const ROUTE_FRAME_TARGETS: Record<string, { x: number; y: number }> = {
  trailhead: { x: 0.5, y: 0.633 },
  "cloud-forest": { x: 0.5, y: 0.633 },
  "high-traverse": { x: 0.5, y: 0.64 },
  camp: { x: 0.5, y: 0.69 },
  "fuego-crossing": { x: 0.52, y: 0.52 },
  "night-return": { x: 0.52, y: 0.52 },
  "eruption-night": { x: 0.5, y: 0.56 },
  descent: { x: 0.5, y: 0.633 },
};
const FIXED_CAMERA_SCENES = new Set(["trailhead", "high-traverse", "camp", "fuego-crossing", "night-return", "eruption-night", "descent"]);
const LOCKED_CAMERA_SCENES = new Set(["fuego-crossing", "night-return"]);
const FIXED_CAMERA_OFFSET_RATIOS: Record<string, number> = {
  trailhead: 0.2,
  "high-traverse": 0.24,
  camp: 0.24,
  "fuego-crossing": 0.34,
  "night-return": 0.34,
  "eruption-night": 0.24,
  descent: 0.2,
};
const FIXED_CAMERA_HORIZONTAL_OFFSET_RATIOS: Record<string, number> = {
  "fuego-crossing": 0.18,
  "night-return": 0.18,
};
const CAMERA_FRAMING_SCENE_IDS: Record<string, string> = {
  "eruption-night": "camp",
  descent: "trailhead",
};
const MACRO_CAMERA_SCENES = new Set([
  TERRAIN_INTRO_SCENE_ID,
  TERRAIN_COMPLETE_SCENE_ID,
  "antigua-dawn",
  "trailhead",
  "return-antigua",
]);
const PLACE_MARKER_OFFSETS: Record<string, [number, number]> = {
  acatenango: [0, -36],
  fuego: [0, -12],
};
const WAYPOINT_IDS = new Set(["trail-start", "camp"]);
const WAYPOINT_REVEAL_METERS = 420;
const PHOTO_ACCENT_LIGHT = "#e56f2d";
const PHOTO_ACCENT_DARK = "#ff9851";
const MAX_CAMERA_PROJECTION_SAMPLES = 96;
const MAX_POPUP_ROUTE_SAMPLES = 140;

type PhotoPopupPlacement = {
  x: number;
  y: number;
  markerX: number;
  markerY: number;
  cornerX: number;
  cornerY: number;
  connected: boolean;
};

function distanceMeters(a: readonly [number, number], b: readonly [number, number]) {
  const radians = Math.PI / 180;
  const lat1 = a[1] * radians;
  const lat2 = b[1] * radians;
  const dLat = (b[1] - a[1]) * radians;
  const dLon = (b[0] - a[0]) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(h));
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function lngLatPair(value: unknown): [number, number] | null {
  if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") return [value[0], value[1]];
  if (!value || typeof value !== "object") return null;
  const candidate = value as { lng?: unknown; lon?: unknown; lat?: unknown };
  const lon = typeof candidate.lng === "number" ? candidate.lng : candidate.lon;
  return typeof lon === "number" && typeof candidate.lat === "number" ? [lon, candidate.lat] : null;
}

function projectTerrainPoint(map: MLMap, coordinate: readonly [number, number]) {
  // Map.project deliberately passes the active Terrain instance into
  // locationToScreenPoint. Calling transform.locationToScreenPoint directly
  // omits that second argument and projects the coordinate at sea level. At
  // this page's 55–70° pitch that can miss a 3,500 m marker by tens of pixels,
  // which is why the old connector appeared to point at empty terrain.
  return map.project([coordinate[0], coordinate[1]]);
}

function appendWaypointIcon(element: HTMLDivElement, id: string, label: string) {
  const icon = document.createElement("span");
  icon.className = "terrain-waypoint-icon";
  icon.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", id === "camp"
    ? "M2 13 8 3l6 10M5 13l3-5 3 5M2 13h12"
    : "M5 14V2m0 1h6L9.5 5 11 7H5");
  svg.append(path);
  icon.append(svg);
  const bubble = document.createElement("span");
  bubble.className = "terrain-waypoint-bubble";
  bubble.textContent = label;
  element.append(icon, bubble);
}

function pointAt(data: TerrainTravelData, index: number) {
  const max = data.route.points.length - 1;
  const value = Math.max(0, Math.min(max, index));
  const a = Math.floor(value);
  const b = Math.min(max, a + 1);
  const t = value - a;
  const p = data.route.points[a];
  const q = data.route.points[b];
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t] as const;
}

function evenlySample<T>(values: readonly T[], maxSamples: number): T[] {
  if (values.length <= maxSamples) return [...values];
  const last = values.length - 1;
  return Array.from({ length: maxSamples }, (_, index) => values[Math.round(index * last / (maxSamples - 1))]);
}

function progressCoordinates(data: TerrainTravelData, routeCoordinates: readonly [number, number][], index: number): [number, number][] {
  const end = Math.max(0, Math.min(routeCoordinates.length - 1, index));
  const whole = routeCoordinates.slice(0, Math.floor(end) + 1);
  const p = pointAt(data, end);
  if (end % 1 && whole.length) whole.push([p[0], p[1]]);
  return whole.length > 1 ? whole : [whole[0], whole[0]].filter(Boolean) as [number, number][];
}

function styleFor(dark: boolean): StyleSpecification {
  const [west, south, east, north] = TERRAIN_BOUNDS;
  const frame = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [[west, south], [east, south], [east, north], [west, north], [west, south]],
    },
  };
  const mask = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "MultiPolygon" as const,
      coordinates: [
        [[[-92, 13.5], [west, 13.5], [west, 15.5], [-92, 15.5], [-92, 13.5]]],
        [[[east, 13.5], [-89.5, 13.5], [-89.5, 15.5], [east, 15.5], [east, 13.5]]],
        [[[west, 13.5], [east, 13.5], [east, south], [west, south], [west, 13.5]]],
        [[[west, north], [east, north], [east, 15.5], [west, 15.5], [west, north]]],
      ],
    },
  };
  return {
    version: 8,
    sources: {
      "guatemala-dem": {
        type: "raster-dem",
        tiles: ["/assets/terrain/guatemala/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 14,
        bounds: TERRAIN_BOUNDS,
        encoding: "terrarium",
        attribution: "Mapzen Terrain Tiles / AWS Open Data",
      },
      // MapLibre recommends a distinct source for hillshade when the same DEM
      // also drives 3D terrain; sharing it can reduce render quality.
      "guatemala-hillshade": {
        type: "raster-dem",
        tiles: ["/assets/terrain/guatemala/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 14,
        bounds: TERRAIN_BOUNDS,
        encoding: "terrarium",
      },
      "guatemala-surface": {
        type: "raster",
        tiles: ["/assets/terrain/guatemala-tint/{z}/{x}/{y}.webp"],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 14,
        bounds: TERRAIN_BOUNDS,
      },
      "guatemala-contour-lines": {
        type: "geojson",
        data: "/assets/terrain/guatemala-contours.geojson",
        maxzoom: 14,
        buffer: 48,
        tolerance: 0.75,
      },
      "terrain-frame": { type: "geojson", data: frame },
      "terrain-frame-mask": { type: "geojson", data: mask },
      "guatemala-satellite": {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 18,
        attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
      },
      route: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } },
      progress: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } },
      cursor: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } } },
      photos: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      { id: "terrain-paper", type: "background", paint: { "background-color": dark ? "#181a19" : "#e9e9e5" } },
      { id: "terrain-surface", type: "raster", source: "guatemala-surface", paint: {
        "raster-opacity": 1,
        "raster-saturation": -1,
        "raster-contrast": dark ? 0.12 : 0.02,
        "raster-brightness-min": dark ? 0.1 : 0,
        "raster-brightness-max": dark ? 0.56 : 1,
      } },
      { id: "terrain-satellite", type: "raster", source: "guatemala-satellite", layout: { visibility: "none" }, paint: { "raster-saturation": -0.12, "raster-contrast": 0.12 } },
      { id: "terrain-relief", type: "hillshade", source: "guatemala-hillshade", paint: {
        "hillshade-exaggeration": 0.2,
        "hillshade-shadow-color": dark ? "#090b0a" : "#6e7471",
        "hillshade-highlight-color": dark ? "#626764" : "#ffffff",
        "hillshade-accent-color": dark ? "#343936" : "#aeb2af",
      } },
      { id: "contour-minor", type: "line", source: "guatemala-contour-lines", filter: ["==", ["get", "major"], 0], layout: {
        "line-cap": "round", "line-join": "round",
      }, paint: {
        "line-color": dark ? "#a9b2ae" : "#68716d",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.35, 12, 0.65, 15, 1.05],
        "line-opacity": dark ? 0.34 : 0.3,
      } },
      { id: "contour-major", type: "line", source: "guatemala-contour-lines", filter: ["==", ["get", "major"], 1], layout: {
        "line-cap": "round", "line-join": "round",
      }, paint: {
        "line-color": dark ? "#d0d6d3" : "#4d5752",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.55, 12, 1, 15, 1.55],
        "line-opacity": dark ? 0.5 : 0.46,
      } },
      { id: "terrain-frame-mask", type: "fill", source: "terrain-frame-mask", paint: {
        "fill-color": dark ? "#181a19" : "#e9e9e5",
        "fill-opacity": 1,
        "fill-antialias": false,
      } },
      { id: "terrain-frame-aura", type: "line", source: "terrain-frame", layout: {
        "line-cap": "round", "line-join": "round",
      }, paint: {
        "line-color": dark ? "#d9fff8" : "#fffdf6",
        "line-width": 34,
        "line-blur": 20,
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.28, 10.5, 0.56, 12.5, 0.34, 15, 0.2],
      } },
      { id: "terrain-frame-bloom", type: "line", source: "terrain-frame", layout: {
        "line-cap": "round", "line-join": "round",
      }, paint: {
        "line-color": dark ? "#e9fffb" : "#fffffb",
        "line-width": 12,
        "line-blur": 6,
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.34, 10.5, 0.72, 12.5, 0.42, 15, 0.24],
      } },
      { id: "terrain-frame-rim", type: "line", source: "terrain-frame", layout: {
        "line-cap": "round", "line-join": "round",
      }, paint: {
        "line-color": dark ? "#f5fffd" : "#ffffff",
        "line-width": 1.4,
        "line-blur": 0.35,
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 10.5, 0.96, 12.5, 0.72, 15, 0.5],
      } },
      { id: "route-shadow", type: "line", source: "route", paint: { "line-color": dark ? "#07110f" : "#f7f2e8", "line-width": 4.2, "line-opacity": 0.78 } },
      { id: "route-full", type: "line", source: "route", paint: { "line-color": dark ? "#78b7c9" : "#729cac", "line-width": 1.55, "line-opacity": 0.82, "line-dasharray": [1.2, 1.4] } },
      { id: "route-progress", type: "line", source: "progress", paint: { "line-color": dark ? "#3ccfff" : "#1ba7c9", "line-width": 2.95, "line-opacity": 0.98 } },
      { id: "photo-halo", type: "circle", source: "photos", paint: { "circle-radius": 6.2, "circle-color": dark ? "#18110d" : "#fff8ef", "circle-opacity": 0.92 } },
      { id: "photo-points", type: "circle", source: "photos", paint: { "circle-radius": 3.5, "circle-color": dark ? PHOTO_ACCENT_DARK : PHOTO_ACCENT_LIGHT, "circle-stroke-width": 0 } },
      { id: "cursor-halo", type: "circle", source: "cursor", paint: { "circle-radius": 10, "circle-color": dark ? "#3ccfff" : "#1ba7c9", "circle-opacity": 0.2 } },
      { id: "cursor-dot", type: "circle", source: "cursor", paint: { "circle-radius": 5.2, "circle-color": dark ? "#75ddf7" : "#1ba7c9", "circle-stroke-color": dark ? "#171d1c" : "#fffaf0", "circle-stroke-width": 2 } },
    ],
  };
}

function ContourIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 7.2c2.5-2.8 5.1-3.7 8-2.7 2.7.9 3.7 3.2 6.5 3.2 1.1 0 2-.2 2.5-.5" />
    <path d="M3.5 12c2.2-2.2 4.7-2.8 7.3-1.8 2.9 1.1 4.3 3.2 7.2 3.2 1 0 1.8-.2 2.5-.5" />
    <path d="M3.5 16.8c2-1.7 4.2-2.1 6.5-1.2 3 1.2 4.8 3.1 8 3.1 1 0 1.8-.2 2.5-.5" />
  </svg>;
}

export default function TerrainMap({ data, reading, lang, onMapReady, onNavigateScene }: {
  data: TerrainTravelData;
  reading: TerrainReadingState;
  lang: LogLang;
  onMapReady: () => void;
  onNavigateScene: (id: string) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const readingRef = useRef(reading);
  const onReadyRef = useRef(onMapReady);
  const onNavigateRef = useRef(onNavigateScene);
  const previousCameraSceneRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(true);
  const [surface, setSurface] = useState<"topo" | "satellite">("topo");
  const [popup, setPopup] = useState<PhotoPopupPlacement | null>(null);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => THEME_SERVER_SNAPSHOT);
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const { mountColumn, renderHandle } = useMapSplit();
  const activeScene = data.scenes.find(scene => scene.id === reading.sceneId) ?? data.scenes[0];
  const intro = reading.sceneId === TERRAIN_INTRO_SCENE_ID;
  const complete = reading.sceneId === TERRAIN_COMPLETE_SCENE_ID;
  const overviewScene = intro || complete;
  const activeCamera = overviewScene ? COMPLETE_CAMERA : activeScene.camera;
  const cameraSceneId = intro ? TERRAIN_INTRO_SCENE_ID : complete ? TERRAIN_COMPLETE_SCENE_ID : activeScene.id;
  const activePhoto = data.photos.find(photo => photo.id === reading.photoId) ?? null;
  const current = useMemo(() => pointAt(data, reading.routeIndex), [data, reading.routeIndex]);
  const routeRenderIndex = Math.round(reading.routeIndex * 4) / 4;

  useEffect(() => { readingRef.current = reading; }, [reading]);
  useEffect(() => { onReadyRef.current = onMapReady; }, [onMapReady]);
  useEffect(() => { onNavigateRef.current = onNavigateScene; }, [onNavigateScene]);

  const routeCoordinates = useMemo(() => data.route.points.map(point => [point[0], point[1]] as [number, number]), [data.route.points]);
  const popupRouteSamples = useMemo(() => evenlySample(data.route.points, MAX_POPUP_ROUTE_SAMPLES), [data.route.points]);
  const routeFeature = useMemo(() => ({
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: routeCoordinates },
  }), [routeCoordinates]);
  const photoFeatures = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: data.photos.map(photo => ({ type: "Feature" as const, properties: { id: photo.id }, geometry: { type: "Point" as const, coordinates: [photo.lon, photo.lat] } })),
  }), [data.photos]);

  useEffect(() => {
    let map: MLMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame = 0;
    let readyFallback = 0;
    let releaseReady: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !holderRef.current) return;
      map = new maplibre.Map({
        container: holderRef.current,
        style: styleFor(document.documentElement.classList.contains("dark")),
        // The opening curtain hides tile preparation. Start at the overview
        // itself so the first revealed frame never has to fly back out from
        // the Antigua chapter camera.
        center: COMPLETE_CAMERA.center,
        zoom: COMPLETE_CAMERA.zoom,
        pitch: COMPLETE_CAMERA.pitch,
        bearing: COMPLETE_CAMERA.bearing,
        maxPitch: 82,
        minZoom: 8.5,
        maxZoom: 16,
        cooperativeGestures: true,
        attributionControl: false,
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        if (!map) return;
        (map.getSource("route") as GeoJSONSource).setData(routeFeature);
        (map.getSource("photos") as GeoJSONSource).setData(photoFeatures);
        map.setTerrain({ source: "guatemala-dem", exaggeration: 1.06 });
        for (const place of data.places) {
          const element = document.createElement("div");
          const waypoint = WAYPOINT_IDS.has(place.id);
          element.className = `terrain-place terrain-place-${place.id}${waypoint ? " terrain-place-waypoint" : ""}`;
          if (waypoint) {
            appendWaypointIcon(element, place.id, place.label);
            element.setAttribute("aria-label", place.label);
            if (place.routeIndex != null) element.dataset.routeIndex = String(place.routeIndex);
          } else {
            element.textContent = place.label;
          }
          new maplibre.Marker({
            element,
            anchor: "bottom",
            offset: PLACE_MARKER_OFFSETS[place.id] ?? [0, 0],
            pitchAlignment: "viewport",
            rotationAlignment: "viewport",
            subpixelPositioning: true,
          }).setLngLat([place.lon, place.lat]).addTo(map);
        }
        map.on("click", "photo-points", event => {
          const id = String(event.features?.[0]?.properties?.id ?? "");
          const scene = data.scenes.find(item => item.photos.some(photo => photo.id === id));
          if (scene) onNavigateRef.current(scene.id);
        });
        map.on("mouseenter", "photo-points", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "photo-points", () => { if (map) map.getCanvas().style.cursor = ""; });
        let released = false;
        releaseReady = () => {
          if (released || cancelled) return;
          released = true;
          window.clearTimeout(readyFallback);
          previousCameraSceneRef.current = TERRAIN_INTRO_SCENE_ID;
          readyRef.current = true;
          setFollow(true);
          setReady(true);
          onReadyRef.current();
        };
        // Wait for the terrain and route to paint while the entry sheet is
        // still closed. The fallback prevents a slow tile from blocking the
        // article indefinitely; TravelLogShell adds one final reveal beat.
        map.once("idle", releaseReady);
        readyFallback = window.setTimeout(releaseReady, 1_800);
      });
      const manual = () => setFollow(false);
      map.on("dragstart", manual);
      map.on("wheel", manual);
      map.on("touchstart", manual);
      // ResizeObserver can fire while MapLibre is still draining its render
      // task queue (notably during a smooth chapter jump). Defer and collapse
      // those notifications so resize() never re-enters the renderer.
      resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => map?.resize());
      });
      resizeObserver.observe(holderRef.current);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(resizeFrame);
      window.clearTimeout(readyFallback);
      if (map && releaseReady) map.off("idle", releaseReady);
      resizeObserver?.disconnect();
      mapRef.current = null;
      map?.remove();
    };
  }, [data, photoFeatures, routeFeature]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const coords = progressCoordinates(data, routeCoordinates, intro ? routeCoordinates.length - 1 : routeRenderIndex);
    (map.getSource("progress") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }, [ready, data, routeCoordinates, intro, routeRenderIndex]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    (map.getSource("cursor") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [current[0], current[1]] } });
  }, [ready, current]);

  useEffect(() => {
    if (!ready || !holderRef.current) return;
    for (const place of data.places) {
      if (!WAYPOINT_IDS.has(place.id)) continue;
      const marker = holderRef.current.querySelector<HTMLElement>(`.terrain-place-${place.id}`);
      const near = !overviewScene && distanceMeters([current[0], current[1]], [place.lon, place.lat]) <= WAYPOINT_REVEAL_METERS;
      marker?.classList.toggle("is-near", near);
    }
  }, [ready, data.places, overviewScene, current]);

  // The route cursor advances continuously, but the viewpoint belongs to the
  // chapter. Mountain chapters therefore read as composed side views rather
  // than a GPS-locked camera that can point into empty terrain.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !follow) return;
    if (overviewScene && previousCameraSceneRef.current === cameraSceneId) return;
    // A progress-rail jump can cross several chapters before smooth scrolling
    // settles. Stop the superseded camera so the next composed transition
    // starts from the currently rendered view instead of an obsolete target.
    map.stop();
    const isMountainSideView = !["antigua-dawn", "return-antigua", TERRAIN_INTRO_SCENE_ID, TERRAIN_COMPLETE_SCENE_ID].includes(cameraSceneId);
    const fitChapterRoute = isMountainSideView || cameraSceneId === "antigua-dawn";
    const width = holderRef.current?.clientWidth ?? 900;
    const height = holderRef.current?.clientHeight ?? 700;
    const framingSceneId = CAMERA_FRAMING_SCENE_IDS[cameraSceneId];
    const framingScene = framingSceneId
      ? data.scenes.find(scene => scene.id === framingSceneId) ?? activeScene
      : activeScene;
    const segment = fitChapterRoute
      ? data.route.points.slice(framingScene.route[0], framingScene.route[1] + 1)
      : [];
    const fixedOffsetRatio = FIXED_CAMERA_OFFSET_RATIOS[cameraSceneId];
    const verticalOffset = fixedOffsetRatio != null
      ? Math.min(260, height * fixedOffsetRatio)
      : isMountainSideView ? Math.min(100, height * 0.1)
        : 0;
    const horizontalOffset = width * (FIXED_CAMERA_HORIZONTAL_OFFSET_RATIOS[cameraSceneId] ?? 0);
    let center = activeCamera.center;
    let zoom = activeCamera.zoom;
    if (fitChapterRoute && !LOCKED_CAMERA_SCENES.has(cameraSceneId)) {
      const lons = segment.map(point => point[0]);
      const lats = segment.map(point => point[1]);
      const fitted = map.cameraForBounds([
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ], {
        bearing: activeCamera.bearing,
        maxZoom: activeCamera.zoom,
        padding: {
          top: Math.round(height * 0.16),
          right: Math.round(width * 0.13),
          bottom: Math.round(height * 0.16),
          left: Math.round(width * 0.13),
        },
      });
      const fittedCenter = lngLatPair(fitted?.center);
      if (fittedCenter && fitted?.zoom != null) {
        center = fittedCenter;
        const zoomMargin = cameraSceneId === "antigua-dawn"
          ? 0.2
          : (MOUNTAIN_ZOOM_MARGINS[cameraSceneId] ?? DEFAULT_MOUNTAIN_ZOOM_MARGIN);
        zoom = Math.min(activeCamera.zoom, fitted.zoom) - zoomMargin;
      }
    }
    const previousSceneId = previousCameraSceneRef.current;
    const macroTransition = previousSceneId === null
      || MACRO_CAMERA_SCENES.has(previousSceneId)
      || MACRO_CAMERA_SCENES.has(cameraSceneId);
    let targetCenter = center;
    let targetZoom = zoom;
    let targetOffset: [number, number] = [horizontalOffset, verticalOffset];
    if (isMountainSideView && !FIXED_CAMERA_SCENES.has(cameraSceneId) && segment.length) {
      const previousCamera = {
        center: lngLatPair(map.getCenter()) ?? activeCamera.center,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      };
      // Resolve the terrain-aware screen correction synchronously at the
      // destination camera, then restore the current view before the browser
      // paints. The visible transition can therefore travel directly to the
      // corrected camera instead of finishing with a second linear pan.
      map.easeTo({
        center,
        zoom,
        pitch: activeCamera.pitch,
        bearing: activeCamera.bearing,
        offset: targetOffset,
        duration: 0,
      });
      const projected = evenlySample(segment, MAX_CAMERA_PROJECTION_SAMPLES)
        .map(point => projectTerrainPoint(map, [point[0], point[1]]));
      const xs = projected.map(point => point.x);
      const ys = projected.map(point => point.y);
      const routeX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const routeY = (Math.min(...ys) + Math.max(...ys)) / 2;
      const horizontalGain = activeCamera.bearing <= -120 ? 3.6 : 1.85;
      const frameTarget = ROUTE_FRAME_TARGETS[cameraSceneId] ?? { x: 0.5, y: 0.52 };
      // Pitched terrain turns a screen-space pan into a smaller visual shift;
      // compensate once rather than iterating, which can overshoot near ridges.
      const correction: [number, number] = [
        (routeX - width * frameTarget.x) * horizontalGain,
        (height * frameTarget.y - routeY) * 1.85,
      ];
      const resolvedCenter = Math.hypot(...correction) < 14
        ? map.getCenter()
        : map.unproject([width / 2 + correction[0], height / 2 + correction[1]]);
      targetCenter = [resolvedCenter.lng, resolvedCenter.lat];
      targetZoom = map.getZoom();
      targetOffset = [0, 0];
      map.jumpTo(previousCamera);
    }
    const cameraOptions = {
      center: targetCenter,
      zoom: targetZoom,
      pitch: activeCamera.pitch,
      bearing: activeCamera.bearing,
      // A small downward correction compensates for terrain elevation without
      // pushing the active route out of the visual centre.
      offset: targetOffset,
      duration: macroTransition ? 1_850 : 1_350,
      easing: smoothstep,
      essential: true,
    };
    if (macroTransition) {
      map.flyTo({ ...cameraOptions, curve: 1.18 });
    } else {
      map.easeTo(cameraOptions);
    }
    previousCameraSceneRef.current = cameraSceneId;
  }, [ready, follow, overviewScene, activeCamera, activeScene, cameraSceneId, data.route.points, data.scenes]);

  // Reaching the finale turns the fixed overview into a slow orbit around the
  // full route. The chapter camera settles first; direct map interaction exits
  // follow mode and therefore cancels the loop immediately.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !follow || !overviewScene) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;
    const orbitStart = performance.now() + (intro ? 0 : COMPLETE_ORBIT_DELAY_MS);
    let frame = 0;
    let lastOrbitUpdate = 0;
    const orbit = (now: number) => {
      if (now >= orbitStart && now - lastOrbitUpdate >= 32) {
        lastOrbitUpdate = now;
        const phase = ((now - orbitStart) % COMPLETE_ORBIT_MS) / COMPLETE_ORBIT_MS;
        map.setBearing(COMPLETE_CAMERA.bearing + phase * 360);
      }
      frame = requestAnimationFrame(orbit);
    };
    frame = requestAnimationFrame(orbit);
    return () => cancelAnimationFrame(frame);
  }, [ready, follow, overviewScene, intro]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const setPaint = (id: string, prop: string, value: unknown) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, value); };
    setPaint("terrain-paper", "background-color", dark ? "#181a19" : "#e9e9e5");
    setPaint("terrain-relief", "hillshade-shadow-color", dark ? "#090b0a" : "#6e7471");
    setPaint("terrain-relief", "hillshade-highlight-color", dark ? "#626764" : "#ffffff");
    setPaint("terrain-frame-mask", "fill-color", dark ? "#181a19" : "#e9e9e5");
    setPaint("terrain-frame-aura", "line-color", dark ? "#d9fff8" : "#fffdf6");
    setPaint("terrain-frame-bloom", "line-color", dark ? "#e9fffb" : "#fffffb");
    setPaint("terrain-frame-rim", "line-color", dark ? "#f5fffd" : "#ffffff");
    setPaint("terrain-surface", "raster-opacity", 1);
    setPaint("terrain-surface", "raster-saturation", -1);
    setPaint("terrain-surface", "raster-brightness-min", dark ? 0.1 : 0);
    setPaint("terrain-surface", "raster-brightness-max", dark ? 0.56 : 1);
    setPaint("contour-minor", "line-color", dark ? "#a9b2ae" : "#68716d");
    setPaint("contour-minor", "line-opacity", dark ? 0.34 : 0.3);
    setPaint("contour-major", "line-color", dark ? "#d0d6d3" : "#4d5752");
    setPaint("contour-major", "line-opacity", dark ? 0.5 : 0.46);
    setPaint("route-full", "line-color", dark ? "#78b7c9" : "#729cac");
    setPaint("route-progress", "line-color", dark ? "#3ccfff" : "#1ba7c9");
    setPaint("photo-halo", "circle-color", dark ? "#18110d" : "#fff8ef");
    setPaint("photo-points", "circle-color", dark ? PHOTO_ACCENT_DARK : PHOTO_ACCENT_LIGHT);
    setPaint("cursor-halo", "circle-color", dark ? "#3ccfff" : "#1ba7c9");
    setPaint("cursor-dot", "circle-color", dark ? "#75ddf7" : "#1ba7c9");
  }, [ready, dark, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setLayoutProperty("terrain-surface", "visibility", surface === "topo" ? "visible" : "none");
    map.setLayoutProperty("terrain-satellite", "visibility", surface === "satellite" ? "visible" : "none");
    map.setLayoutProperty("contour-minor", "visibility", surface === "topo" ? "visible" : "none");
    map.setLayoutProperty("contour-major", "visibility", surface === "topo" ? "visible" : "none");
    map.setLayoutProperty("terrain-frame-mask", "visibility", surface === "topo" ? "visible" : "none");
    map.setLayoutProperty("terrain-frame-aura", "visibility", surface === "topo" ? "visible" : "none");
    map.setLayoutProperty("terrain-frame-bloom", "visibility", surface === "topo" ? "visible" : "none");
    map.setLayoutProperty("terrain-frame-rim", "visibility", surface === "topo" ? "visible" : "none");
    map.setPaintProperty("terrain-relief", "hillshade-exaggeration", surface === "topo" ? 0.2 : 0.24);
  }, [ready, surface]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !activePhoto) { setPopup(null); return; }
    let placementFrame = 0;
    let placementTimer = 0;
    let lastPlacement = 0;
    const place = () => {
      const point = projectTerrainPoint(map, [activePhoto.lon, activePhoto.lat]);
      const width = holderRef.current?.clientWidth ?? 0;
      const height = holderRef.current?.clientHeight ?? 0;
      const popupWidth = width <= 560 ? 126 : 160;
      // Includes the card border; keep in sync with .terrain-map-photo.
      const popupHeight = width <= 560 ? 113 : 139;
      const routePixels = popupRouteSamples.map(routePoint => projectTerrainPoint(map, [routePoint[0], routePoint[1]]));
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const overlayRoot = holderRef.current?.parentElement;
      const holderRect = holderRef.current?.getBoundingClientRect();
      const blockers = holderRect ? Array.from(overlayRoot?.querySelectorAll<HTMLElement>(
        ".terrain-map-status, .terrain-map-tools, .terrain-place, .resume-story, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right",
      ) ?? []).map(element => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left - holderRect.left - 8,
          right: rect.right - holderRect.left + 8,
          top: rect.top - holderRect.top - 8,
          bottom: rect.bottom - holderRect.top + 8,
        };
      }) : [];
      const candidateAt = (x: number, y: number, ring: number) => {
        const placedX = clamp(x, 10, Math.max(10, width - popupWidth - 10));
        const placedY = clamp(y, 72, Math.max(72, height - popupHeight - 10));
        return { x: placedX, y: placedY, ring, clampDistance: Math.hypot(placedX - x, placedY - y) };
      };
      const candidates = [12, 48].flatMap((gap, ring) => [
        candidateAt(point.x + gap, point.y - popupHeight - gap, ring),
        candidateAt(point.x - popupWidth - gap, point.y - popupHeight - gap, ring),
        candidateAt(point.x + gap, point.y + gap, ring),
        candidateAt(point.x - popupWidth - gap, point.y + gap, ring),
        candidateAt(point.x + gap, point.y - popupHeight / 2, ring),
        candidateAt(point.x - popupWidth - gap, point.y - popupHeight / 2, ring),
        candidateAt(point.x - popupWidth / 2, point.y - popupHeight - gap, ring),
        candidateAt(point.x - popupWidth / 2, point.y + gap, ring),
      ]);
      const geometry = (candidate: { x: number; y: number }) => {
        const corners = [
          { x: candidate.x, y: candidate.y },
          { x: candidate.x + popupWidth, y: candidate.y },
          { x: candidate.x, y: candidate.y + popupHeight },
          { x: candidate.x + popupWidth, y: candidate.y + popupHeight },
        ];
        const corner = corners.reduce((nearest, currentCorner) =>
          Math.hypot(currentCorner.x - point.x, currentCorner.y - point.y)
            < Math.hypot(nearest.x - point.x, nearest.y - point.y) ? currentCorner : nearest);
        return { corner, connectorLength: Math.hypot(corner.x - point.x, corner.y - point.y) };
      };
      const score = (candidate: { x: number; y: number; ring: number; clampDistance: number }) => {
        const left = candidate.x;
        const right = candidate.x + popupWidth;
        const top = candidate.y;
        const bottom = candidate.y + popupHeight;
        const { connectorLength } = geometry(candidate);
        let penalty = connectorLength * 1.6 + candidate.ring * 28 + candidate.clampDistance * 45;
        for (const routePoint of routePixels) {
          if (Math.hypot(routePoint.x - point.x, routePoint.y - point.y) < 22) continue;
          const dx = Math.max(left - routePoint.x, 0, routePoint.x - right);
          const dy = Math.max(top - routePoint.y, 0, routePoint.y - bottom);
          const distance = Math.hypot(dx, dy);
          if (distance === 0) penalty += 60_000;
          else if (distance < 18) penalty += (18 - distance) * 70;
        }
        for (const blocker of blockers) {
          const overlapWidth = Math.max(0, Math.min(right, blocker.right) - Math.max(left, blocker.left));
          const overlapHeight = Math.max(0, Math.min(bottom, blocker.bottom) - Math.max(top, blocker.top));
          if (overlapWidth && overlapHeight) penalty += 80_000 + overlapWidth * overlapHeight;
        }
        return penalty;
      };
      const best = candidates.reduce((winner, candidate) => score(candidate) < score(winner) ? candidate : winner);
      const { corner, connectorLength } = geometry(best);
      const next = {
        x: best.x,
        y: best.y,
        markerX: point.x,
        markerY: point.y,
        cornerX: corner.x,
        cornerY: corner.y,
        connected: connectorLength > 30,
      };
      setPopup(previous => previous
        && previous.connected === next.connected
        && Math.abs(previous.x - next.x) < 0.75
        && Math.abs(previous.y - next.y) < 0.75
        && Math.abs(previous.markerX - next.markerX) < 0.75
        && Math.abs(previous.markerY - next.markerY) < 0.75
        ? previous : next);
    };
    const schedulePlace = () => {
      if (placementFrame || placementTimer) return;
      const wait = Math.max(0, 40 - (performance.now() - lastPlacement));
      if (wait > 0) {
        placementTimer = window.setTimeout(() => {
          placementTimer = 0;
          schedulePlace();
        }, wait);
        return;
      }
      placementFrame = requestAnimationFrame(() => {
        placementFrame = 0;
        lastPlacement = performance.now();
        place();
      });
    };
    place();
    map.on("move", schedulePlace);
    map.on("moveend", place);
    return () => {
      cancelAnimationFrame(placementFrame);
      window.clearTimeout(placementTimer);
      map.off("move", schedulePlace);
      map.off("moveend", place);
    };
  }, [ready, activePhoto, popupRouteSamples]);

  return <div className="terrain-map-col" data-log-map ref={mountColumn} data-follow={follow ? "true" : "false"}>
    <div className="terrain-map-box"><div ref={holderRef} className="terrain-map-canvas" />
      <div className="terrain-map-status">
        <span>{intro ? (lang === "zh" ? "开场 · 全程" : "Opening · Full route")
          : complete ? (lang === "zh" ? "完结 · 全程" : "Finale · Full route") : activeScene?.eyebrow}</span>
        <strong>{Math.round(current[2]).toLocaleString()} m</strong>
        <small>{intro ? (lang === "zh" ? "Antigua—Fuego 路线总览" : "Antigua—Fuego route overview")
          : complete ? (lang === "zh" ? "Antigua—Fuego 往返" : "Antigua—Fuego return") : activeScene?.title}</small>
      </div>
      <MapToolbar mode={theme} onTheme={(mode: Theme) => applyTheme(mode)} lang={lang} className="terrain-map-tools" groupClass="pj-tools-group" buttonClass="pj-tool-btn">
        <div className="terrain-surface-tools pj-tools-group" role="group" aria-label={lang === "zh" ? "地形表面" : "Terrain surface"}>
          <button type="button" className={`travel-log-icon-btn pj-tool-btn${surface === "topo" ? " on" : ""}`} aria-pressed={surface === "topo"}
            aria-label={lang === "zh" ? "素色等高线地形" : "Plain contour terrain"} data-tooltip={lang === "zh" ? "素色等高线地形" : "Plain contour terrain"}
            onClick={() => setSurface("topo")}><ContourIcon /></button>
          <button type="button" className={`travel-log-icon-btn pj-tool-btn${surface === "satellite" ? " on" : ""}`} aria-pressed={surface === "satellite"}
            aria-label={lang === "zh" ? "卫星影像地形" : "Satellite terrain"} data-tooltip={lang === "zh" ? "卫星影像地形" : "Satellite terrain"}
            onClick={() => setSurface("satellite")}><Satellite aria-hidden="true" strokeWidth={1.8} /></button>
        </div>
      </MapToolbar>
      {!follow && <ResumeStoryButton onResume={() => setFollow(true)} />}
      {activePhoto && popup?.connected && <svg className="terrain-photo-connector" aria-hidden="true">
        <line x1={popup.markerX} y1={popup.markerY} x2={popup.cornerX} y2={popup.cornerY} />
      </svg>}
      {activePhoto && popup && <figure className="terrain-map-photo" style={{ left: popup.x, top: popup.y }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activePhoto.src} alt="" />
        {activePhoto.kind === "video" && <span className="terrain-map-photo-video" aria-hidden="true">▶</span>}
        <figcaption>{activePhoto.shotAt.slice(11, 16)} · {activePhoto.altitudeM.toLocaleString()} m</figcaption>
      </figure>}
    </div>
    {renderHandle({ className: "terrain-attrib", children: <>
      <a href={data.attribution.terrainHref} target="_blank" rel="noopener noreferrer">{data.attribution.terrain}</a>
      <span>·</span><span>{surface === "satellite" ? "Imagery © Esri · " : ""}{data.attribution.basemap}</span>
    </> })}
  </div>;
}
