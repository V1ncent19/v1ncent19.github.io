"use client";

import { useEffect, useState } from "react";
import type { TripInfo, TripTrack, TravelScene, Attraction } from "@/lib/travel/types";
import { useStoryController } from "@/lib/travel/use-story-controller";
import TravelMap from "./TravelMap";
import TravelStory from "./TravelStory";

/*
 * DATA SPLIT (2026-10-17) — why the four small files are imported but the
 * track is fetched:
 *
 *   trip.json      3 KB   ┐
 *   scenes.json   90 KB   ├ imported: build-time, no URL, no copy step.
 *   attractions    11 KB  │  These are the files a human actually edits, so
 *   diagnostics    11 KB  ┘  their ONLY copy lives in content/ — edit them
 *                            there and the next build picks it up.
 *   track.json  1639 KB   ─ fetched from public/data/travel/<trip>/.
 *                            Machine output of the GPS scrape; nobody types
 *                            it by hand. Inlining it would put 1.6 MB (93% of
 *                            the payload) in the JS bundle and make the page
 *                            wait for it, and it would grow with every trip.
 *
 * The downstream components (TravelMap, useStoryController) only ever see the
 * parsed objects, so they do not care which route the data took.
 */
import tripJson from "@/content/travel/ptes-2025/trip.json";
import scenesJson from "@/content/travel/ptes-2025/scenes.json";
import attractionsJson from "@/content/travel/ptes-2025/attractions.json";

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
  lang = "en",
}: {
  tripId?: string;
  /** When set, renders the back exit linking to the /travel hub (all
   *  viewports): a full-height right-edge strip on desktop, a small circular
   *  button top-right on narrow screens. backLabel is the strip's vertical
   *  text and the aria-label. */
  backHref?: string;
  backLabel?: string;
  /** Page language — forwarded to the map so maplibre's own UI strings (the
   *  cooperative-gesture hint) match the page. Defaults to English, which is
   *  maplibre's built-in table. */
  lang?: "en" | "zh";
}) {
  const DATA_BASE = `/data/travel/${tripId}`;
  /*
   * trip / scenes / attractions come from the imports above — synchronous,
   * already typed, no fetch. Only the GPS track is fetched. Seeded with
   * lazy initialisers so there is no `setState` in an effect body
   * (react-hooks/set-state-in-effect).
   *
   * The `as unknown as` casts are compile-time only: TS infers a JSON import
   * as exact literal shapes, so e.g. `bounds: number[]` will not satisfy the
   * `Bounds` 4-tuple even though the runtime data is correct. Nothing is
   * evaluated at runtime; these just re-type what the JSON already holds.
   */
  const [trip, setTrip] = useState<TripInfo | null>(() => tripJson as unknown as TripInfo);
  const [track, setTrack] = useState<TripTrack | null>(null);
  const [scenes] = useState<TravelScene[]>(
    () => (scenesJson as unknown as { scenes: TravelScene[] }).scenes,
  );
  const [attractions] = useState<Attraction[]>(
    () => (attractionsJson as unknown as { attractions?: Attraction[] }).attractions ?? [],
  );
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
    /*
     * Only the track is fetched (see the DATA SPLIT note above). Everything
     * else is already in the bundle, so the page has text to render before
     * this resolves — track.json is 1.6 MB and is the reason this is async
     * at all.
     */
    fetch(`${DATA_BASE}/track.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`track.json → HTTP ${r.status}`);
        return r.json();
      })
      .then((track: TripTrack) => {
        // derive epoch ms once at load
        for (const p of track.points) p.ts = Date.parse(p.t);
        track.points.sort((a: { ts: number }, b: { ts: number }) => a.ts - b.ts);
        setTrack(track);
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
        document.body.classList.remove("tl-veil-boot", "tl-veil-open", "tl-veil-band");
      }
    };
    document.body.addEventListener("animationend", done);
    return () => {
      document.body.removeEventListener("animationend", done);
      document.body.classList.remove("tl-veil-boot", "tl-veil-open", "tl-veil-band");
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
  // The guard matters: the fast path can finish in ~500ms and remove
  // tl-veil-boot, after which this timer would still fire and re-add
  // tl-veil-open to a body that is no longer booting — a class that then
  // never comes off (observed: tl-veil-open lingering on body long after the
  // curtain had gone).
  useEffect(() => {
    if (!trip || !track) return;
    const t = setTimeout(() => {
      if (
        document.body.classList.contains("tl-veil-boot") &&
        !document.body.classList.contains("tl-veil-open")
      ) {
        document.body.classList.add("tl-veil-open");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [trip, track]);

  const { state, registerSection, enterExplore, resumeStory } = useStoryController(trip, track, scenes);

  if (error) {
    return <div className="boot-error">Failed to load travel data: {error}</div>;
  }
  if (!trip || !track) {
    /* The entry curtain covers the viewport from the parse-time class, so this
       placeholder is never actually read — it is only what sits underneath if
       the curtain is disabled (prefers-reduced-motion) or its CSS fails. Kept
       as text rather than blank so a JS-dead/stripped-CSS state is still
       intelligible instead of a white page. */
    return (
      <div className="boot-loading" role="status" aria-live="polite">
        <span className="boot-loading-dot" aria-hidden="true" />
        Loading trip data…
      </div>
    );
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
            lang={lang}
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
                    label. Two stroked chevrons, no fill.

                    CENTRING (v20, 2026-10-24: "未悬浮状态的左箭头的水平对齐
                    还是位置不对"). The geometric span is x ∈ [6,18] and the
                    stroke adds 1 unit on each side, so the INK spans [5,19] —
                    centre exactly 12, i.e. the viewBox centre. The path data
                    therefore needs NO offset: this got "fixed" with a +0.5
                    translate in v19 on the theory that the glyph was 0.5 off,
                    which was arithmetic done on the endpoints and not on the
                    stroked outline. That shift was itself a 0.67px error at
                    32px. Leave the coordinates alone.

                    The real offender was the BOX: `border-left: 1px` with
                    border-box sizing narrowed the grid column to 46px and
                    pushed its centre 0.5px right of the strip's centre, so
                    every child centred "correctly" inside a mis-centred
                    column. Fixed with a transparent matching border-right.
                    See .tl-back-strip's border-right comment.

                    Size 16 (2026-10-24: "可以把左箭头缩小一半。目前箭头的尺寸和
                    悬浮后字体大小差异太大，看起来很奇怪"). At 32 the chevron was
                    twice the cap height of the 12px vertical label it
                    crossfades into, so the hover read as a different, bigger
                    control. 16px matches the label's optical weight. */}
                <svg
                  className="tl-back-arrow"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
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
          background: var(--tl-paper);
          color: var(--tl-ink);
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
            Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        body.tl-immersive .travel-layout {
          --tl-top: 0px;
          --tl-map-h: 100vh;
        }
        /* v19 (2026-10-09): trip-page theme tokens — MOVED to app/globals.css
           on 2026-10-17. They are plain custom-property declarations scoped to
           body.tl-immersive, and this styled-jsx block only exists once
           TravelLog mounts. The pilgrimage page (/travel/just-because) sets
           the same body class but does not render TravelLog, so every
           var(--tl-…) there resolved to nothing (measured:
           getComputedStyle(body).getPropertyValue("--tl-panel-strong") === "").
           A global stylesheet is the right home — the tokens now ship in the
           critical CSS and are correct on first paint. Do not redeclare them
           here; edit the globals.css block instead. */
        .map-col {
          width: 46%;
          position: sticky;
          top: var(--tl-top);
          height: var(--tl-map-h);
          transition: height 0.45s ease;
          /* The licence strip's height, published on the COLUMN so the map
             inside can trim MapLibre's gesture veil (see the note on the
             gesture-screen rule further down). This 26px is only the
             prerendered/first-paint guess: lib/travel/map-split.tsx measures
             the real strip and overwrites this property inline, so a wrapped
             two-line credit on a narrow phone is handled without a breakpoint
             here. */
          --tl-attrib-h: 26px;
          /* Map/story divider (2026-09-26): neutral paper gray as of v6 —
             the brand blue was reserved for interactive elements (user
             2026-09-26: "地图和文本区的分界线改成灰色"). */
          border-right: 2px solid var(--tl-paper-line);
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
          background: var(--tl-accent);
          color: var(--tl-on-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(27, 167, 201, 0.35);
          transition: background 0.2s ease, transform 0.25s ease,
            box-shadow 0.2s ease, width 0.28s ease, border-radius 0.28s ease,
            color 0.2s ease;
        }
        .tl-back-strip:hover {
          background: var(--tl-accent-strong);
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
            --tl-back-duration: 220ms;
            --tl-back-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
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
            background: var(--tl-strip);
            color: var(--tl-strip-ink);
            border-left: 1px solid var(--tl-hair);
            /* SYMMETRIC BOX (v20, 2026-10-24: "未悬浮状态的左箭头的水平对齐
               还是位置不对"). border-left: 1px with border-box sizing shrinks
               the CONTENT box to 47px and shifts it 1px right, so the grid
               column's centre lands at stripCx + 0.5. Both the chevron and
               the label then centre perfectly INSIDE that column — which is
               why every previous probe said "centred" (they compared against
               the column) while the eye compared against the strip and saw
               an offset. A transparent right border of the same width
               restores the content box to 46px centred on the strip. */
            border-right: 1px solid transparent;
            box-shadow: none;
            transition: width var(--tl-back-duration) var(--tl-back-ease),
              background-color var(--tl-back-duration) var(--tl-back-ease),
              color var(--tl-back-duration) var(--tl-back-ease);
          }
          .tl-back-strip:hover {
            width: 58px;
            background: var(--tl-chip);
            color: var(--tl-accent-strong);
            transform: none;
            box-shadow: none;
          }
          /* Crossfade WITHOUT motion (v12, 2026-10-24).
             History: v9 (dfd956e) anchored both glyphs on one fixed point, so
             the 26px chevron sat on top of the 20x126px label for the whole
             220ms (measured 18.9 x 26.0 px intersection) and the label also
             slid 4px while fading. v10 stacked them in two grid rows — the
             overlap went away, but the label then started under the ARROW
             and ran to the viewport top, leaving its ink centre 80px above
             the strip's centre. v11 added align-self:center and called it
             centred — it was NOT, and the amount was viewport-dependent
             (measured ink centre 228.5px above the strip centre at 900px
             tall, 363.5px at 1440px: the error grew with the window, which
             is why it looked fine in one probe window and wrong in the
             browser the user actually reads in).
             ROOT CAUSE: the base rule sets display:flex + align-items:center.
             The desktop block changed display to grid but never reset
             align-items, so every row was sized to its CONTENT and packed
             into the middle of a 900px-tall strip: rows were 7+126+14 =
             147px, the grid box only 147px tall, and align-items:center then
             parked that whole 147px block at the strip's centre. Row 1's
             centre was therefore 70px above the midline, not on it.
             FIX: stretch the tracks (no align-items on the grid), so row 1
             really is the top half. Centring is then GEOMETRY, not a magic
             offset — the label's centre is the strip's centre at every window
             size, which is what "按比例居中" should mean. */
          .tl-back-strip {
            display: grid;
            grid-template-rows: 1fr 14px 1fr;
            grid-template-columns: 1fr;
            align-items: stretch;
            /* No justify-self on the container: the arrow is the label's
               sibling in the same column, so centring "the item" there does
               nothing for the label. The label centres itself with
               width:fit-content + margin-inline:auto (see .tl-back-strip-label),
               which is what actually moves the INK onto the axis.
               And do NOT use justify-items here: lightningcss merges a
               justify-items / align-items pair into place-items and silently
               reorders the axes, which restores the row-collapsing centring. */
          }
          .tl-back-arrow {
            grid-row: 2;
            grid-column: 1;
            align-self: center;
            /* HORIZONTAL centring of the idle chevron (v19, 2026-10-24:
               "未悬浮状态的左箭头的水平对齐还是位置不对，目前贴左").
               The SVG is 26px wide in a 57px column and grid items default
               to justify-self:start, so it sat flush against the strip's left
               edge — the label was centred but the arrow was not, and since
               the arrow is what you see at rest, the whole button read as
               left-aligned. align-self only handles the BLOCK axis (vertical
               here); the inline axis needs its own declaration. */
            justify-self: center;
            pointer-events: none;
            transition: opacity var(--tl-back-duration) var(--tl-back-ease);
          }
          .tl-back-strip-label {
            /* the base rule hides the label with display:none at every
               width — this block must explicitly re-show it, or the hover
               crossfade animates an element that never paints (computed
               opacity reads "1" regardless — v6 shipped with an invisible
               label, spotted by the user 2026-09-26) */
            display: block;
            /* Span ALL THREE tracks, not just row 1.
               v13 (2026-10-24, after the user reported this twice): putting
               the label in row 1 and centring it there does NOT centre it on
               the strip. Measured, and reproduced in a bare test page, so it
               is the layout's behaviour rather than a stray rule: a
               vertical-rl box in a 1fr row reported its centre 228.5px ABOVE
               the strip centre and, worse, the error GREW with the window
               (183.5px at 720 tall, 363.5px at 1440) — which is why it looked
               right in one test window and wrong in the browser the user
               actually reads in.
               Spanning 1 / span 3 and centring gives offset EXACTLY 0 at every
               size, because the item's containing block is then the whole
               strip: its centre is the strip's centre by construction. No
               magic number, and it survives any window height. It still
               cannot touch the chevron — the label is capped to the top half
               by max-height below, which keeps their boxes disjoint. */
            grid-row: 1 / span 3;
            grid-column: 1;
            align-self: center;
            max-height: calc(50% - 20px);
            overflow: hidden;
            /* vertical-lr, NOT vertical-rl (v18, 2026-10-24).
               THE BUG THE USER KEPT REPORTING, and why every earlier attempt
               "measured" as fixed: getBoundingClientRect on the LABEL reports
               the BLOCK's box, and the block was (by construction) 0.5px from
               the strip's centre — so every probe said "centred". The INK was
               not. With vertical-rl the line box runs right-to-left, so the
               single line starts flush against the label's RIGHT edge: the
               15px-wide glyph column sat at x=1423..1438 in a 58px strip
               (ink centre 19.5px right of the strip's centre), and the text
               also ended up hard against the viewport's right edge — exactly
               what "水平对齐也不对" meant. vertical-lr lays the line from the
               LEFT edge instead, so the ink starts where the box starts.
               Note this is a writing-direction issue, not an alignment one:
               justify-self / text-align can move the BOX, they cannot change
               which edge the line box starts from. */
            writing-mode: vertical-lr;
            /* AND the box must shrink to the glyph column. With the block
               57px wide (= the whole strip), the line box fills it and has
               nowhere to go: text-align centres lines inside the line box,
               the line box fills the block, so the ink stayed 18.5px left.
               width: fit-content makes the block exactly one glyph column
               wide, and justify-self: center then puts THAT column on the
               strip's centre — box centring and ink centring finally agree.
               (Both numbers were measured, not guessed: 8.5px of padding +
               15px glyph column = 23.5px from each side of the 58px strip,
               using the label's own padding so the inset is not hard-coded
               to today's text length.) */
            width: fit-content;
            padding-inline: 8px;
            text-align: center;
            /* Auto margins, not justify-self, for the shrunken box. Once the
               block is size-fit it is also OFFSET-FREE inside its grid area,
               and justify-self no longer reaches it (measured: box stayed
               10.5px left). With auto margins the free space is split evenly,
               which is the same guarantee and does not depend on how the
               browser classifies a size-fit item. */
            margin: 0 auto;
            /* Explicit px, not inherit: the strip's inherited line-height
               (15.3px x 1.65 ≈ 25px) leaks into the label and inflates the
               natural height by ~6px, which clipped the bottom glyphs
               ("to Travel") on a 600px-tall viewport. */
            font-size: 12px;
            line-height: 19px;
            font-weight: 600;
            letter-spacing: 3px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity var(--tl-back-duration) var(--tl-back-ease);
          }
          .tl-back-strip:hover .tl-back-arrow {
            opacity: 0;
          }
          .tl-back-strip:hover .tl-back-strip-label {
            opacity: 1;
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
          background: var(--tl-chip);
          transform-origin: right center;
          animation: tl-wipe 0.25s ease-in forwards;
          pointer-events: none;
        }
        @keyframes tl-wipe {
          from {
            transform: scaleX(0);
            background-color: var(--tl-chip);
          }
          55% {
            background-color: var(--tl-accent-soft-3);
          }
          to {
            transform: scaleX(1);
            background-color: var(--tl-accent-soft-2);
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
        /* Draggable split (2026-10-24). Below 900px the layout stacks and
           --tl-map-h becomes the reader's number; the hook writes it onto this
           element as --tl-map-h-mobile. Kept SEPARATE from --tl-map-h because
           that one also drives the day capsule's top and the finale's
           min-height, and on desktop it must stay 100vh (immersive) / 60vh
           (landing). */
        @media (max-width: 900px) {
          .map-pane {
            height: var(--tl-map-h-mobile, var(--tl-map-h));
            /* No height transition while a finger is on the strip: the 0.45s
               ease would lag the map half a second behind the pointer. The
               hook adds .is-dragging for the duration of the gesture. */
            transition: none;
          }
        }
        .map-container {
          position: absolute;
          inset: 0;
          /* v13 (2026-09-28 user request): opaque neutral ground under the
             tiles — if the basemap hasn't finished loading (fast scroll on
             mobile), the story text underneath no longer shows through. */
          background: var(--tl-map-bg);
        }
        /* MapLibre's cooperative-gesture veil ("USE TWO FINGERS TO MOVE THE
           MAP") is inset:0 against the nearest positioned ancestor. Here that
           is already .map-container, so it never escaped the map — but the
           container's bottom edge IS the pane's bottom edge, which the licence
           strip sits on, so the veil's last 26px (42px under 640px) fell on the
           strip and greyed it out. Pull the veil's bottom up by exactly the
           strip's height. !important because maplibre-gl.css is imported by
           the map component and lands after this sheet at equal specificity.
           The value comes from .map-col above. */
        .maplibregl-cooperative-gesture-screen {
          bottom: var(--tl-attrib-h, 26px) !important;
        }
        /* Map's top-right control (2026-09-26 v4; split into two groups
           v21 2026-10-09): TWO separate segmented pills so the reader sees at
           a glance that they are independent switches. LEFT pill = 自/昼/夜,
           the PAGE THEME (a 3-way radio, always exactly one selected) — the
           same value as the site header toggle. RIGHT pill = 卫/地, a
           theme-agnostic basemap OVERRIDE (a toggle: at most one, click the
           active one to clear). Each pill is the old joined "slider" track;
           the active segment fills blue like a knob. */
        .basemap-ctl {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bm-group {
          display: flex;
          align-items: stretch;
          padding: 3px;
          border-radius: 999px;
          border: 1px solid var(--tl-hair);
          background: var(--tl-panel);
          backdrop-filter: blur(6px);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
        }
        .bm-btn {
          width: 34px;
          height: 28px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: var(--tl-ink-2);
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .bm-btn:hover {
          color: var(--tl-accent-strong);
        }
        .bm-btn.on {
          background: var(--tl-accent);
          color: var(--tl-on-accent);
          box-shadow: 0 1px 4px rgba(14, 125, 156, 0.35);
        }
        .map-overlay-top {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 4;
        }
        .timeline-indicator {
          background: var(--tl-panel-strong);
          border-radius: 10px;
          padding: 8px 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          font-size: 12px;
          line-height: 1.4;
          max-width: 240px;
        }
        .timeline-day {
          font-weight: 600;
          color: var(--tl-muted);
        }
        .timeline-time {
          font-size: 16px;
          font-weight: 700;
          color: var(--tl-ink);
        }
        .timeline-scene {
          color: var(--tl-ink-2);
          margin-top: 2px;
        }
        .map-legend {
          position: absolute;
          left: 14px;
          /* 2026-10-17: the licence strip now owns the map's bottom edge
             (.map-attrib, shared with the pilgrimage page), so the legend has
             to sit ABOVE it or the two overlap — the strip is a licence
             obligation and must never be covered. --tl-attrib-h is published
             by the strip itself (26px desktop, 42px when it wraps on mobile).
             NOTE: no backticks in this comment — it lives inside a styled-jsx
             template literal and a stray backtick closes the string. */
          bottom: calc(var(--tl-attrib-h, 26px) + 14px);
          z-index: 4;
          background: var(--tl-panel-strong);
          border-radius: 10px;
          padding: 9px 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          font-size: 11.5px;
          color: var(--tl-ink-2);
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
          color: var(--tl-ink-3);
          cursor: pointer;
          user-select: none;
        }
        .lg-toggle:hover {
          color: var(--tl-ink);
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
          border-top: 2px solid var(--tl-accent);
        }
        /* v9 (2026-09-28): flight must read as an ORANGE DASHED line — the
           generic .map-legend .lg rule (0,2,0) outranked .lg-air (0,1,0)
           and forced solid. Re-declare with matching specificity so the
           later-in-sheet dashed shorthand wins. */
        .map-legend .lg-air {
          border-top: 2px dashed var(--tl-amber);
        }
        .lg-gap {
          border-top: 2px dotted var(--tl-gap);
        }
        .lg-attr {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--tl-attr);
          border: 1.5px solid #fff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
        }
        /* v14.2: planned-but-not-entered — the same dot, hollow: white core,
           terracotta ring (mirrors the map's data-driven marker style) */
        .lg-attr-planned {
          background: #fff;
          border-color: var(--tl-attr);
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
          background: var(--tl-accent);
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
          border: 1px solid var(--tl-line);
          border-radius: 999px;
          background: var(--tl-paper-2);
          overflow: hidden;
          /* width/margin animate the pinned grow (travelling capsules sit at
             text width; pinned ones overhang with or without .on — v10) */
          transition: border-color 0.35s ease, box-shadow 0.35s ease,
            background 0.35s ease, width 0.35s ease, margin 0.35s ease;
          cursor: pointer;
        }
        .day-capsule:hover {
          border-color: var(--tl-line-4);
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
          background: var(--tl-line-5);
          transition: background 0.35s ease, transform 0.35s ease;
        }
        .dc-label {
          font-weight: 800;
          font-size: 14px;
        }
        .dc-date {
          margin-left: auto;
          color: var(--tl-ink-2);
          font-weight: 600;
          font-size: 13px;
        }
        .dc-km {
          color: var(--tl-faint);
          font-size: 12px;
        }
        .dc-plane {
          color: var(--tl-accent);
          font-size: 12px;
          margin-right: 5px;
        }
        /* A: lit state while the day is the active one */
        .day-capsule.on {
          border-color: rgba(27, 167, 201, 0.85);
          box-shadow: 0 1px 12px rgba(27, 167, 201, 0.28);
          background: var(--tl-accent-soft-2);
        }
        .day-capsule.on .dc-dot {
          background: var(--tl-accent);
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
          color: var(--tl-ink-3);
          font-size: 15px;
          line-height: 1.8;
          max-width: 460px;
        }
        /* The sign-off line ("感谢阅读 ~ See you on the next trip!"). It had NO
           rule at all, so it inherited the layout root's sans and read as a
           caption while the sentence above it is a stat line. It is a human
           sentence in a story, so it takes the serif — 2026-10-24. */
        .finale-hint {
          font-family: var(--font-serif-latin), var(--font-serif-zh);
        }
        /* v12: the deleted story-footer's data-source note, kept as a small
           caption inside the finale */
        .finale-src {
          margin: 22px 0 0;
          color: var(--tl-faint);
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
          color: var(--tl-accent);
          font-weight: 700;
          margin: 0;
        }
        .intro-meta {
          color: var(--tl-ink-3);
          margin: 0 0 18px;
        }
        .intro-hint {
          color: var(--tl-muted);
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
          color: var(--tl-accent);
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
          color: var(--tl-strip-ink);
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
          color: var(--tl-muted);
          font-size: 13.5px;
          letter-spacing: 0.02em;
        }
        .night-moon {
          font-size: 18px;
          color: var(--tl-slate);
        }
        .day-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 42px 0 0 21px;
          border-top: 1px solid var(--tl-line);
          margin-top: 10px;
        }
        .day-label {
          font-weight: 800;
          font-size: 18px;
        }
        .day-date {
          color: var(--tl-ink-2);
          font-weight: 600;
        }
        .day-distance {
          color: var(--tl-faint);
          font-size: 13px;
          margin-left: auto;
        }

        .scene-index {
          display: inline-block;
          margin-right: 8px;
          color: var(--tl-faint);
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.06em;
        }
        .scene-head h2 {
          margin: 6px 0 2px;
          font-size: 22px;
        }
        .scene-meta {
          color: var(--tl-muted);
          font-size: 13px;
        }
        .confidence {
          color: var(--tl-amber-ink);
        }
        .chip {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: 999px;
          color: var(--tl-on-accent);
        }
        .chip-morning {
          background: var(--tl-gold);
        }
        .chip-afternoon {
          background: var(--tl-attr);
        }
        .chip-evening {
          background: var(--tl-slate);
        }
        .chip-transit {
          background: var(--tl-muted);
        }
        .day-heading {
          color: var(--tl-ink-3);
          font-size: 13.5px;
          padding: 6px 0 0 21px;
          margin: 0;
        }
        .scene-body {
          margin-top: 14px;
        }
        .scene-body p {
          margin: 0 0 14px;
          color: var(--tl-ink);
          font-size: 15px;
          line-height: 1.85;
          /* CONVENTIONS §44: 标题/正文长文用衬线，UI 控件用无衬线. The journal
             prose is the reading surface — it must take the site serif stack
             (GenWanMin2 TC first), not inherit .travel-layout's sans UI stack.
             Before 2026-10-10 <p> had no rule here, so the body silently fell
             through to a system CJK sans (Microsoft YaHei UI). */
          font-family: var(--font-serif-latin), var(--font-serif-zh);
        }
        .scene-note {
          color: var(--tl-muted);
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
          color: var(--tl-faint);
          border: 1px solid var(--tl-line-3);
          border-radius: 999px;
          padding: 1px 8px;
          font-weight: 500;
        }
        .excerpt {
          margin: 0;
          color: var(--tl-ink-2);
          font-size: 14.5px;
          line-height: 1.65;
          /* journal excerpt = body copy → serif (see .scene-body p) */
          font-family: var(--font-serif-latin), var(--font-serif-zh);
        }
        .match-warning {
          color: var(--tl-amber-ink);
          font-size: 12.5px;
          margin: 4px 0;
        }
        .boot-loading,
        .boot-error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 60vh;
          color: var(--tl-muted);
        }
        /* quiet pulse, so the fallback state still reads as "working" — it is
           what shows if the curtain is off (reduced motion) or its CSS dies */
        .boot-loading-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--tl-accent);
          animation: tl-boot-pulse 1.2s ease-in-out infinite;
        }
        @keyframes tl-boot-pulse {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .boot-loading-dot {
            animation: none;
            opacity: 0.6;
          }
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
            /* 2026-10-24: the column, not just the pane, has to follow the
               split. The map pane was already reading --tl-map-h-mobile, but
               this element still pinned itself to --tl-map-h (40vh) — and the
               GRAY SEAM (border-bottom) is drawn HERE. Dragging the map
               taller moved the pane and left the divider behind, hovering in
               the middle of the map (user: "灰色线标识顶部没有同步变化").
               The column is the one that owns the sticky geometry, so the
               reader's height belongs on it; the pane follows it at 100%. */
            height: var(--tl-map-h-mobile, var(--tl-map-h));
            transition: none;
            /* v13 (2026-09-28 user request): the map/text seam on mobile was
               a bare cut — same paper-gray rule as the desktop border-right. */
            border-bottom: 2px solid var(--tl-paper-line);
          }
          .story-col {
            width: 100%;
          }
          .intro {
            min-height: 60vh;
          }
          /* v13: the map is sticky over the top for the WHOLE scroll, so the
             day capsule must pin just BELOW it — the old top (46px) put it
             behind the map (z-index 5 vs the map's 10) where it vanished
             (user report).
             2026-10-24: reads --tl-map-h-mobile, NOT --tl-map-h.
             --tl-map-h is declared on .travel-layout while the capsule
             lives in the SIBLING .story-col, so the old calc on --tl-map-h
             substituted empty and was invalid at computed-value time — the
             capsule stayed at the fallback 40vh + 8px (345.6px) no matter where
             the strip was dragged (measured: map bottom 338px, capsule 345.6px,
             so the capsule and its gray line started INSIDE the map and the
             story text scrolled underneath them). --tl-map-h-mobile is
             written by lib/travel/map-split.tsx on the shared frame AND on the
             map column, so it inherits down to .day-capsule — the same fix as
             the pilgrimage page's --pj-land. --tl-map-h stays behind it as
             the no-JS/prerender fallback. */
          .day-capsule {
            top: calc(var(--tl-map-h-mobile, var(--tl-map-h)) + 8px);
          }
          /* v13 (2026-09-28 user request): same centre-at-full-scroll
             geometry as desktop, rebased to the VISIBLE area. The map always
             covers the top 40vh, so height = 100vh − map puts the block's
             centre exactly on the midline of the strip between the map's
             bottom edge and the viewport bottom. */
          .finale {
            min-height: calc(100vh - var(--tl-map-h-mobile, var(--tl-map-h)));
          }
          /* v21: two pills (3 theme + 2 basemap segments) run wider than the
             old single track — trim each segment and the gap so the pair still
             clears the timeline pill on the map's left at 390px. */
          .basemap-ctl {
            gap: 6px;
          }
          .bm-btn {
            width: 30px;
          }
        }
      `}      </style>
      </div>
      {/* v9 (2026-09-28): the wipe mounts at the TravelLog ROOT, OUTSIDE the
          sticky .map-col — inside it the sheet failed to cover the story
          text (user report: "幕布没有遮住所有的文字"); as a root-level fixed
          element with inset-0 it always spans the full viewport. */}
      {leaving ? <div className="tl-back-wipe" aria-hidden="true" /> : null}
      {/* Entry curtain wordmark (v19, 2026-10-24). The sheet itself is the
          body::before pseudo driven by body.tl-veil-boot — a real node there
          would break React 19 hydration and miss the viewport on first paint.
          A real element is fine for the LABEL, because hydration is free to
          own its text; it simply sits on top of the pseudo and is revealed by
          the same classes. It rides in the resting band on the right edge, so
          what the reader sees during boot is a titled blue spine, not the
          naked "Loading trip data…" string. */}
      <span className="tl-veil-band" aria-hidden="true">
        Iberia 2025
      </span>
    </>
  );
}
