"use client";

/**
 * About "travel board" — globe + collapsible checklist, rendered under the
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
 * - (2026-09-07) The flat Mercator sheet (worldOutlineLow.svg + overlay
 *   markers) was replaced by `TravelGlobe` — a draggable orthographic globe
 *   that also presses a gravity well into the site's spacetime backdrop.
 *   Markers/labels/tooltip live inside the globe component now; this file
 *   keeps only the shared hoverId state and the data→point mapping. The id
 *   scheme (`v3` / `w1` — kind letter + index into the ORIGINAL data arrays)
 *   is unchanged, so checklist rows and globe dots stay bidirectionally
 *   linked, and places without valid finite coords still get NO dot (never a
 *   fake point at 0,0).
 * - Empty checklist → a single quiet placeholder line, no globe.
 */

import { useState } from "react";
import type { TravelData, TravelPlace } from "@/lib/content";
import { copy, type Lang } from "@/lib/i18n";
import { Check, ChevronDown } from "lucide-react";
import { TravelGlobe, type GlobePoint } from "@/components/about/travel-globe";

function placeName(p: TravelPlace, lang: Lang): string {
  return lang === "zh" ? p.name || p.nameEn || "" : p.nameEn || p.name;
}

/**
 * Data → globe points. Same join-key scheme the old Mercator overlay used
 * (`v{i}` / `w{i}`), so hover sync with the checklist rows keeps working.
 * Places without both coordinates are skipped entirely.
 */
function collectGlobePoints(data: TravelData, lang: Lang): GlobePoint[] {
  const points: GlobePoint[] = [];
  const push = (place: TravelPlace, kind: "visited" | "wish", idx: number) => {
    if (place.lat === null || place.lon === null) return;
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return;
    points.push({
      id: `${kind === "visited" ? "v" : "w"}${idx}`,
      lat: place.lat,
      lon: place.lon,
      kind,
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
        {/* -mx-2/px-2: shift the clip boundary 8px out on each side. The
            rows use -mx-2 hover backgrounds and their icons scale up on
            hover — without the offset the scaled icon crossed the
            overflow-hidden edge and got its left sliver clipped. */}
        <div className="-mx-2 min-h-0 overflow-hidden px-2">
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
  const points = collectGlobePoints(data, lang);
  const mapShown = points.length > 0;
  const [open, setOpen] = useState<{ visited: boolean; wishlist: boolean }>({
    visited: false,
    wishlist: false,
  });
  /* The single join state for the bidirectional hover sync — set by the
     globe's dot hit-test and by list rows alike, read by both sides. */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const toggle = (k: "visited" | "wishlist") =>
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }));

  if (empty) {
    return <p className="text-sm text-muted">{s.travelEmpty}</p>;
  }

  return (
    <div className="travel-board">
      {mapShown ? (
        <TravelGlobe points={points} hotId={hoverId} onHover={setHoverId} />
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
