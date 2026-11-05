"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Compass, Mountain, Satellite } from "lucide-react";
import type { LogLang } from "@/lib/travel/log/types";
import type { ReconstructedData, ReconstructedPlace } from "@/lib/travel/reconstructed";
import { useMapSplit, MAP_SPLIT_EVENT } from "@/lib/travel/map-split";
import { applyTheme, getThemeSnapshot, subscribeTheme, THEME_SERVER_SNAPSHOT } from "@/lib/theme";
import type { Theme } from "@/lib/site";
import MapToolbar from "./log/MapToolbar";
import ResumeStoryButton from "./ResumeStoryButton";
import type { ReconstructedReading } from "./ReconstructedTravelLog";

const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const ESRI_STYLE = {
  version: 8 as const,
  sources: { esri: { type: "raster" as const,
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256, attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics" } },
  layers: [{ id: "esri", type: "raster" as const, source: "esri" }],
};
const TOPO_STYLE = {
  version: 8 as const,
  sources: { otm: { type: "raster" as const,
    tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png", "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"],
    tileSize: 256, attribution: "© OpenStreetMap contributors, SRTM | style: © OpenTopoMap (CC-BY-SA)" } },
  layers: [{ id: "otm", type: "raster" as const, source: "otm" }],
};
type SpecialBasemap = "" | "sat" | "topo";
const BASEMAP_KEY = "travel-basemap";
const BASEMAP_CREDITS: Record<"vector" | Exclude<SpecialBasemap, "">, string> = {
  vector: "Map Data © OpenStreetMap contributors · CARTO",
  sat: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
  topo: "© OpenStreetMap contributors, SRTM | style: © OpenTopoMap (CC-BY-SA)",
};
function readSavedSpecial(): SpecialBasemap {
  try { const value = localStorage.getItem(BASEMAP_KEY); return value === "sat" || value === "topo" ? value : ""; }
  catch { return ""; }
}
function resolveStyle(special: SpecialBasemap) {
  if (special === "sat") return ESRI_STYLE;
  if (special === "topo") return TOPO_STYLE;
  return document.documentElement.classList.contains("dark") ? DARK_STYLE : LIGHT_STYLE;
}

type CameraMode = "follow" | "manual";
const OVERVIEW = [
  { placeId: "louvre", label: "Paris", dayId: "day-0314" },
  { placeId: "koln-dom", label: "Köln", dayId: "day-0319" },
  { placeId: "ams-centraal", label: "Amsterdam", dayId: "day-0320" },
  { placeId: "rouen-cathedral", label: "Rouen", dayId: "day-0324" },
] as const;
const TRANSIT_PLACE_IDS = new Set([
  "ams-centraal", "cdg", "fontainebleau-station", "gare-lyon", "gare-nord",
  "invalides-rer-c", "koln-hbf", "rouen-station", "saint-lazare", "saint-michel-rer", "zaandijk-station",
]);

function dayPlaces(data: ReconstructedData, dayId: string): ReconstructedPlace[] {
  const ids = data.placeIdsByDay[dayId];
  return ids ? ids.flatMap(id => {
    const place = data.places.find(item => item.id === id);
    return place ? [place] : [];
  }) : data.places;
}

function fitPlaces(map: MLMap, places: ReconstructedPlace[], reduceMotion: boolean) {
  if (!places.length) return;
  if (places.length === 1) {
    map.easeTo({ center: places[0].coordinates, zoom: 12, duration: reduceMotion ? 0 : 650 });
    return;
  }
  const lons = places.map(place => place.coordinates[0]);
  const lats = places.map(place => place.coordinates[1]);
  map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
    { padding: 52, maxZoom: 12.2, duration: reduceMotion ? 0 : 750 });
}

export default function ReconstructedMap({ data, reading, lang, onMapReady, onNavigate }: {
  data: ReconstructedData; reading: ReconstructedReading; lang: LogLang;
  onMapReady: () => void; onNavigate: (dayId: string, placeId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const readingRef = useRef(reading);
  const [ready, setReady] = useState(false);
  const [visualReady, setVisualReady] = useState(false);
  const [error, setError] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [specialBasemap, setSpecialBasemap] = useState<SpecialBasemap>("");
  const specialRef = useRef<SpecialBasemap>("");
  const { mountColumn, renderHandle } = useMapSplit();
  const themeMode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => THEME_SERVER_SNAPSHOT);

  const paintMarkers = useCallback(async (map: MLMap, dayId: string) => {
    const maplibre = (await import("maplibre-gl")).default;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    const day = data.story.days.find(item => item.id === dayId);
    const entries = day
      ? dayPlaces(data, dayId).map(place => ({ place, label: "", dayId: day.id, overview: false }))
      : OVERVIEW.flatMap(item => { const place = data.places.find(p => p.id === item.placeId);
        return place ? [{ place, label: item.label, dayId: item.dayId, overview: true }] : []; });
    const diningIds = new Set(data.reviews.flatMap(review => review.placeId ? [review.placeId] : []));
    if (map.isStyleLoaded()) {
      const labels = { type: "FeatureCollection" as const, features: entries.filter(entry => !entry.overview).map(entry => ({
        type: "Feature" as const,
        properties: { name: entry.place.label },
        geometry: { type: "Point" as const, coordinates: entry.place.coordinates },
      })) };
      const source = map.getSource("fr-place-labels") as GeoJSONSource | undefined;
      if (source) source.setData(labels);
      else {
        map.addSource("fr-place-labels", { type: "geojson", data: labels });
        map.addLayer({ id: "fr-place-labels", type: "symbol", source: "fr-place-labels", minzoom: 9,
          layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top" },
          paint: { "text-color": document.documentElement.classList.contains("dark") ? "#ebe6dc" : "#374151",
            "text-halo-color": document.documentElement.classList.contains("dark") ? "#1b1b1b" : "#ffffff", "text-halo-width": 1.4 } });
      }
    }
    entries.forEach(({ place, label, dayId: targetDayId, overview }) => {
      const button = document.createElement("button");
      button.type = "button";
      const category = diningIds.has(place.id) ? "dining" : TRANSIT_PLACE_IDS.has(place.id) ? "transit" : "place";
      button.className = `fr-marker${overview ? " overview" : ` ${category}`}`;
      button.dataset.frKind = overview ? "overview" : category;
      if (overview) button.textContent = label;
      else {
        const name = document.createElement("span");
        name.className = "fr-marker-label";
        name.textContent = place.label;
        name.setAttribute("aria-hidden", "true");
        button.append(name);
      }
      button.title = place.label;
      button.setAttribute("aria-label", `${category === "dining" ? lang === "zh" ? "餐饮" : "Dining" : category === "transit" ? lang === "zh" ? "交通" : "Transit" : lang === "zh" ? "地点" : "Place"} · ${place.label}`);
      button.dataset.frPlaceId = place.id;
      button.classList.toggle("active", readingRef.current.placeId === place.id);
      button.addEventListener("click", event => { event.stopPropagation(); setCameraMode("follow"); onNavigate(targetDayId, place.id); });
      markersRef.current.push(new maplibre.Marker({ element: button, anchor: "center" }).setLngLat(place.coordinates).addTo(map));
    });
  }, [data, lang, onNavigate]);

  useEffect(() => { readingRef.current = reading; }, [reading]);

  useEffect(() => {
    if (!containerRef.current) return;
    let removed = false;
    let map: MLMap | null = null;
    const start = async () => {
      try {
        const maplibre = (await import("maplibre-gl")).default;
        if (removed || !containerRef.current) return;
        const savedSpecial = readSavedSpecial();
        specialRef.current = savedSpecial;
        setSpecialBasemap(savedSpecial);
        map = new maplibre.Map({ container: containerRef.current,
          style: resolveStyle(savedSpecial),
          center: [4.1, 50.5], zoom: 5.2, attributionControl: false, cooperativeGestures: true });
        const current = map;
        mapRef.current = current;
        current.on("load", () => {
          if (removed) return;
          void paintMarkers(current, readingRef.current.dayId);
          fitPlaces(current, data.places, true);
          setReady(true);
        });
        current.once("idle", () => { if (!removed) { setVisualReady(true); onMapReady(); } });
        current.on("style.load", () => { if (!removed) void paintMarkers(current, readingRef.current.dayId); });
        current.on("dragstart", () => setCameraMode("manual"));
        current.getCanvas().addEventListener("wheel", () => setCameraMode("manual"), { passive: true });
      } catch (cause) { if (!removed) { console.error("France draft map", cause); setError(true); onMapReady(); } }
    };
    void start();
    return () => { removed = true; markersRef.current.forEach(marker => marker.remove()); markersRef.current = []; map?.remove(); mapRef.current = null; };
  }, [data, paintMarkers, onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    void paintMarkers(map, reading.dayId);
  }, [reading.dayId, paintMarkers, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const active = reading.placeId ? data.places.find(place => place.id === reading.placeId) : null;
    for (const marker of markersRef.current) {
      marker.getElement().classList.toggle("active", marker.getElement().dataset.frPlaceId === reading.placeId);
    }
    if (cameraMode !== "follow") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active) map.easeTo({ center: active.coordinates, zoom: 13.1, duration: reduce ? 0 : 760 });
    else {
      const places = dayPlaces(data, reading.dayId);
      fitPlaces(map, reading.dayId === "day-0319" || reading.dayId === "day-0321" ? places.slice(0, 1) : places, reduce);
    }
  }, [data, reading.dayId, reading.placeId, cameraMode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const observer = new MutationObserver(() => {
      if (!specialRef.current) map.setStyle(resolveStyle(""));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    const resize = () => mapRef.current?.resize();
    window.addEventListener("resize", resize);
    window.addEventListener(MAP_SPLIT_EVENT, resize);
    return () => { window.removeEventListener("resize", resize); window.removeEventListener(MAP_SPLIT_EVENT, resize); };
  }, []);

  const activeDay = data.story.days.find(day => day.id === reading.dayId);
  const activePlace = reading.placeId ? data.places.find(place => place.id === reading.placeId) : null;
  const resume = () => setCameraMode("follow");
  const switchBasemap = (id: Exclude<SpecialBasemap, "">) => {
    const next: SpecialBasemap = specialRef.current === id ? "" : id;
    specialRef.current = next;
    setSpecialBasemap(next);
    try { localStorage.setItem(BASEMAP_KEY, next); } catch { /* storage unavailable */ }
    mapRef.current?.setStyle(resolveStyle(next));
  };

  return <div className="map-pane fr-map-pane" ref={mountColumn} data-camera-mode={cameraMode} data-map-visual-ready={visualReady}>
    <div ref={containerRef} className="map-container" aria-label={lang === "zh" ? "旅行地点地图" : "Travel places map"} />
    {!visualReady && !error && <div className="fr-map-loading" role="status"><span className="fr-map-loading-dot" aria-hidden="true" />{lang === "zh" ? "正在绘制地点地图…" : "Drawing the places map…"}</div>}
    {error && <div className="fr-map-error">{lang === "zh" ? "地图底图暂不可用；正文和时刻表仍可阅读。" : "Map unavailable; the story and timetable remain readable."}</div>}
    <MapToolbar mode={themeMode} onTheme={(mode: Theme) => applyTheme(mode)} lang={lang}
      className="basemap-ctl fr-map-tools" groupClass="bm-group" buttonClass="bm-btn">
      <div className="bm-group" role="group" aria-label="特殊底图">
        <button type="button" className={`travel-log-icon-btn bm-btn${specialBasemap === "sat" ? " on" : ""}`} onClick={() => switchBasemap("sat")} aria-pressed={specialBasemap === "sat"} data-tooltip="卫星影像" aria-label="卫星影像"><Satellite aria-hidden="true" strokeWidth={1.8} /></button>
        <button type="button" className={`travel-log-icon-btn bm-btn${specialBasemap === "topo" ? " on" : ""}`} onClick={() => switchBasemap("topo")} aria-pressed={specialBasemap === "topo"} data-tooltip="地形图" aria-label="地形图"><Mountain aria-hidden="true" strokeWidth={1.8} /></button>
      </div>
    </MapToolbar>
    <div className="fr-map-caption" aria-live="polite"><Compass size={15} aria-hidden="true" />
      <span>{activeDay ? `${activeDay.date.slice(5)} · ${activeDay.title}` : lang === "zh" ? "欧洲春游 · 地点总览" : "Europe 2024 · places overview"}</span>
      {activePlace && <strong>{activePlace.label}</strong>}
    </div>
    <div className="fr-map-legend" aria-label={lang === "zh" ? "地图图例" : "Map legend"}>
      <span><i className="fr-legend-symbol place" aria-hidden="true" />{lang === "zh" ? "地点" : "Places"}</span>
      <span><i className="fr-legend-symbol dining" aria-hidden="true" />{lang === "zh" ? "餐饮" : "Dining"}</span>
      <span><i className="fr-legend-symbol transit" aria-hidden="true" />{lang === "zh" ? "交通" : "Transit"}</span>
    </div>
    {cameraMode === "manual" && <ResumeStoryButton onResume={resume} lang={lang} />}
    {renderHandle({ className: "map-attrib", children: <span>{BASEMAP_CREDITS[specialBasemap || "vector"]}</span> })}
  </div>;
}
