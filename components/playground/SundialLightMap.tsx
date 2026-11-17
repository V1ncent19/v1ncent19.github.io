"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { geoCircle, geoMercator, geoPath } from "d3-geo";
import { Pause, Play } from "lucide-react";
import map from "@/generated/playground/light-map.json";
import { lightElevation, sundialTimeAt, worldLightSnapshot, type LightLocation, type SundialClock } from "./sundial-world-light";

export interface MapLightLocation extends LightLocation { region: string }
interface MapPoint { x: number; y: number; region: string }

const ocean = "Open ocean";
const projection = geoMercator().scale(map.width / (2 * Math.PI)).translate([map.width / 2, 0]).precision(.16);
const northY = projection([0, map.north])![1];
projection.translate([map.width / 2, -northY]).clipExtent([[0, 0], [map.width, map.height]]);
const path = geoPath(projection).digits(2);
const meridians = [-120, -60, 0, 60, 120].map((longitude) => projection([longitude, 0])![0]);
const parallels = [-60, -30, 0, 30, 60].map((latitude) => projection([0, latitude])![1]);
const utcTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hourCycle: "h23" });

function nightGeometry(midnight: [number, number]) {
  // The opposite of the subsolar point is the center of the dark hemisphere.
  const night = geoCircle().center(midnight).radius(90).precision(1)();
  return {
    shade: path(night) ?? undefined,
    edge: path({ type: "LineString", coordinates: night.coordinates[0] }) ?? undefined,
  };
}

function pickPoint(event: MouseEvent<SVGSVGElement>): MapPoint {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(map.width, (event.clientX - bounds.left) * map.width / bounds.width));
  const y = Math.max(0, Math.min(map.height, (event.clientY - bounds.top) * map.height / bounds.height));
  const region = (event.target as SVGElement).closest("[data-light-region]")?.getAttribute("data-light-region") ?? ocean;
  return { x, y, region };
}

export default function SundialLightMap({ clock, location, onSelect, onTogglePlayback }: {
  clock: SundialClock;
  location: MapLightLocation;
  onSelect: (location: MapLightLocation) => void;
  onTogglePlayback: () => void;
}) {
  const hint = useId();
  const [cursor, setCursor] = useState<MapPoint | null>(null);
  const [now, setNow] = useState(0);
  const playing = clock.runningSince !== null;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  const instant = sundialTimeAt(clock, now);
  const snapshot = useMemo(() => worldLightSnapshot(new Date(instant)), [instant]);
  const { sun, moon } = snapshot.at(location);
  const [x, y] = projection([location.longitude, location.latitude])!;
  const picked = { x, y, region: location.region };
  const night = useMemo(() => nightGeometry(snapshot.midnight), [snapshot]);
  const elevation = lightElevation(sun[1]);
  const phase = elevation >= 12 ? "Daylight" : elevation >= 0 ? (sun[0] < 0 ? "Sunset" : "Sunrise")
    : elevation >= -12 ? "Twilight" : moon[1] > 0 ? "Moonlight" : "Night";
  const playLabel = playing ? "Pause lighting" : "Play lighting";

  function select(point: MapPoint) {
    const coordinates = projection.invert?.([point.x, point.y]);
    if (!coordinates) return;
    const [longitude, latitude] = coordinates;
    onSelect({ longitude, latitude, region: point.region });
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const point = cursor ?? picked;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(point);
      return;
    }
    const step = event.shiftKey ? 12 : 4;
    const dx = Number(event.key === "ArrowRight") - Number(event.key === "ArrowLeft");
    const dy = Number(event.key === "ArrowDown") - Number(event.key === "ArrowUp");
    if (!dx && !dy) return;
    event.preventDefault();
    const nextX = (point.x + dx * step + map.width) % map.width;
    const nextY = Math.max(0, Math.min(map.height, point.y + dy * step));
    const land = Array.from(event.currentTarget.querySelectorAll<SVGPathElement>("[data-light-region]"));
    const match = land.find((region) => region.isPointInFill(new DOMPoint(nextX, nextY)));
    setCursor({ x: nextX, y: nextY, region: match?.getAttribute("data-light-region") ?? ocean });
  }

  return (
    <section className="sundial-light-map" aria-label="World lighting map">
      <div className="sundial-light-map-label">
        <span>Pick your location</span>
        <div className="sundial-light-map-clock">
          <time dateTime={snapshot.date.toISOString()} title={snapshot.date.toISOString()}>{utcTime.format(snapshot.date)} UTC</time>
          <button type="button" aria-label={playLabel} title={playLabel} onClick={onTogglePlayback}>
            {playing ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="sundial-light-map-plot">
        <svg viewBox={`0 0 ${map.width} ${map.height}`} role="button" tabIndex={0}
          aria-label="Choose a lighting location" aria-describedby={hint}
          onMouseMove={(event) => setCursor(pickPoint(event))} onMouseLeave={() => setCursor(null)}
          onClick={(event) => select(pickPoint(event))} onKeyDown={onKeyDown} onBlur={() => setCursor(null)}>
          <g className="sundial-light-map-grid">
            {meridians.map((x) => <path key={x} d={`M${x},0V${map.height}`} />)}
            {parallels.map((y) => <path key={y} d={`M0,${y}H${map.width}`} />)}
          </g>
          <g className="sundial-light-map-land">
            {map.regions.map(([region, outline]) => <path key={region} d={outline} data-light-region={region} />)}
          </g>
          <g className="sundial-light-map-night" aria-hidden="true">
            <path d={night.shade} className="sundial-light-map-shade" />
            <path d={night.edge} className="sundial-light-map-terminator" />
          </g>
          {cursor && <g className="sundial-light-map-crosshair" aria-hidden="true">
            <path d={`M${cursor.x},0V${map.height}M0,${cursor.y}H${map.width}`} />
            <circle cx={cursor.x} cy={cursor.y} r={1.8} />
          </g>}
          <g className="sundial-light-map-pin" aria-hidden="true" style={{ transform: `translate(${x}px, ${y}px)` }}>
            <circle r={8} /><circle r={3.6} />
          </g>
        </svg>
        {cursor && (
          <span className="sundial-light-map-tooltip" aria-hidden="true" data-below={cursor.y < 42}
            style={{ left: `clamp(48px, ${cursor.x / map.width * 100}%, calc(100% - 48px))`, top: `${cursor.y / map.height * 100}%` }}>{cursor.region}</span>
        )}
      </div>
      <p id={hint} className="sr-only">Use the arrow keys to move the marker and Enter to select. Changing locations pauses playback.</p>
      <div className="sundial-light-map-selection" aria-live="polite"><span>{location.region}</span><span>{phase}</span></div>
    </section>
  );
}
