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

import { useCallback, useState } from "react";
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
/** Data → globe points (visited + wishlist, coords-valid only). Shared with
    the travel hub's standalone header globe (components/travel/hub-globe.tsx). */
export function collectGlobePoints(data: TravelData, lang: Lang): GlobePoint[] {
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
  compact = false,
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
  /**
   * Travel-hub legend mode (2026-09-26 user request): an opened list shows
   * only the first 3 rows, with a full-width "show more" bar underneath that
   * expands the rest (and collapses back). The About page keeps the old
   * show-everything behaviour.
   */
  compact?: boolean;
}) {
  const dashed = kind === "wish";
  const [showAll, setShowAll] = useState(false);
  /* v9 (2026-09-28 user request): in hub legend mode the list is OPEN by
     default — the first 3 rows always show (no pre-click needed) and the
     show-more bar expands the rest. The expand/collapse of the hidden rows
     animates via the grid-rows 0fr→1fr trick (same as the column reveal). */
  const previewCount = compact ? Math.min(3, places.length) : places.length;
  const restCount = places.length - previewCount;
  const rowLetter = kind === "visited" ? "v" : "w";
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={controlId}
        className={`flex w-full items-center gap-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md ${
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
        {/* No chevron (user 2026-09-27): the whole legend row is the toggle
            already — the old right-edge ChevronDown that signalled expand/
            collapse is dropped. The show-more bar inside keeps its own
            chevron, so "expand/collapse" is still communicated once the
            list is open. */}
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
          {/* Row pitch matches the hub page header's lead paragraph line box
              (computed 25.2px = 1.75rem at the site's 0.9 page scale) so the
              two expanded checklists share the same vertical rhythm as the
              blurb above. */}
          <ul>
            {places.slice(0, previewCount).map((p, i) => {
              const rowId = `${rowLetter}${i}`;
              const hot = hotId === rowId;
              return (
                <li
                  key={i}
                  /* Hover sync is mouse-only; touch taps toggle the highlight
                     on pointerup (emulated mouse events after a tap would
                     otherwise fight the toggle). */
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "touch") onHover(rowId);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType !== "touch") onHover(null);
                  }}
                  onPointerUp={(e) => {
                    if (e.pointerType === "touch") onHover(hot ? null : rowId);
                  }}
                  className={`-mx-2 flex cursor-pointer items-baseline gap-2 rounded-md px-2 text-[14px] leading-[1.75rem] transition-colors duration-200 ${
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
          {/* Hidden remainder, revealed by the show-more bar. The grid-rows
              0fr→1fr wrapper animates the expansion smoothly (user 2026-09-28:
              the old slice-in was abrupt); -mx-2/px-2 pushes the clip boundary
              out so the rows' hover backgrounds don't get slivered. */}
          {compact && restCount > 0 ? (
            <div
              className={`-mx-2 grid px-2 transition-all duration-300 ease-out ${
                showAll
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="-mx-2 min-h-0 overflow-hidden px-2">
                <ul>
                  {places.slice(previewCount).map((p, i) => {
                    const rowId = `${rowLetter}${previewCount + i}`;
                    const hot = hotId === rowId;
                    return (
                      <li
                        key={previewCount + i}
                        onPointerEnter={(e) => {
                          if (e.pointerType !== "touch") onHover(rowId);
                        }}
                        onPointerLeave={(e) => {
                          if (e.pointerType !== "touch") onHover(null);
                        }}
                        onPointerUp={(e) => {
                          if (e.pointerType === "touch") onHover(hot ? null : rowId);
                        }}
                        className={`-mx-2 flex cursor-pointer items-baseline gap-2 rounded-md px-2 text-[14px] leading-[1.75rem] transition-colors duration-200 ${
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
          ) : null}
          {compact && restCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line py-1 text-xs font-medium text-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              {showAll
                ? copy[lang].about.travelShowLess
                : copy[lang].about.travelShowMore.replace("{n}", String(restCount))}
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                aria-hidden
                className={`transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}
              />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TravelBoard({
  lang,
  data,
  hideGlobe = false,
  hotId: externalHotId,
  onHoverChange,
}: {
  lang: Lang;
  data: TravelData;
  /**
   * Legend-only mode (2026-09-25, travel hub): skip the globe (the hub page
   * renders a standalone `HubGlobe` beside its page title instead) and keep
   * just the two collapsible checklist columns — collapsed they are a single
   * short legend row, so the waterfall starts right below the header.
   */
  hideGlobe?: boolean;
  /**
   * Controlled join id (v12.1, 2026-09-28 user request — restore the hub's
   * globe↔list hover link). When provided (together with `onHoverChange`)
   * the PAGE owns the hover state so the standalone HubGlobe outside this
   * component and these rows light each other up. Undefined = uncontrolled
   * (About page), exactly as before.
   */
  hotId?: string | null;
  onHoverChange?: (id: string | null) => void;
}) {
  const s = copy[lang].about;
  const visited = data.visited;
  const wishlist = data.wishlist;
  const empty = visited.length === 0 && wishlist.length === 0;
  const points = collectGlobePoints(data, lang);
  const mapShown = !hideGlobe && points.length > 0;
  /* v9 (2026-09-28): in hub legend mode both columns start OPEN — the lists
     show their first 3 rows + show-more bar without any click (user request).
     The About page (globe mode) keeps the collapsed-by-default behaviour. */
  const [open, setOpen] = useState<{ visited: boolean; wishlist: boolean }>({
    visited: hideGlobe,
    wishlist: hideGlobe,
  });
  /* The single join state for the bidirectional hover sync — set by the
     globe's dot hit-test and by list rows alike, read by both sides.
     v12.1: in controlled mode (travel hub) the page supplies it so the
     HubGlobe rendered OUTSIDE this component stays in the same loop. */
  const [localHot, setLocalHot] = useState<string | null>(null);
  const hoverId = externalHotId !== undefined ? externalHotId : localHot;
  const setHoverId = useCallback(
    (id: string | null) => {
      setLocalHot(id);
      onHoverChange?.(id);
    },
    [onHoverChange],
  );
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
          compact={hideGlobe}
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
          compact={hideGlobe}
        />
      </div>
    </div>
  );
}
