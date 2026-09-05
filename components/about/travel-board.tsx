"use client";

/**
 * About "travel board" — world map + collapsible checklist, rendered under the
 * TravelLog § section of the about page. Data passed as props from the server
 * page; never import lib/content here.
 *
 * (2026-09-05) The default view is the MAP + a one-line LEGEND: the legend is
 * two toggle buttons (visited = solid dot, wishlist = dashed ring — the exact
 * map symbols), each carrying its count. Clicking a legend item expands that
 * checklist beneath it, independently, using the same grid-rows 0fr↔1fr reveal
 * as the facts board; clicking again collapses it. This was split out of the
 * facts board's former "on the road" envelope so that card stays short.
 *
 * - Checklist: two columns, visited (solid ✓ dots) vs wishlist (dashed
 *   circles), echoing the facts board's unlock language.
 * - Map: reuses the gallery lightbox's world sheet (worldOutlineLow.svg) and
 *   the same Mercator projection (projectToWorldMap), so both pages place dots
 *   identically. The overlay <svg> shares the sheet's viewBox, so markers sit
 *   at RAW projected coordinates — no viewBox-origin arithmetic (same trick as
 *   gallery). Visited = solid core dot, wishlist = dashed ring; places without
 *   valid finite coords get NO dot (never a fake point at 0,0). The map is
 *   rendered only when at least one place projects onto the sheet; the sheet
 *   SVG itself is untouched (user-provided, do not edit).
 * - (2026-09-05) Markers grew a soft blurred glow base + the gallery's
 *   breathing halo (world-map-pulse, phases staggered via negative
 *   animation-delay). All animation is transform/opacity only — compositor
 *   work, no layout/paint. Markers and list rows are bidirectionally linked
 *   through a single hoverId: hovering a marker highlights (and tooltips) the
 *   place, hovering a row lights up its dot. Hit areas are oversized
 *   transparent circles (r=16) re-enabling pointer-events inside the otherwise
 *   pointer-transparent map; the whole layer stays decorative to AT (the
 *   checklist carries the data).
 * - Empty checklist → a single quiet placeholder line, no map.
 */

import { useState } from "react";
import type { TravelData, TravelPlace } from "@/lib/content";
import { copy, type Lang } from "@/lib/i18n";
import { Check, ChevronDown } from "lucide-react";

const WORLD_MAP_SRC = "/assets/gallery/worldOutlineLow.svg";
const WORLD_VB = { x: -2, y: 168.36, w: 964, h: 623.29 } as const;

/**
 * Marker sizing — the single place to tune how big the map dots are (2026-09-05).
 * All numbers are radii in the SHEET's viewBox units (≈ 1/1.55 px on screen at
 * the about page's map width, so 2.5 ≈ 1.6 px on screen). Keep the layers
 * roughly proportional: glow > halo ≈ ringHot > core, and hit ≥ glow + margin
 * (it is the invisible mouse target; too small makes dots hard to hover).
 * Companion knobs live in globals.css: `.travel-pt-glow` filter blur (scale it
 * with `glow`) and the hover scale-up in `.travel-map-hot .travel-pt-core`.
 */
const MARKER = {
  /** core symbol: solid dot (visited) / dashed ring (wish) */
  core: 4,
  /** breathing halo that pulses outward (reuses the gallery keyframes) */
  halo: 5.5,
  /** soft static blurred glow underneath everything */
  glow: 6.5,
  /** hover highlight ring, fades in when the dot is hot */
  ringHot: 8,
  /** invisible oversized hit area — hover/aim target, never rendered */
  hit: 15,
} as const;

/**
 * Mercator projection onto the world sheet's viewBox — kept in sync with
 * components/gallery/gallery-view.tsx (user-locked geometry, do not tweak).
 */
function projectToWorldMap(
  latitude: number,
  longitude: number,
): { x: number; y: number } | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const lat = Math.max(-85, Math.min(85, latitude));
  const scale = 960 / (2 * Math.PI);
  const x = ((longitude + 180) / 360) * 960;
  const latRad = lat * (Math.PI / 180);
  const y = 610 - scale * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  if (x < 0 || x > WORLD_VB.w) return null;
  if (y < WORLD_VB.y || y > WORLD_VB.y + WORLD_VB.h) return null;
  return { x, y };
}

function placeName(p: TravelPlace, lang: Lang): string {
  return lang === "zh" ? p.name || p.nameEn || "" : p.nameEn || p.name;
}

/**
 * A dot on the sheet + its list-row identity. `id` (`v3` / `w1` — kind letter
 * + index into the ORIGINAL data array) is the join key for the bidirectional
 * map↔list hover sync: rows and dots that fail the projection simply never
 * share an id, so no place without coordinates can ever be highlighted.
 */
type MapPoint = {
  id: string;
  x: number;
  y: number;
  kind: "visited" | "wish";
  name: string;
  year: number | null;
};

function collectMapPoints(data: TravelData, lang: Lang): MapPoint[] {
  const points: MapPoint[] = [];
  const push = (
    place: TravelPlace,
    kind: "visited" | "wish",
    idx: number,
  ) => {
    if (place.lat === null || place.lon === null) return;
    const pt = projectToWorldMap(place.lat, place.lon);
    if (!pt) return;
    points.push({
      ...pt,
      kind,
      id: `${kind === "visited" ? "v" : "w"}${idx}`,
      name: placeName(place, lang),
      year: place.year ?? null,
    });
  };
  data.visited.forEach((v, i) => push(v, "visited", i));
  data.wishlist.forEach((w, i) => push(w, "wish", i));
  return points;
}

/** One check-list column: header legend button + its collapsible rows. */
function ChecklistColumn({
  lang,
  label,
  count,
  kind,
  places,
  open,
  onToggle,
  controlId,
  hotId,
  onHover,
}: {
  lang: Lang;
  label: string;
  count: number;
  kind: "visited" | "wish";
  places: TravelPlace[];
  open: boolean;
  onToggle: () => void;
  controlId: string;
  /** The currently hovered join id (from map OR list), null when idle. */
  hotId: string | null;
  onHover: (id: string | null) => void;
}) {
  const dashed = kind === "wish";
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={controlId}
        className={`group flex w-full items-center gap-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md ${
          open ? "text-ink" : "text-muted hover:text-ink"
        }`}
      >
        {dashed ? (
          <span
            aria-hidden
            className="h-2.5 w-2.5 flex-none rounded-full border-[1.5px] border-dashed border-[var(--travel-wish)]"
          />
        ) : (
          <span
            aria-hidden
            className="h-2.5 w-2.5 flex-none rounded-full bg-[var(--travel-visited)]"
          />
        )}
        <span>{label}</span>
        <span className="ui-text tabular-nums text-xs text-muted">
          {count}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          strokeWidth={2.5}
          className={`ml-auto flex-none text-muted transition-transform duration-300 group-hover:text-ink ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id={controlId}
        className={`grid transition-all duration-300 ease-out ${
          open
            ? "mt-2.5 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-1">
            {places.map((p, i) => {
              const rowId = `${kind === "visited" ? "v" : "w"}${i}`;
              const hot = hotId === rowId;
              return (
                <li
                  key={i}
                  onMouseEnter={() => onHover(rowId)}
                  onMouseLeave={() => onHover(null)}
                  className={`-mx-2 flex items-baseline gap-2 rounded-md px-2 py-0.5 text-[14px] leading-relaxed transition-colors duration-200 ${
                    hot ? "bg-surface-tint" : ""
                  } ${dashed ? "text-muted" : "text-ink"}`}
                >
                  {dashed ? (
                    <span
                      aria-hidden
                      className={`mt-[0.3em] h-3.5 w-3.5 flex-none rounded-full border-[1.5px] border-dashed transition-transform duration-200 ${
                        hot ? "scale-125" : ""
                      } border-[var(--travel-wish)]`}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={`mt-[0.3em] flex h-4 w-4 flex-none items-center justify-center rounded-full text-on-brand transition-transform duration-200 ${
                        hot ? "scale-110" : ""
                      } bg-[var(--travel-visited)]`}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className={`min-w-0 transition-colors duration-200 ${
                      hot
                        ? `font-medium ${
                            dashed
                              ? "text-[var(--travel-wish)]"
                              : "text-[var(--travel-visited)]"
                          }`
                        : ""
                    }`}
                  >
                    {placeName(p, lang)}
                    {p.year ? (
                      <span className="ml-1.5 text-xs text-muted tabular-nums">
                        {p.year}
                      </span>
                    ) : null}
                    {p.note ? (
                      <span className="text-muted"> — {p.note}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function TravelBoard({
  lang,
  data,
}: {
  lang: Lang;
  data: TravelData;
}) {
  const s = copy[lang].about;
  const visited = data.visited;
  const wishlist = data.wishlist;
  const empty = visited.length === 0 && wishlist.length === 0;
  const points = collectMapPoints(data, lang);
  const mapShown = points.length > 0;
  const [open, setOpen] = useState<{ visited: boolean; wishlist: boolean }>({
    visited: false,
    wishlist: false,
  });
  /* The single join state for the bidirectional hover sync — set by marker
     hit-areas and by list rows alike, read by both sides. */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hotPoint = hoverId
    ? (points.find((p) => p.id === hoverId) ?? null)
    : null;
  /* Tooltip anchor in % of the sheet box (the overlay svg shares the
     sheet's viewBox, so this is the same mapping the markers use). */
  const tipPct = (v: number, origin: number, span: number) =>
    `${(((v - origin) / span) * 100).toFixed(2)}%`;
  const tipAbove = hotPoint
    ? ((hotPoint.y - WORLD_VB.y) / WORLD_VB.h) * 100 >= 18
    : true;
  const toggle = (k: "visited" | "wishlist") =>
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }));

  if (empty) {
    return <p className="text-sm text-muted">{s.travelEmpty}</p>;
  }

  return (
    <div className="travel-board">
      {mapShown ? (
        <div
          onMouseLeave={() => setHoverId(null)}
          className="world-map mx-auto w-[80%] select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORLD_MAP_SRC}
            alt=""
            draggable={false}
            className="world-map-img pointer-events-none block w-full"
          />
          <svg
            className="world-map-marker pointer-events-none"
            viewBox={`${WORLD_VB.x} ${WORLD_VB.y} ${WORLD_VB.w} ${WORLD_VB.h}`}
            focusable="false"
            aria-hidden
          >
            {points.map((pt, i) => {
              /* Kind colours — the checklist icons read the same two vars,
                  so map and list can never drift apart. */
              const accent =
                pt.kind === "visited"
                  ? "var(--travel-visited)"
                  : "var(--travel-wish)";
              const hot = hoverId === pt.id;
              /* Phases staggered by index so the pings don't flash in
                 unison (negative delay = mid-cycle start, no waiting). */
              const phase = { animationDelay: `${-(i * 0.45).toFixed(2)}s` };
              return (
                <g key={pt.id} className={hot ? "travel-map-hot" : undefined}>
                  {/* soft glow base — static, blurred once at paint; blur
                      scales with the radius so the knob stays one-dimensional */}
                  <circle
                    className="travel-pt-glow"
                    cx={pt.x}
                    cy={pt.y}
                    r={MARKER.glow}
                    style={{
                      fill: accent,
                      filter: `blur(${(MARKER.glow / 3).toFixed(2)}px)`,
                    }}
                  />
                  {/* breathing halo — reuses the gallery pulse keyframes */}
                  {pt.kind === "visited" ? (
                    <circle
                      className="world-map-halo"
                      cx={pt.x}
                      cy={pt.y}
                      r={MARKER.halo}
                      style={{ fill: accent, ...phase }}
                    />
                  ) : (
                    <circle
                      className="world-map-halo"
                      cx={pt.x}
                      cy={pt.y}
                      r={MARKER.halo}
                      style={{
                        fill: "none",
                        stroke: accent,
                        strokeWidth: 1.25,
                        strokeDasharray: "4 3",
                        vectorEffect: "non-scaling-stroke",
                        ...phase,
                      }}
                    />
                  )}
                  {/* core symbol: solid dot / dashed ring */}
                  <circle
                    className="travel-pt-core"
                    cx={pt.x}
                    cy={pt.y}
                    r={MARKER.core}
                    style={
                      pt.kind === "visited"
                        ? {
                            fill: accent,
                            stroke: "var(--surface, #fff)",
                            strokeWidth: 1.5,
                            vectorEffect: "non-scaling-stroke",
                            paintOrder: "stroke",
                          }
                        : {
                            fill: "none",
                            stroke: accent,
                            strokeWidth: 1.25,
                            strokeDasharray: "4 3",
                            vectorEffect: "non-scaling-stroke",
                          }
                    }
                  />
                  {/* hover ring — fades in only while this dot is hot */}
                  <circle
                    className="travel-pt-ring-hot"
                    cx={pt.x}
                    cy={pt.y}
                    r={MARKER.ringHot}
                    style={{ fill: "none", stroke: accent }}
                  />
                  {/* oversized invisible hit area — the only element that
                      re-enables pointer-events inside the inert map. The
                      transparent fill MUST be an inline style: the sheet's
                      `.world-map-marker circle { fill: … }` rule beats an SVG
                      presentation attribute and painted every hit area solid
                      brand blue (on top of the actual marker). */}
                  <circle
                    className="travel-map-hit"
                    cx={pt.x}
                    cy={pt.y}
                    r={MARKER.hit}
                    style={{ fill: "transparent" }}
                    onMouseEnter={() => setHoverId(pt.id)}
                    onMouseLeave={() => setHoverId(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Place-name tooltip: shown for a hot point regardless of which
              side (map or list) triggered the hover, so the map still gives
              feedback while both checklists are collapsed. Sits above the
              point, flipping below it near the sheet's top edge. */}
          {hotPoint ? (
            <span
              className={`map-tip ui-text rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink shadow-md ${
                tipAbove ? "" : "map-tip-below"
              }`}
              style={{
                left: tipPct(hotPoint.x, WORLD_VB.x, WORLD_VB.w),
                top: tipPct(hotPoint.y, WORLD_VB.y, WORLD_VB.h),
              }}
            >
              {hotPoint.name}
              {hotPoint.year ? (
                <span className="ml-1.5 text-muted tabular-nums">
                  {hotPoint.year}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={`grid gap-x-8 gap-y-4 sm:grid-cols-2 ${
          mapShown ? "mt-6" : ""
        }`}
      >
        <ChecklistColumn
          lang={lang}
          label={s.travelVisited}
          count={visited.length}
          kind="visited"
          places={visited}
          open={open.visited}
          onToggle={() => toggle("visited")}
          controlId="travel-list-visited"
          hotId={hoverId}
          onHover={setHoverId}
        />
        <ChecklistColumn
          lang={lang}
          label={s.travelWishlist}
          count={wishlist.length}
          kind="wish"
          places={wishlist}
          open={open.wishlist}
          onToggle={() => toggle("wishlist")}
          controlId="travel-list-wishlist"
          hotId={hoverId}
          onHover={setHoverId}
        />
      </div>
    </div>
  );
}
