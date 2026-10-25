"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { MAP_SPLIT_EVENT } from "@/lib/travel/map-split";
import { chapterAtFraction } from "@/lib/travel/scrub-chapters";
import { useScrubTrack } from "@/lib/travel/use-scrub-track";
import type { TripInfo, TravelScene } from "@/lib/travel/types";

/**
 * Scroll progress + day-quick-jump for trip pages.
 * Narrow viewports (<1024): the original sticky top bar — horizontal track,
 * ☰ day-index button (the back pill moved to TravelLog's fixed top-right
 * button, 2026-09-26 v4).
 * Desktop (≥1024): the top bar is gone; the progress rail lives in the story
 * gutter with its head stacked percentage → track. The rail's axis points at
 * the ACTIVE Day capsule's right arc centre — the mirror of the active
 * section spine on the capsule's left end — so the text column sits centred
 * between the two blue bars (user 2026-09-26 v4).
 */
function TravelNav({
  trip,
  scenes,
  activeSceneId,
}: {
  trip: TripInfo;
  scenes: TravelScene[];
  activeSceneId: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /** v12: rail-foot back-to-top button — lit near the page bottom. */
  const topBtnRef = useRef<HTMLButtonElement>(null);
  /** The outer fixed .tnav-rail box (the inner track div is railRef — v9
   *  alignment writes its inline `right` HERE, on the positioned box). */
  const railBoxRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [ticks, setTicks] = useState<{ no: number; left: number }[]>([]);

  // measure day anchors in document space (first unit of each day)
  useEffect(() => {
    const measure = () => {
      const byDay = new Map<number, number>();
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-scene-id]"))) {
        const m = el.dataset.sceneId?.match(/^d(\d+)-/);
        if (!m) continue;
        const no = +m[1];
        if (!byDay.has(no)) byDay.set(no, el.getBoundingClientRect().top + window.scrollY);
      }
      const docH = document.documentElement.scrollHeight;
      const vh = window.innerHeight;
      const max = Math.max(1, docH - vh);
      // The reading line, not the viewport centre: on a phone the map is a
      // sticky band at the top that the story sits BELOW, and since 2026-10-24
      // that band's height is draggable. A day's position on the bar has to
      // move with it, or dragging the split leaves every tick pointing at the
      // wrong place. Desktop is unchanged (a 100vh column is not an overlay).
      const mapCol = document.querySelector(".travel-layout .map-col");
      const mapH = mapCol
        ? Math.min(vh, Math.max(0, mapCol.getBoundingClientRect().height))
        : 0;
      const bandY =
        mapH > 0 && mapH < vh - 120 ? mapH + (vh - mapH) * 0.35 : vh * 0.475;
      setTicks(
        [...byDay.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([no, y]) => ({
            no,
            left: Math.min(100, Math.max(0, ((y - bandY) / max) * 100)),
          }))
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    // A split drag moves every day in the document without resizing the
    // viewport OR the body, so neither signal above fires (map-split.tsx).
    window.addEventListener(MAP_SPLIT_EVENT, measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener(MAP_SPLIT_EVENT, measure);
    };
  }, [scenes]);

  // progress fill + read ticks + read percentage, driven per frame: a React
  // className update (e.g. the tick turning active) wipes imperative classes,
  // so re-apply every frame instead of listening to scroll events only. Two
  // renders of the same track exist: the horizontal one inside the sticky top
  // bar (small screens) and the vertical rail in the story gutter (2026-09-26
  // user redesign; ≥1024px). Both are driven from the same ticks/progress.
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const f = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (fillRef.current) fillRef.current.style.width = `${(f * 100).toFixed(2)}%`;
      if (railFillRef.current) railFillRef.current.style.height = `${(f * 100).toFixed(2)}%`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(f * 100)}%`;
      // v12 (2026-09-28 user request): the back-to-top button lights up when
      // the page is (essentially) fully scrolled — the finale moment.
      topBtnRef.current?.classList.toggle("lit", f >= 0.98);
      const pct = f * 100;
      for (const container of [trackRef.current, railRef.current]) {
        if (!container) continue;
        // .tnav-mark spans are markings, not day buttons — skip them, or the
        // loop would slap a `read` class on each and re-run the (deleted)
        // tint rules. querySelectorAll keeps the walk off the container's
        // own non-tick children.
        for (const el of Array.from(container.querySelectorAll<HTMLElement>(".tnav-tick"))) {
          el.classList.toggle("read", parseFloat(el.dataset.left ?? "0") <= pct);
        }
      }
      // v9 (2026-09-28, user pick plan A): the rail's x-alignment is MEASURED
      // per frame from the real .story-pane instead of the old hand-computed
      // CSS constants (which silently broke once the pane cap grew to 627px
      // and the pane fills its column below ~1161px). Rail centre = pane
      // right - 104 (gutter pad) + capsule overhang - 21 (half dot axis).
      if (railBoxRef.current && window.innerWidth >= 1024) {
        const pane = document.querySelector<HTMLElement>(".story-pane");
        if (pane) {
          const overhang = window.innerWidth >= 1280 ? 74 : 56;
          const centreX =
            pane.getBoundingClientRect().right - 104 + overhang - 21;
          const viewport =
            document.documentElement.clientWidth || window.innerWidth;
          railBoxRef.current.style.right = `${(viewport - centreX).toFixed(1)}px`;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Escape closes the drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // v10 (2026-09-28 user request): the rail-foot back-to-top button. Same
  // reduced-motion-aware easing as the site header's control.
  const scrollToTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const jumpToDay = (no: number) => {
    const el = document.querySelector(`[data-scene-id="d${no}-0"]`);
    const target =
      el ? el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.475 + 4 : 0;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    setOpen(false);
  };

  /* Mobile slider scrub (2026-10-24). The bar is no longer a row of invisible
     day buttons — the user asked for "一个普通的可拖动进度条…拖动的时候端点
     上可以浮现出一个方框，标示拖到的是哪个章节".
     The scrub fraction is expressed in the SCROLL domain (same axis the bar's
     fill is drawn in), so dragging to f means "scroll so that the scroll
     position is f of the way through the document". `behavior: "instant"` is
     mandatory: a smooth scroll per pointermove would restart the animation
     every frame and the page would never catch up with the finger. */
  const scrubTo = useCallback((fraction: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    window.scrollTo({ top: fraction * max, behavior: "instant" });
  }, []);

  const activeNo = useMemo(() => {    const m = activeSceneId.match(/^d(\d+)-/);
    return m ? +m[1] : -1;
  }, [activeSceneId]);

  // day info for ticks + drawer: heading, first place, km
  const dayInfo = useMemo(() => {
    const m = new Map<number, { heading: string; place: string }>();
    for (const s of scenes) {
      const no = s.dayNo ?? -1;
      if (no < 0 || !m.has(no)) m.set(no, { heading: s.dayTitle ?? "", place: s.title ?? "" });
      if (!m.get(no)!.heading && s.dayTitle) m.get(no)!.heading = s.dayTitle;
    }
    return m;
  }, [scenes]);

  const scrubBoxRef = useRef<HTMLDivElement>(null);
  const scrubBoxTextRef = useRef<HTMLSpanElement>(null);

  /** "Day 3 · Heading" — built from the same dayInfo the drawer uses, so the
   *  scrub box and the day index can never disagree. */
  const scrubTextFor = useCallback(
    (no: number) => {
      const info = dayInfo.get(no);
      return `Day ${no} · ${info?.heading || info?.place || trip.days[no]?.label || ""}`;
    },
    [dayInfo, trip.days]
  );

  /** Write the playhead + label straight to the DOM. Deliberately NOT state:
   *  the frame loop owns .read/.active on this subtree and rewrites them every
   *  frame, so a re-render per pointermove would fight it. */
  const paintScrub = useCallback(
    (fraction: number) => {
      const box = scrubBoxRef.current;
      const mark = chapterAtFraction(ticks, fraction);
      if (!box || !mark) return;
      if (scrubBoxTextRef.current) scrubBoxTextRef.current.textContent = scrubTextFor(mark.no);
      const track = trackRef.current;
      if (track) {
        const w = track.getBoundingClientRect().width;
        // Clamp the box's own centre so it never spills past the rounded ends
        // of a 390px-wide bar. The box is anchored to .tnav, whose horizontal
        // padding is 0 and whose left edge is the track's left edge, so the
        // track's width is the right ruler for both.
        const inset = Math.min(44, w / 2);
        box.style.left = `${Math.min(w - inset, Math.max(inset, fraction * w)).toFixed(1)}px`;
      }
      box.classList.add("is-on");
    },
    [ticks, scrubTextFor]
  );

  const scrub = useScrubTrack({
    onScrub: (f) => {
      scrubTo(f);
      paintScrub(f);
    },
    onRelease: (f) => {
      scrubTo(f);
      scrubBoxRef.current?.classList.remove("is-on");
    },
  });

  const drawerRows = useMemo(
    () =>
      trip.days
        .map((d, no) => ({ d, no }))
        .filter(({ no }) => dayInfo.has(no)),
    [trip.days, dayInfo]
  );

  const renderTicks = (vertical: boolean) =>
    ticks.map((t) => {
      const info = dayInfo.get(t.no);
      const label = `Day ${t.no} · ${info?.heading || info?.place || trip.days[t.no]?.label || ""}`;
      return (
        <button
          key={t.no}
          className={`tnav-tick${t.no === activeNo ? " active" : ""}${
            !vertical ? (t.left > 88 ? " edge-r" : t.left < 12 ? " edge-l" : "") : ""
          }`}
          style={vertical ? { top: `${t.left}%` } : { left: `${t.left}%` }}
          data-left={t.left}
          onClick={() => jumpToDay(t.no)}
          aria-label={label}
        >
          <span className="tnav-tip">{label}</span>
        </button>
      );
    });

  return (
    <>
      <div className="tnav" role="navigation" aria-label="Trip progress">
        <div className="tnav-track" ref={trackRef}>
          {/* Graduations are DESKTOP-ONLY since 2026-10-24. The mobile bar is
              now a plain slider — "进度条还是不要刻度了，做成一个普通的可拖动
              进度条就可以" — so the .tnav-mark spans are suppressed by the
              same media query that kills the tick dots (see the mobile block
              at the bottom of this <style>). They stay in the DOM so the
              desktop rail, which shares this component, keeps its ruler. */}
          {ticks.map((t) => (
            <span
              key={t.no}
              className="tnav-mark"
              /* round() snaps the percentage to a WHOLE CSS PIXEL before the
                 rule is drawn. Without it the edge lands on a fractional
                 device pixel (measured 53.59 / 109.47 / 150.84 at 2x) and the
                 ruler shows marks of differing width — see the .tnav-mark
                 rule for the full measurement. */
              style={{
                left: `round(${Math.min(99.9, Math.max(0, t.left))}%, 1px)`,
              }}
              aria-hidden="true"
            />
          ))}
          <div className="tnav-fill" ref={fillRef} />
          {/* Desktop rail keeps its clickable day dots; the mobile bar drops
              them entirely (see the media query) and scrubs instead. */}
          <div className="tnav-scrub" {...scrub.surfaceProps} />
          {renderTicks(false)}
        </div>
        {/* The chapter box lives OUTSIDE .tnav-track on purpose: the track has
            `overflow: hidden` (it is the capsule that clips the mercury), so a
            box positioned above its top edge was clipped away — it measured
            correctly, reported opacity 1, and was invisible (2026-10-24).
            Anchored to the bar instead, and offset to line up with the tube:
            `--tnav-tube-top` is the bar's padding-top + the tube's half
            height, so the box's bottom edge clears the tube by 8px. */}
        <div className="tnav-scrub-box" ref={scrubBoxRef} aria-hidden="true">
          <span className="tnav-scrub-text" ref={scrubBoxTextRef} />
        </div>
        {/* v16 (2026-10-24 user request): the ☰ is back INSIDE the bar, to the
            right of the tube — "目录按钮就放在水银柱右边挺好的" — sized to the
            tube so the whole band reads as one strip. */}
        <button
          className={`tnav-toc-btn${open ? " is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Open day index"
          aria-expanded={open}
        >
          ☰
        </button>
      </div>

      {/* Vertical progress rail in the story gutter (≥1024px, 2026-09-26
          user redesign): head stacks percentage → track. The 目录 button was
          removed (user 2026-09-26: "还是移除吧") — the day drawer keeps its
          ☰ entry in the top bar (<1024px) and days stay clickable via the
          Day capsules. Same ticks/fill as the horizontal bar, which stays
          below the breakpoint for narrow viewports. */}
      <div ref={railBoxRef} className="tnav-rail" role="navigation" aria-label="Trip progress (vertical)">
        <span className="tnav-rail-pct" ref={pctRef}>
          0%
        </span>
        <div className="tnav-rail-track" ref={railRef}>
          <div className="tnav-fill tnav-rail-fill" ref={railFillRef} />
          {renderTicks(true)}
        </div>
        {/* v10 (2026-09-28 user request): back-to-top at the rail's foot.
            The track gives up its foot (flex sizing below) so the button
            fits without the rail ever reaching the viewport edge. */}
        <button
          type="button"
          className="tnav-top-btn"
          ref={topBtnRef}
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 14 6-6 6 6" />
          </svg>
        </button>
      </div>

      {/* backdrop + drawer stay mounted so they can animate */}
      <div
        className={`tnav-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`tnav-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-label="Day index"
        aria-hidden={!open}
      >
        <div className="tnav-drawer-head">
          <span>{trip.title}</span>
          <button className="tnav-close" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className="tnav-list">
          {drawerRows.map(({ d, no }) => {
            const info = dayInfo.get(no);
            return (
              <button
                key={no}
                className={`tnav-row${no === activeNo ? " active" : ""}`}
                style={{ "--row-i": no } as CSSProperties}
                onClick={() => jumpToDay(no)}
                tabIndex={open ? 0 : -1}
              >
                <span className="tnav-row-day">Day {no}</span>
                <span className="tnav-row-place">{info?.heading || info?.place || d.label}</span>
                <span className="tnav-row-km">{(d.distanceM / 1000).toFixed(0)} km</span>
              </button>
            );
          })}
        </div>
      </aside>

      <style jsx global>{`
        .tnav {
          position: sticky;
          /* --tl-top comes from .travel-layout (TravelLog): 4.5rem in landing
             mode (below the site header pill), 0 in immersive mode. */
          top: var(--tl-top, 0px);
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0 8px;
          /* v14 (2026-10-24): the translucent fade is gone. It let the story
             text bleed through the control, so the bar now owns a solid band. */
          background: var(--tl-paper);
          pointer-events: none;
        }
        /* ---- mercury thermometer track (v16, 2026-10-24 user request) ----
           The user asked for the FORM, not for glass: "不需要玻璃和3d效果，
           我只是在描述形态逻辑". So: one long rounded capsule, and inside it
           GRADUATIONS THAT STAY VISIBLE FOR THE WHOLE TUBE — they are grey
           markings today and stay grey after the mercury passes, so a reader
           can always see "there is a section here" (user 2026-10-24: "刻度可以
           在上方一直为灰色，这样进度条通过后刻度还在").
           Layer order, bottom to top:
             bore (element background)
             .tnav-fill    (z 2)  mercury, opaque, covers the unread bore
             .tnav-mark    (z 3)  graduations, ABOVE the mercury — always grey
             ::after       (z 4)  hairline along the bore's top
             ::before      (z 5)  soft end-shading at the round caps
           Note this is the OPPOSITE of v14/v15, where the marks sat under the
           mercury and vanished as it advanced. Marks are element children of
           the tube, never a tick's ::before: a tick is positioned, so its
           pseudo joins the BUTTON's stacking layer and no z-index on it can
           put it over the mercury. */
        .tnav-track {
          position: relative;
          flex: 1;
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--tl-ink) 9%, var(--tl-surface-2)) 0%,
            color-mix(in srgb, var(--tl-ink) 3%, var(--tl-surface)) 55%,
            color-mix(in srgb, var(--tl-ink) 8%, var(--tl-surface-2)) 100%
          );
          box-shadow:
            inset 0 1px 1.5px color-mix(in srgb, var(--tl-ink) 16%, transparent),
            inset 0 -1px 0 color-mix(in srgb, white 70%, transparent),
            0 0 0 1px color-mix(in srgb, var(--tl-ink) 8%, transparent);
          overflow: hidden;
          pointer-events: auto;
        }
        /* graduations — full-height hairlines, always grey.
           z-index 3 puts them OVER the opaque mercury, so the section markers
           survive the passage of the fill instead of being erased by it.

           THE "刻度线粗细不一" BUG (v18). Ticks are laid out at arbitrary
           fractional percentages, so their edges land on fractional DEVICE
           pixels: measured at 2x, mark edges were at 53.59 / 109.47 / 150.84
           device px. A 2px-wide rule is 4 device px at 2x, but because the
           start is fractional, how many device pixels actually get full
           coverage varies — the ruler ends up with marks that read 3px wide
           and marks that read 2px wide in the same row. Making the rule wider
           (v17 went 1px -> 2px) does not help, because it is the EDGE
           alignment that varies, not the width.
           FIX: snap the position itself to whole CSS pixels with round().
           The percentage is resolved in CSS against the track, rounded to a
           whole px, and only then offset by half the rule so the rule's centre
           lands on that pixel boundary. 1px is then exactly one CSS pixel
           (2 device px at 2x, 1 at 1x) and every graduation has the same
           weight at every DPR. */
        .tnav-mark {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          margin-left: -0.5px;
          z-index: 3;
          background: color-mix(in srgb, var(--tl-ink) 30%, transparent);
          pointer-events: none;
        }
        /* ---- Draggable slider surface (2026-10-24) --------------------
           "进度条还是不要刻度了，做成一个普通的可拖动进度条就可以。不过在拖动
           的时候，端点上可以浮现出一个方框，标示拖到的是哪个章节。"

           A transparent sheet over the whole tube. It exists so the tube has
           ONE continuous draggable region instead of 31 tiny buttons whose
           22px hit boxes overlapped each other (measured 9.4px of track per
           day on a 390px phone — elementFromPoint used to return the wrong
           neighbour). Desktop hides it: the rail keeps its clickable dots and
           its tooltips.
           touch-action: none is what makes the drag work at all on a phone —
           without it the browser claims the gesture for page scrolling and
           pointermove never fires after the first frame.
           z-index 6 sits above the tube's own layers (::before is z1, the
           mercury z2) so the gesture is caught everywhere on the bar. */
        .tnav-scrub {
          display: none;
        }
        /* The chapter box is a child of .tnav (NOT of .tnav-track, which clips
           with overflow:hidden). It is bottom-anchored off the bar's own box:
           the bar's padding-top is 10px, so the tube's top edge is 10px below
           the bar's top, i.e. bottom: calc(100% - 10px). The extra 8px
           lifts the box clear of the tube's rim. */
        .tnav-scrub-box {
          position: absolute;
          left: 0;
          bottom: calc(100% - 10px + 8px);
          transform: translateX(-50%) scale(0.92);
          transform-origin: bottom center;
          padding: 4px 9px;
          border-radius: 6px;
          background: var(--tl-surface-2);
          border: 1px solid var(--tl-line-2);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
          font-family: var(--font-ui);
          font-size: 11px;
          line-height: 1.35;
          font-weight: 600;
          letter-spacing: 0.01em;
          white-space: nowrap;
          color: var(--tl-ink);
          opacity: 0;
          pointer-events: none;
          z-index: 7;
          transition: opacity 0.14s ease, transform 0.14s ease;
        }
        /* Opacity alone would still leave the box occupying a paint slot at
           the far side of the bar on first touch; scale keeps the "pops out
           of the playhead" feel without any travel across the track. */
        .tnav-scrub-box.is-on {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }
        /* Soft shading at the two round caps, so the capsule closes cleanly
           and the first/last graduation does not sit on the rim. Kept flat —
           no highlight, no gloss ("不需要玻璃和3d效果").
           z-index 1, i.e. UNDER the mercury (z 2), NOT 5 as in v16. At 5 this
           72%-paper wash sat on top of the fill and turned the slug's left cap
           into a pale wedge — the "凸起/渐变" the user reported. Below the
           fill it still shades the empty bore, and the fill's own rounded end
           closes the capsule wherever the liquid has reached. */
        .tnav-track::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              color-mix(in srgb, var(--tl-paper) 72%, transparent) 0,
              transparent 8px
            ),
            linear-gradient(
              270deg,
              color-mix(in srgb, var(--tl-paper) 72%, transparent) 0,
              transparent 8px
            );
        }
        /* A single hairline along the bore's top — the only 3D-ish cue left,
           and it is what keeps a 10px bar from reading as a flat stripe. */
        .tnav-track::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 1px;
          z-index: 4;
          border-radius: 1px;
          background: color-mix(in srgb, white 72%, transparent);
          pointer-events: none;
        }
        /* mercury: an opaque slug, not a tinted film.
           FLAT (v17, user 2026-10-24: "液面不需要凸起效果"). The previous
           three-stop vertical gradient (22% white top / accent middle / darker
           bottom) shaded the slug across its 10px height and read as a raised
           tube — a bulge. One flat accent fill now: the "mercury" is told by
           the contrast against the bore, not by any modelling.
           The right edge keeps border-radius 5px (a half-height cap = 5px on a
           10px tube), so the head is a true semicircle and never a notch. */
        .tnav-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0%;
          z-index: 2;
          border-radius: 5px;
          background: var(--tl-accent);
          transition: width 0.1s linear;
        }
        /* Vertical progress rail (2026-09-26 user redesign): lives in the
           story gutter instead of hugging the screen edge, top-anchored below
           the sticky Day capsule. Head = percentage → 目录 tab → track. The
           horizontal top bar covers <1024px and is hidden on desktop. */
        .tnav-rail {
          display: none;
        }
        @media (min-width: 1024px) {
          .tnav {
            display: none;
          }
          .tnav-rail {
            display: flex;
            flex-direction: column;
            /* pct and track share one vertical axis */
            align-items: center;
            position: fixed;
            /* below the sticky Day capsule (capsule bottom ≈ --tl-top + 80px)
               with ~30px of air (user 2026-09-26: pct was too close) */
            top: calc(var(--tl-top, 0px) + 110px);
            /* v4 alignment (2026-09-26): the rail's axis must point at the
               ACTIVE Day capsule's right arc centre = capsule right edge
               - 21px, mirroring the active spine on the capsule's left end
               (which sits at dot axis = capsule left + 21). v9 (2026-09-28,
               plan A): this CSS formula is only the no-JS fallback now — the
               rAF loop measures the real .story-pane every frame and writes
               an inline right offset, exact at every viewport (the old
               constants broke when the pane cap grew to 627px and the pane
               fills its column below ~1161px). */
            right: calc(27% - 205.5px);
            /* pin the container to the track's 4px width: a wider shrink-to-fit
               box (the pct text) would shift the centred track axis left of the
               formula by half the overflow. The pct string overhangs the 4px
               box symmetrically via align-items:center (nowrap below). */
            width: 4px;
            /* stretch toward the viewport bottom (user 2026-09-26); since
               v10 the ~40px foot hosts the back-to-top button; ≥320px floor
               for short windows */
            height: max(320px, calc(100vh - var(--tl-top, 0px) - 150px));
            z-index: 30;
            pointer-events: none;
          }
        }
        /* ≥1280 (v4): fallback formula — the rAF loop (plan A, 2026-09-28)
           overrides this inline every frame. Same specificity as the ≥1024
           rule, so this block must come AFTER it. */
        @media (min-width: 1280px) {
          .tnav-rail {
            right: calc(27% - 223.5px);
          }
        }
        .tnav-rail-pct {
          margin-bottom: 13px;
          white-space: nowrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          color: var(--tl-muted);
          font-variant-numeric: tabular-nums;
        }
        .tnav-rail-track {
          position: relative;
          width: 4px;
          /* v10: flex sizing instead of height:100% — the foot back-to-top
             button (28px + 12px gap) takes its share and the track shortens
             from the bottom, so the rail never reaches the viewport edge
             (user 2026-09-26 wanted a foot, v10 fills it with the button). */
          flex: 1 1 0;
          min-height: 0;
          border-radius: 2px;
          background: var(--tl-line-2);
          pointer-events: auto;
        }
        /* v10 (2026-09-28 user request): back-to-top at the rail's foot.
           The rail box is a 4px-wide column with align-items:center, so the
           28px button overhangs symmetrically around the axis (same as the
           pct head). pointer-events must be re-enabled (the rail box is
           none). */
        .tnav-top-btn {
          pointer-events: auto;
          margin-top: 12px;
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--tl-line-2);
          border-radius: 50%;
          background: var(--tl-surface-2);
          color: var(--tl-muted);
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease, border-color 0.2s ease,
            background 0.2s ease, transform 0.25s ease;
        }
        .tnav-top-btn:hover {
          color: var(--tl-accent-strong);
          border-color: var(--tl-accent);
          background: var(--tl-accent-soft);
          transform: translateY(-2px);
        }
        /* v12 (2026-09-28 user request): lit at the finale — page essentially
           fully scrolled (TravelNav's rAF toggles .lit at >=98%). Same accent
           family as the hover, calmer: the blue reads as "you reached the
           end, ride the arrow back up". */
        .tnav-top-btn.lit {
          color: var(--tl-accent-strong);
          border-color: var(--tl-accent);
          background: var(--tl-accent-soft);
          box-shadow: 0 0 0 3px rgba(27, 167, 201, 0.16);
        }
        .tnav-top-btn:focus-visible {
          outline: 2px solid rgba(27, 167, 201, 0.6);
          outline-offset: 2px;
        }
        /* Higher specificity than the base .tnav-fill below (which comes
           later in the sheet and would win the same-weight cascade, pinning
           width to 0% — the read line never turned blue, user 2026-09-26).
           Vertical fill stretches horizontally (left+right) and grows down. */
        .tnav-rail-track .tnav-rail-fill {
          top: 0;
          left: 0;
          right: 0;
          width: auto;
          height: 0%;
          /* z-index:auto, NOT the base rule's 2 (2026-10-24: "桌面端的进度条在
             ptes 界面的效果是不对的，在激活的时候都是实心无边缘的").
             The base .tnav-fill raises itself to z2 so the mercury covers the
             bore in the MOBILE bar — but the desktop rail reuses the class, so
             the fill was also painting OVER the tick dots. A 12px dot centred
             on a 4px rail then has its middle 4px covered by the blue line:
             the dot and the track fuse into one solid blue slug and the 2px
             white ring survives only as two slivers, so read/active dots read
             as "solid, no edge" (user screenshot).
             anitabi's .pjr-rail-fill never set z-index, which is why its dots
             looked right. Both ticks are position:absolute with z-index:auto
             and come AFTER the fill in DOM order, so auto puts them on top. */
          z-index: auto;
          transition: height 0.1s linear;
        }
        /* Rail ticks ride ON the rail: centred horizontally, positioned by
           the inline top; tooltip pops out to the LEFT, vertically
           centred — no top/bottom edge cases since the rail is centred. */
        .tnav-rail-track .tnav-tick {
          left: 50%;
        }
        .tnav-rail-track .tnav-tip {
          top: 50%;
          left: auto;
          right: calc(100% + 12px);
          transform: translateY(-50%) translateX(4px);
        }
        .tnav-rail-track .tnav-tick:hover .tnav-tip {
          transform: translateY(-50%) translateX(0);
        }
        .tnav-tick {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid var(--tl-surface-2);
          background: var(--tl-dot-off);
          cursor: pointer;
          padding: 0;
          transition: background 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.2s ease;
        }
        .tnav-tick:hover {
          transform: translate(-50%, -50%) scale(1.45);
          background: var(--tl-accent);
          box-shadow: 0 0 0 4px rgba(27, 167, 201, 0.18);
        }
        .tnav-tick:active {
          transform: translate(-50%, -50%) scale(1.15);
        }
        .tnav-tick.read {
          background: var(--tl-accent); /* already read: blue, but no halo */
        }
        .tnav-tick.active {
          background: var(--tl-accent);
          box-shadow: 0 0 0 3px rgba(27, 167, 201, 0.22);
        }
        .tnav-tip {
          display: block;
          position: absolute;
          /* below the bar: the bar is sticky at the very top of the viewport,
             so an above-anchored tooltip renders off-screen */
          top: 18px;
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          white-space: nowrap;
          font-size: 12px;
          color: var(--tl-ink-2);
          background: var(--tl-surface-2);
          border: 1px solid var(--tl-line-2);
          border-radius: 6px;
          padding: 3px 8px;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
        }
        .tnav-tick:hover .tnav-tip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
          transition-delay: 0.12s;
        }
        .tnav-tick.edge-l .tnav-tip {
          left: 0;
          transform: translateY(-4px);
        }
        .tnav-tick.edge-r .tnav-tip {
          left: auto;
          right: 0;
          transform: translateY(-4px);
        }
        .tnav-tick.edge-l:hover .tnav-tip,
        .tnav-tick.edge-r:hover .tnav-tip {
          transform: translateY(0);
        }
        /* Mobile ticks: 31 round dots on a ~320px track overlap each other
           (9.4px of track per day against a 12px diameter — measured on a
           390px phone). 2026-10-24 user pick: drop the dots, one 1px hairline
           per day, the progress fill stays the only bright object. The 22px
           hit box is unchanged, so tapping a day still works; the hairline is
           a ::before inside the same button.
           These rules MUST live here rather than in globals.css: this
           styled-jsx block is emitted after the global sheet, so the base
           .tnav-tick declarations above would win a same-weight cascade in
           the other direction. Declared in globals.css too, for the
           pilgrimage page's .pjr-tick, which it does own. */
        @media (max-width: 1023.9px) {
          /* ---- slider mode (2026-10-24) ------------------------------
             Three things change at once, and they only make sense together:
             1. the graduations disappear ("不要刻度了");
             2. the per-day dots/buttons stop painting AND stop being hit
                targets (the scrub sheet below owns the whole tube);
             3. one transparent sheet becomes the draggable surface.
             The dots are hidden with display:none on the BUTTONS rather
             than the sheet being layered above them: a pointer capture on a
             sheet that covers buttons would still let the buttons win hover
             styles, and their z-index 6 would eat the gesture. */
          .tnav-mark {
            display: none;
          }
          .tnav-tick {
            display: none;
          }
          .tnav-scrub {
            display: block;
            position: absolute;
            inset: -9px 0;
            z-index: 6;
            touch-action: none;
            /* The sheet is the control; a grab cursor is wrong on touch and
               misleading on a narrow desktop window, so keep it default. */
            -webkit-tap-highlight-color: transparent;
          }
        }
        @media (min-width: 1024px) {
          .tnav-scrub-box {
            display: none;
          }
        }
        /* ---- ☰ day index: right end of the bar (v16, 2026-10-24) ----
           The user first wanted it out of the bar, then changed their mind
           after seeing it: "目录按钮就放在水银柱右边挺好的，不过高度或大小需要
           调整一下，让这个底栏看起来大小整体比较协调". So it is a flex child
           again (right of the tube), sized in the same range as the tube
           rather than towering over it: 30x30 against a 10px tube with 10px
           band padding gives a 50px band — the button's half-height above
           and below the tube is equal, so the band reads balanced.
           Bare glyph, no border or fill: a bordered chip competed with the
           capsule next to it (that was the v15 look, and the reason it read
           as two unrelated controls). */
        .tnav-toc-btn {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--tl-ink-3);
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
          pointer-events: auto;
          transition: color 0.2s ease, background 0.2s ease;
        }
        .tnav-toc-btn:hover,
        .tnav-toc-btn:active {
          color: var(--tl-accent);
          background: color-mix(in srgb, var(--tl-accent) 12%, transparent);
        }
        .tnav-toc-btn.is-open {
          color: var(--tl-accent-strong);
          background: var(--tl-accent-soft);
        }
        /* v13 (2026-09-28 user request): on narrow viewports the top sticky
           bar overlaid the map's upper edge and fought the basemap slider
           ("总进度条和地图的干涉效果很奇怪"). Pin the whole bar to the
           VIEWPORT BOTTOM instead. fixed takes it out of flow (the ~28px it
           occupied at the story top is reclaimed — harmless), so re-declare
           every positioning property the base rule set. v14 (2026-10-24):
           the upward fade is replaced by a solid sheet with a hairline on top
           — the text underneath used to show through the control. Desktop
           keeps display:none (base ≥1024 rule). */
        @media (max-width: 1023.9px) {
          .tnav {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
            background: var(--tl-paper);
            border-top: 1px solid var(--tl-divider);
            box-shadow: 0 -6px 18px color-mix(in srgb, var(--tl-ink) 7%, transparent);
          }
          .tnav-toc-btn:focus-visible {
            outline: 2px solid color-mix(in srgb, var(--tl-accent) 60%, transparent);
            outline-offset: 2px;
          }
        }
        .tnav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: var(--tl-scrim);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .tnav-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }
        .tnav-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 320px;
          max-width: 88vw;
          background: var(--tl-surface);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.14);
          z-index: 90;
          display: flex;
          flex-direction: column;
          transform: translateX(106%);
          visibility: hidden;
          transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.34s;
        }
        .tnav-drawer.open {
          transform: translateX(0);
          visibility: visible;
        }
        .tnav-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          font-weight: 700;
          color: var(--tl-ink);
          border-bottom: 1px solid var(--tl-divider);
        }
        .tnav-close {
          border: none;
          background: none;
          font-size: 22px;
          color: var(--tl-muted);
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s ease, transform 0.25s ease;
        }
        .tnav-close:hover {
          color: var(--tl-ink);
          transform: rotate(90deg);
        }
        .tnav-list {
          overflow-y: auto;
          padding: 8px 0 24px;
        }
        .tnav-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          width: 100%;
          padding: 10px 18px;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          color: var(--tl-ink-2);
          font-size: 14px;
          position: relative;
          opacity: 0;
          transform: translateX(26px);
          transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.15s ease, color 0.15s ease, padding-left 0.18s ease;
          transition-delay: 0ms;
        }
        .tnav-drawer.open .tnav-row {
          opacity: 1;
          transform: translateX(0);
          /* staggered entrance: 26ms per day, capped at 12 rows */
          transition-delay: calc(min(var(--row-i), 12) * 26ms + 70ms),
            calc(min(var(--row-i), 12) * 26ms + 70ms), 0ms, 0ms, 0ms;
        }
        .tnav-row::before {
          content: "";
          position: absolute;
          left: 0;
          top: 15%;
          bottom: 15%;
          width: 3px;
          border-radius: 2px;
          background: var(--tl-accent);
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }
        .tnav-row:hover {
          background: var(--tl-surface-3);
          padding-left: 24px;
        }
        .tnav-row:hover::before {
          transform: scaleY(1);
        }
        .tnav-row.active {
          background: var(--tl-accent-soft);
          color: var(--tl-accent-strong);
        }
        .tnav-row.active::before {
          transform: scaleY(1);
        }
        .tnav-row-day {
          font-weight: 700;
          min-width: 52px;
        }
        .tnav-row-place {
          flex: 1;
        }
        .tnav-row-km {
          color: var(--tl-faint);
          font-size: 12.5px;
        }
      `}</style>
    </>
  );
}

export default memo(TravelNav);
