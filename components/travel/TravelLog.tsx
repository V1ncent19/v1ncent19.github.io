"use client";

import { useEffect, useState } from "react";
import type { TripInfo, TripTrack, TravelScene, Attraction } from "@/lib/travel/types";
import { useStoryController } from "@/lib/travel/use-story-controller";
import TravelMap from "./TravelMap";
import TravelStory from "./TravelStory";

/**
 * Trip page (2026-09-26): permanently immersive — the landing hero and the
 * ⛶/⤡ mode chip are gone (user request "不需要 exit immersive"); the page
 * always boots with body.tl-immersive (pre-hydration inline script in the
 * route pages prevents the chrome flash). The way back to the hub is a fixed
 * circular blue button at the page's top-right corner (2026-09-26 v4: the
 * divider folder-tab and the TravelNav back pill are both gone).
 */
export default function TravelLog({
  tripId = "ptes-2025",
  backHref,
  backLabel,
}: {
  tripId?: string;
  /** When set, renders the back exit linking to the /travel hub (all
   *  viewports): a full-height right-edge strip on desktop, a small circular
   *  button top-right on narrow screens. backLabel is the strip's vertical
   *  text and the aria-label. */
  backHref?: string;
  backLabel?: string;
}) {
  const DATA_BASE = `/data/travel/${tripId}`;
  const [trip, setTrip] = useState<TripInfo | null>(null);
  const [track, setTrack] = useState<TripTrack | null>(null);
  const [scenes, setScenes] = useState<TravelScene[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** True once the back strip is clicked: plays the right-to-left blue wipe
   *  overlay, then hard-navigates to the hub (user 2026-09-26 v6). */
  const [leaving, setLeaving] = useState(false);
  /** v11 entry veil (2026-09-28 user request): the time-reverse of the exit
   *  wipe. The sheet is the body::before pseudo-element painted by the route
   *  page's pre-paint inline script (body.tl-veil-boot — hydration-safe; a
   *  real node appended pre-paint breaks React 19 hydration, and a
   *  React-rendered fixed veil misses the first-paint viewport). TravelLog
   *  adds body.tl-veil-open once the gates pass; the retract animation's
   *  end removes both classes. */
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Permanently immersive (2026-09-26): body.tl-immersive hides the site
    // chrome (layout wrappers) and switches the layout vars (map 100vh, no
    // top offset). Removed on unmount so normal pages are unaffected; the
    // route pages add the class pre-paint via an inline script.
    document.body.classList.add("tl-immersive");
    return () => document.body.classList.remove("tl-immersive");
  }, []);

  useEffect(() => {
    // attractions.json is optional per-trip (404 -> empty layer)
    const attrP = fetch(`${DATA_BASE}/attractions.json`)
      .then((r) => (r.ok ? r.json() : { attractions: [] }))
      .catch(() => ({ attractions: [] }));
    Promise.all([
      fetch(`${DATA_BASE}/trip.json`).then((r) => r.json()),
      fetch(`${DATA_BASE}/track.json`).then((r) => r.json()),
      fetch(`${DATA_BASE}/scenes.json`).then((r) => r.json()),
      attrP,
    ])
      .then(([trip, track, scenes, attr]) => {
        // derive epoch ms once at load
        for (const p of track.points) p.ts = Date.parse(p.t);
        track.points.sort((a: { ts: number }, b: { ts: number }) => a.ts - b.ts);
        setTrip(trip);
        setTrack(track);
        setScenes(scenes.scenes);
        setAttractions(attr.attractions ?? []);
      })
      .catch((e) => {
        // release the veil too, so a boot error is actually visible
        setError(String(e));
        document.body.classList.add("tl-veil-open");
      });
  }, []);

  // When the retract animation ends, take the curtain down entirely. The
  // listener sits on body because pseudo-element animation events target the
  // owning element; descendants' animations bubble here too, so filter on
  // BOTH the keyframes name and the ::before pseudo-element.
  useEffect(() => {
    if (!document.body.classList.contains("tl-veil-boot")) return;
    const done = (e: AnimationEvent) => {
      // tl-entry-pull = the 4s CSS fallback; tl-entry-open = the JS-released
      // retract (v13 gave it a distinct keyframes name so it always replays
      // from 0 — see globals.css).
      if (
        (e.animationName === "tl-entry-pull" || e.animationName === "tl-entry-open") &&
        e.pseudoElement === "::before"
      ) {
        document.body.classList.remove("tl-veil-boot", "tl-veil-open");
      }
    };
    document.body.addEventListener("animationend", done);
    return () => {
      document.body.removeEventListener("animationend", done);
      document.body.classList.remove("tl-veil-boot", "tl-veil-open");
    };
  }, []);

  // Entry-veil release (v11). Gate: trip data fetched AND the map has fired
  // "load" (user pick: reveal only onto a fully initialised map), plus a
  // 200ms beat so a fast load doesn't flash; the sheet then retracts over
  // 0.4s. All writes are imperative body-class toggles — no setState in the
  // effect body.
  useEffect(() => {
    if (!trip || !track || !mapReady) return;
    const t = setTimeout(() => document.body.classList.add("tl-veil-open"), 200);
    return () => clearTimeout(t);
  }, [trip, track, mapReady]);

  // Fallback: if the map never fires "load" (tile host down, WebGL hiccup),
  // the veil must not hold the page hostage — release 1.5s after the data
  // is in regardless of the map gate.
  useEffect(() => {
    if (!trip || !track) return;
    const t = setTimeout(() => document.body.classList.add("tl-veil-open"), 1500);
    return () => clearTimeout(t);
  }, [trip, track]);

  const { state, registerSection, enterExplore, resumeStory } = useStoryController(trip, track, scenes);

  if (error) {
    return <div className="boot-error">Failed to load travel data: {error}</div>;
  }
  if (!trip || !track) {
    return <div className="boot-loading">Loading trip data…</div>;
  }

  return (
    <>
      <div className="travel-layout">
        <div className="map-col">
          <TravelMap
            trip={trip}
            track={track}
            scenes={scenes}
            attractions={attractions}
            state={state}
            onUserInteract={enterExplore}
            onResume={resumeStory}
            onMapReady={() => setMapReady(true)}
          />
          {backHref ? (
            <>
              {/* Plain <a> + hard navigation (2026-09-26 v6): the click plays
                  a brand-blue wipe (right -> left, 0.35s) as the handoff to
                  the hub page, so the transition is one continuous gesture
                  instead of an abrupt swap (user 2026-09-26). */}
              <a
                href={backHref}
                className="tl-back-strip"
                aria-label={backLabel ?? "Back to travel hub"}
                onClick={(e) => {
                  e.preventDefault();
                  if (!leaving) {
                    setLeaving(true);
                    window.setTimeout(() => {
                      window.location.href = backHref;
                    }, 300);
                  }
                }}
              >
                {/* "《" double chevron (user 2026-09-27, replaces the v6
                    hollow triangle): reads as a "go back" glyph in the gray
                    rest state; hover still crossfades it into the vertical
                    label. Two stroked chevrons, no fill. */}
                <svg
                  className="tl-back-arrow"
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 17 6 12l5-5" />
                  <path d="M18 17l-5-5 5-5" />
                </svg>
                <span className="tl-back-strip-label" aria-hidden="true">
                  {backLabel ?? "Back to travel hub"}
                </span>
              </a>
            </>
          ) : null}
        </div>
      <div className="story-col">
        <TravelStory
          trip={trip}
          scenes={scenes}
          registerSection={registerSection}
          activeSceneId={state.activeSceneId}
        />
      </div>
      <style jsx global>{`
        .travel-layout {
          display: flex;
          min-height: 100vh;
          /* Site integration (2026-09-25): landing (non-immersive) keeps the
             site chrome visible — the map is a 60vh preview pinned below the
             floating header pill (--tl-top), and body.tl-immersive (opt-in
             via hero CTA / corner chip) switches to the lab's full-viewport
             mode. Opaque paper background isolates the site theme; the lab's
             own sans stack (the site body is serif). */
          --tl-top: 4.5rem;
          --tl-map-h: 60vh;
          background: #faf9f7;
          color: #1f2937;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
            Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        body.tl-immersive .travel-layout {
          --tl-top: 0px;
          --tl-map-h: 100vh;
        }
        .map-col {
          width: 46%;
          position: sticky;
          top: var(--tl-top);
          height: var(--tl-map-h);
          transition: height 0.45s ease;
          /* Map/story divider (2026-09-26): neutral paper gray as of v6 —
             the brand blue was reserved for interactive elements (user
             2026-09-26: "地图和文本区的分界线改成灰色"). */
          border-right: 2px solid #d9d4cb;
        }
        /* Back to hub (2026-09-26 v6). <1024px keeps the v4 small circular
           blue button. ≥1024px it is a full-height narrow strip flush with
           the page's right edge: light gray, a hollow left-triangle at the
           vertical centre; hover tints it light blue, nudges the width and
           crossfades the triangle into a vertical label. Click plays a
           right-to-left blue wipe, then hard-navigates to the hub. Mounts
           after the trip data loads (client-side), long after the route-fade
           entry transform has finished, so the fixed position is
           viewport-true (no containing-block jump, no portal needed).
           Desktop z-index stays BELOW the progress rail (30): in the
           1024–1279 band the expanded strip would otherwise cover the rail's
           ticks. */
        .tl-back-strip {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 40;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #1ba7c9;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(27, 167, 201, 0.35);
          transition: background 0.2s ease, transform 0.25s ease,
            box-shadow 0.2s ease, width 0.28s ease, border-radius 0.28s ease,
            color 0.2s ease;
        }
        .tl-back-strip:hover {
          background: #0e7d9c;
          transform: scale(1.07);
          box-shadow: 0 6px 18px rgba(27, 167, 201, 0.45);
        }
        .tl-back-strip:focus-visible {
          outline: 2px solid rgba(27, 167, 201, 0.6);
          outline-offset: 3px;
        }
        .tl-back-strip-label {
          display: none;
        }
        /* <900px the map is full-width and the basemap slider owns the map's
           top-right corner — drop the button below that row */
        @media (max-width: 900px) {
          .tl-back-strip {
            top: 58px;
            right: 14px;
            width: 42px;
            height: 42px;
          }
        }
        @media (min-width: 1024px) {
          .tl-back-strip {
            top: 0;
            bottom: 0;
            right: 0;
            height: auto;
            /* v6 (2026-09-26): 48px at rest = 120% of the v5 40px; hover
               nudges to 58px — enough for a feeling of confirmation, not a
               protrusion (user 2026-09-26). */
            width: 48px;
            z-index: 25;
            border-radius: 0;
            background: #ebe8e2;
            color: #8a8478;
            border-left: 1px solid rgba(15, 23, 42, 0.07);
            box-shadow: none;
            /* the label is absolutely positioned, so the flex box centres the
               triangle alone — v5's in-flow invisible label pushed the arrow
               above the true vertical centre (user 2026-09-26) */
            transition: width 0.25s ease, background 0.2s ease,
              color 0.2s ease;
          }
          .tl-back-strip:hover {
            width: 58px;
            background: #cfeaf5;
            color: #0e7d9c;
            transform: none;
            box-shadow: none;
          }
          /* arrow ↔ label crossfade (user 2026-09-26: no hard swap): the
             triangle drifts left and fades first, the vertical label then
             fades in with a slight leftward settle */
          .tl-back-arrow {
            transition: opacity 0.16s ease, transform 0.24s ease;
          }
          .tl-back-strip:hover .tl-back-arrow {
            opacity: 0;
            transform: translateX(-10px);
          }
          .tl-back-strip-label {
            /* the base rule hides the label with display:none at every
               width — this block must explicitly re-show it, or the hover
               crossfade animates an element that never paints (computed
               opacity reads "1" regardless — v6 shipped with an invisible
               label, spotted by the user 2026-09-26) */
            display: block;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) translateX(6px);
            writing-mode: vertical-rl;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 3px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s ease 0.08s,
              transform 0.25s ease 0.08s;
          }
          .tl-back-strip:hover .tl-back-strip-label {
            opacity: 1;
            transform: translate(-50%, -50%) translateX(0);
          }
        }
        /* Click handoff (v9, 2026-09-28 user feedback): faster (0.35→0.25s)
           and the colour FADES as the sheet expands — it starts at the
           strip's hover blue (#cfeaf5) and washes out to a very light blue
           by the time the viewport is covered. The hold before navigation
           shrinks to match (300ms). */
        .tl-back-wipe {
          position: fixed;
          inset: 0;
          z-index: 95;
          background: #cfeaf5;
          transform-origin: right center;
          animation: tl-wipe 0.25s ease-in forwards;
          pointer-events: none;
        }
        @keyframes tl-wipe {
          from {
            transform: scaleX(0);
            background-color: #cfeaf5;
          }
          55% {
            background-color: #e2f4fb;
          }
          to {
            transform: scaleX(1);
            background-color: #eef9fd;
          }
        }
        /* Entry veil (v11, 2026-09-28 user request): the time-reverse of the
           exit wipe above. The page boots UNDER a full-viewport sheet and
           the sheet retracts toward the right edge (where the back strip
           lives) once trip data AND the map are ready. Colour runs the exit
           fade backwards: #eef9fd while covering, deepening to the strip's
           hover blue #cfeaf5 as it pulls away. NOTE: the veil's CSS lives in
           globals.css, NOT here — this styled-jsx block only renders once
           the trip data is loaded, so veil styles here would miss the
           static-HTML first paint (the whole point of the veil). */
        .story-col {
          width: 54%;
        }

        /* ---- map ---- */
        .map-pane {
          position: relative;
          height: var(--tl-map-h);
          transition: height 0.45s ease;
        }
        .map-container {
          position: absolute;
          inset: 0;
          /* v13 (2026-09-28 user request): opaque neutral ground under the
             tiles — if the basemap hasn't finished loading (fast scroll on
             mobile), the story text underneath no longer shows through. */
          background: #e9edf0;
        }
        /* Basemap switch (2026-09-26 v4): back at the map's top-right corner
           for ALL viewports (the divider folder-tab column is gone), restyled
           as one joined segmented "slider" — the four buttons are flush
           inside a pill track and the active option fills its segment blue
           like a knob (user 2026-09-26). */
        .basemap-ctl {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 5;
          display: flex;
          align-items: stretch;
          padding: 3px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.14);
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(6px);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
        }
        .bm-btn {
          width: 34px;
          height: 28px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: #374151;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .bm-btn:hover {
          color: #0e7d9c;
        }
        .bm-btn.on {
          background: #1ba7c9;
          color: #ffffff;
          box-shadow: 0 1px 4px rgba(14, 125, 156, 0.35);
        }
        .map-overlay-top {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 4;
        }
        .timeline-indicator {
          background: rgba(255, 255, 255, 0.92);
          border-radius: 10px;
          padding: 8px 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          font-size: 12px;
          line-height: 1.4;
          max-width: 240px;
        }
        .timeline-day {
          font-weight: 600;
          color: #6b7280;
        }
        .timeline-time {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }
        .timeline-scene {
          color: #374151;
          margin-top: 2px;
        }
        .map-legend {
          position: absolute;
          left: 14px;
          bottom: 14px;
          z-index: 4;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 10px;
          padding: 9px 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          font-size: 11.5px;
          color: #374151;
          /* 2026-09-26: fixed-width symbol column + label column — every
             swatch (lines and the dot) shares the same grid track, so the
             labels align (the old flex rows had ragged symbols). */
          display: grid;
          grid-template-columns: 22px auto;
          column-gap: 8px;
          row-gap: 7px;
          align-items: center;
        }
        /* v14 (2026-09-28 user request): collapsible legend, collapsed by
           default. The toggle is a header row spanning both grid columns;
           when closed the pill shrinks to just that row. */
        .map-legend:not(.open) {
          padding: 7px 11px;
          row-gap: 0;
        }
        .lg-toggle {
          grid-column: 1 / -1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 0;
          padding: 0;
          margin: 0;
          font: inherit;
          font-weight: 600;
          color: #4b5563;
          cursor: pointer;
          user-select: none;
        }
        .lg-toggle:hover {
          color: #1f2937;
        }
        .lg-swatch {
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          width: 22px;
          height: 12px;
        }
        .map-legend .lg-swatch .lg {
          width: 100%;
          border-top-width: 1.5px;
        }
        .lg-caret {
          transition: transform 0.2s ease;
        }
        .map-legend.open .lg-caret {
          transform: rotate(90deg);
        }
        .map-legend .lg {
          display: inline-block;
          width: 22px;
          height: 0;
          border-top-style: solid;
        }
        .map-legend .lg-attr {
          justify-self: center;
        }
        .lg-ground {
          border-top: 2px solid #1ba7c9;
        }
        /* v9 (2026-09-28): flight must read as an ORANGE DASHED line — the
           generic .map-legend .lg rule (0,2,0) outranked .lg-air (0,1,0)
           and forced solid. Re-declare with matching specificity so the
           later-in-sheet dashed shorthand wins. */
        .map-legend .lg-air {
          border-top: 2px dashed #d97706;
        }
        .lg-gap {
          border-top: 2px dotted #a8a196;
        }
        .lg-attr {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #c96f2f;
          border: 1.5px solid #fff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
        }
        /* v14.2: planned-but-not-entered — the same dot, hollow: white core,
           terracotta ring (mirrors the map's data-driven marker style) */
        .lg-attr-planned {
          background: #fff;
          border-color: #c96f2f;
          box-shadow: 0 0 0 1px rgba(201, 111, 47, 0.25);
        }

        /* v16 (2026-10-07): the attraction review popup was removed, so its
           .attraction-popup / .ap-* rules went with it — the dots below the
           legend are pure context markers now. */

        /* ---- story ---- */
        .story-pane {
          /* v9 (2026-09-28, user pick: plan A): cap raised 545→627 — the text
             column grows ~15% at wide viewports (413 → up to 495px); the pane
             floats centred in the 54% story column. Note: for viewports below
             ~1161px the pane simply fills the column, so the old hand-computed
             rail formula no longer holds there — TravelNav now measures the
             pane per frame instead (plan A). */
          max-width: 627px;
          margin: 0 auto;
          /* v12: no bottom padding — the finale is the last element and is
             exactly 100vh tall, so trailing padding would offset its "centred
             at full scroll" geometry (the old 80px footer-era pad made the
             finale centre land 80px below the viewport midline). */
          padding: 0 28px;
        }
        /* ≥1024: day capsules stretch back out over the freed gutter while
           PINNED (stuck at the sticky top) — v10 (2026-09-28 user request):
           the overhang no longer requires .on. A capsule that is deactivated
           while stuck keeps its length (only the lit colour goes out) and
           shortens when the next day block pushes it off — TravelStory's
           exact-stuck pinned test un-pins it at that moment. Mid-viewport
           activation still just lights the capsule up (colour/glow below),
           so it can never interfere with the progress rail while still
           travelling. */
        @media (min-width: 1024px) {
          .story-pane {
            padding-right: 104px;
          }
          .story-pane .day-block.pinned .day-capsule {
            /* +56 (not +76): the rail sits closer to the pane edge than the
               raw formula suggests (vw includes the scrollbar), and this
               range has no left overhang — the right reach must clear it */
            width: calc(100% + 56px);
            margin-right: -56px;
          }
        }
        /* ≥1280 (user 2026-09-26): a PINNED Day capsule grows ~15% longer
           (413+76=489 → 561px) by overhanging BOTH ways — the dot axis and
           the spine that tracks it slide left, the capsule's right end
           reaches toward the rail. v10: .on no longer required (deactivated
           capsules stay long until pushed off). Travelling capsules stay at
           text width. NOTE: the matching .scene-section overrides live AFTER
           the base spine rules below — same-specificity media overrides must
           come later in the sheet or the base rule wins. */
        @media (min-width: 1280px) {
          .story-pane .day-block.pinned .day-capsule {
            width: calc(100% + 148px);
            margin-left: -74px;
            margin-right: -74px;
          }
        }
        /* Active-scene spine (2026-09-26 user tweak): the blue line shares the
           Day capsule's dot axis — dot centre sits 21px in from the section's
           outer edge (1px capsule border + 16px padding + 4px half-dot) — so
           the line is drawn by a ::before instead of the border (a border
           can't move inward). NOTE: absolute offsets resolve against the
           PADDING box, which starts inside the 3px transparent border —
           left must be 16.5px (not 19.5px) for the 3px line to centre on
           21px. Text keeps a clear gap (border 3px + padding 34px = 37px). */
        .scene-section {
          position: relative;
          padding: 48px 0 32px;
          border-left: 3px solid transparent;
          padding-left: 34px;
          opacity: 0.62;
          transition: opacity 0.35s ease;
        }
        .scene-section::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 16.5px;
          width: 3px;
          border-radius: 2px;
          background: #1ba7c9;
          opacity: 0;
          /* v9 (2026-09-28 user request): fade in/out IN PLACE — the old
             left slide ("pops out right-to-left") collided with neighbouring
             content. v10: at ≥1280 the position is constant anyway (see the
             media block below), so opacity is the only thing that ever
             animates. */
          transition: opacity 0.35s ease;
        }
        .scene-section.active {
          opacity: 1;
        }
        .scene-section.active::before {
          opacity: 1;
        }
        .scene-section.unit-title {
          min-height: 12vh;
          opacity: 1;
        }
        .scene-section.unit-title::before {
          opacity: 0;
        }
        /* ≥1280: the spine sits at the overhanging capsule's dot axis ALWAYS
           — active or not (v12 2026-09-28 user report: with the offset on
           .active only, DEactivation flipped left back to 16.5px instantly,
           so the fading-out bar visibly jumped back to the text edge; the
           transition only covers opacity). Position is now constant at this
           breakpoint; opacity is the only thing that ever animates. The dot
           axis sits at section outer left - 53 (pinned capsule overhangs 74
           left); padding-box offset = -53 - 3 (border) - 1.5 (half line) =
           -57.5px. The reduced padding-left centers the text between spine
           and rail (user 2026-09-26). Must come AFTER the base rules (same
           specificity, later in the sheet wins). */
        @media (min-width: 1280px) {
          .scene-section::before {
            left: -57.5px;
          }
          .scene-section {
            padding-left: 26px;
          }
        }
        .day-block {
          position: relative;
        }
        /* a gap between consecutive day blocks: the incoming capsule pushes
           the previous one out without ever touching it */
        .day-block + .day-block {
          padding-top: 26px;
        }
        /* sticky day capsule: pins under the trip progress bar while its day
           is on screen; the next day block pushes it out. Opaque bg so story
           text cannot show through while stuck. */
        .day-capsule {
          position: sticky;
          top: calc(var(--tl-top) + 46px);
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 7px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          background: #faf9f6;
          overflow: hidden;
          /* width/margin animate the pinned grow (travelling capsules sit at
             text width; pinned ones overhang with or without .on — v10) */
          transition: border-color 0.35s ease, box-shadow 0.35s ease,
            background 0.35s ease, width 0.35s ease, margin 0.35s ease;
          cursor: pointer;
        }
        .day-capsule:hover {
          border-color: #cfd4da;
        }
        .day-capsule:focus-visible {
          outline: 2px solid rgba(27, 167, 201, 0.6);
          outline-offset: 2px;
        }
        /* B: day-progress fill, width driven by --fill from a rAF loop */
        .dc-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--fill, 0%);
          background: rgba(27, 167, 201, 0.13);
          border-radius: 999px;
          transition: background 0.4s ease;
        }
        /* a day already read: fill fades to gray */
        .day-capsule.done .dc-fill {
          background: rgba(100, 116, 139, 0.16);
        }
        .dc-dot,
        .dc-label,
        .dc-date,
        .dc-km {
          position: relative;
          z-index: 1;
        }
        .dc-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #c9ced4;
          transition: background 0.35s ease, transform 0.35s ease;
        }
        .dc-label {
          font-weight: 800;
          font-size: 14px;
        }
        .dc-date {
          margin-left: auto;
          color: #374151;
          font-weight: 600;
          font-size: 13px;
        }
        .dc-km {
          color: #9ca3af;
          font-size: 12px;
        }
        .dc-plane {
          color: #1ba7c9;
          font-size: 12px;
          margin-right: 5px;
        }
        /* A: lit state while the day is the active one */
        .day-capsule.on {
          border-color: rgba(27, 167, 201, 0.85);
          box-shadow: 0 1px 12px rgba(27, 167, 201, 0.28);
          background: #f4fbfd;
        }
        .day-capsule.on .dc-dot {
          background: #1ba7c9;
          transform: scale(1.35);
          animation: dc-breathe 2s ease-in-out infinite;
        }
        @keyframes dc-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(27, 167, 201, 0.5); }
          55% { box-shadow: 0 0 0 7px rgba(27, 167, 201, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .day-capsule.on .dc-dot { animation: none; }
        }
        .scene-section.unit-transit {
          min-height: 55vh;
        }
        /* v12 (2026-09-28): tighter approach to the finale — the old story
           footer (deleted) plus 75vh of scroll room put the finale far from
           the last scene. 20vh is enough for the band to reach the final
           anchor without feeling like a dead stretch. */
        .end-spacer {
          min-height: 20vh;
        }
        /* v12: exactly 100vh — anchored at the page bottom at full scroll,
           the block's vertical centre then lands exactly on the viewport
           midline (user: "拉到底的时候完结撒花正好垂直在中间"). */
        .finale {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-left-color: transparent;
        }
        .finale-title {
          font-size: 34px;
          margin: 6px 0 12px;
        }
        .finale-line {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.8;
          max-width: 460px;
        }
        /* v12: the deleted story-footer's data-source note, kept as a small
           caption inside the finale */
        .finale-src {
          margin: 22px 0 0;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.7;
          max-width: 460px;
        }
        .intro {
          /* v12: full-viewport boot screen (was 88vh — the Day 0 capsule
             peeked in at the bottom, an odd first impression). Column layout:
             the text block centres itself in the space above the scroll cue
             (auto margins), the cue anchors the bottom edge. */
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          border-left: none;
          opacity: 1;
        }
        .intro-inner {
          margin: auto 0;
        }
        .intro-inner h1 {
          font-size: 40px;
          margin: 6px 0 10px;
          line-height: 1.15;
        }
        .kicker {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 12px;
          color: #1ba7c9;
          font-weight: 700;
          margin: 0;
        }
        .intro-meta {
          color: #4b5563;
          margin: 0 0 18px;
        }
        .intro-hint {
          color: #6b7280;
          font-size: 14px;
        }
        /* v12 (2026-09-28 user request): bottom scroll cue of the boot
           screen — a downward double chevron (user pick) with a looping
           drop animation plus "Scroll to read". */
        .intro-scroll-hint {
          align-self: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 34px;
        }
        .hint-chevrons {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #1ba7c9;
        }
        .hint-chevrons svg {
          display: block;
          margin: -6px 0;
          animation: hint-drop 1.5s ease-in-out infinite;
        }
        .hint-chevrons svg:last-child {
          animation-delay: 0.2s;
        }
        @keyframes hint-drop {
          0% {
            transform: translateY(-5px);
            opacity: 0;
          }
          35% {
            opacity: 1;
          }
          75%,
          100% {
            transform: translateY(5px);
            opacity: 0;
          }
        }
        .intro-scroll-hint .hint-text {
          margin-top: 12px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8a8478;
        }
        @media (prefers-reduced-motion: reduce) {
          .hint-chevrons svg {
            animation: none;
            opacity: 0.85;
            transform: none;
          }
        }

        .night-divider {
          min-height: 26vh;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #6b7280;
          font-size: 13.5px;
          letter-spacing: 0.02em;
        }
        .night-moon {
          font-size: 18px;
          color: #5b6b9e;
        }
        .day-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 42px 0 0 21px;
          border-top: 1px solid #e5e7eb;
          margin-top: 10px;
        }
        .day-label {
          font-weight: 800;
          font-size: 18px;
        }
        .day-date {
          color: #374151;
          font-weight: 600;
        }
        .day-distance {
          color: #9ca3af;
          font-size: 13px;
          margin-left: auto;
        }

        .scene-head h2 {
          margin: 6px 0 2px;
          font-size: 22px;
        }
        .scene-meta {
          color: #6b7280;
          font-size: 13px;
        }
        .confidence {
          color: #b45309;
        }
        .chip {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: 999px;
          color: #fff;
        }
        .chip-morning {
          background: #d9a441;
        }
        .chip-afternoon {
          background: #c96f2f;
        }
        .chip-evening {
          background: #5b6b9e;
        }
        .chip-transit {
          background: #6b7280;
        }
        .day-heading {
          color: #4b5563;
          font-size: 13.5px;
          padding: 6px 0 0 21px;
          margin: 0;
        }
        .scene-body {
          margin-top: 14px;
        }
        .scene-body p {
          margin: 0 0 14px;
          color: #1f2937;
          font-size: 15px;
          line-height: 1.85;
        }
        .scene-note {
          color: #6b7280;
          font-style: italic;
          font-size: 14px;
        }
        .attraction {
          margin: 18px 0;
        }
        .attraction h3 {
          margin: 0 0 6px;
          font-size: 17px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .not-visited {
          font-size: 11px;
          color: #9ca3af;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          padding: 1px 8px;
          font-weight: 500;
        }
        .excerpt {
          margin: 0;
          color: #374151;
          font-size: 14.5px;
          line-height: 1.65;
        }
        .match-warning {
          color: #b45309;
          font-size: 12.5px;
          margin: 4px 0;
        }
        .boot-loading,
        .boot-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: #6b7280;
        }

        @media (max-width: 900px) {
          .travel-layout {
            flex-direction: column;
            /* v14 (2026-09-28 user request): 4:6 map/text split (was 44:56) —
               leaves more room for the story text. --tl-map-h also drives the
               day-capsule sticky top and the finale height below. */
            --tl-map-h: 40vh;
          }
          body.tl-immersive .travel-layout {
            --tl-map-h: 40vh;
          }
          .map-col {
            width: 100%;
            position: sticky;
            z-index: 10;
            border-right: none;
            /* v13 (2026-09-28 user request): the map/text seam on mobile was
               a bare cut — same paper-gray rule as the desktop border-right. */
            border-bottom: 2px solid #d9d4cb;
          }
          .story-col {
            width: 100%;
          }
          .intro {
            min-height: 60vh;
          }
          /* v13: the map is sticky over the top 40vh for the WHOLE scroll, so
             the day capsule must pin just BELOW it — the old top (46px) put
             it behind the map (z 5 < 10) where it vanished (user report). */
          .day-capsule {
            top: calc(var(--tl-map-h) + 8px);
          }
          /* v13 (2026-09-28 user request): same centre-at-full-scroll
             geometry as desktop, rebased to the VISIBLE area. The map always
             covers the top 40vh, so height = 100vh − map puts the block's
             centre exactly on the midline of the strip between the map's
             bottom edge and the viewport bottom. */
          .finale {
            min-height: calc(100vh - var(--tl-map-h));
          }
        }
      `}      </style>
      </div>
      {/* v9 (2026-09-28): the wipe mounts at the TravelLog ROOT, OUTSIDE the
          sticky .map-col — inside it the sheet failed to cover the story
          text (user report: "幕布没有遮住所有的文字"); as a root-level fixed
          element with inset-0 it always spans the full viewport. */}
      {leaving ? <div className="tl-back-wipe" aria-hidden="true" /> : null}
    </>
  );
}
