"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
export default function TravelNav({
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
      const max = Math.max(1, docH - window.innerHeight);
      setTicks(
        [...byDay.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([no, y]) => ({
            no,
            left: Math.min(100, Math.max(0, ((y - window.innerHeight * 0.475) / max) * 100)),
          }))
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
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
        for (const el of Array.from(container.children)) {
          const he = el as HTMLElement;
          he.classList.toggle("read", parseFloat(he.dataset.left ?? "0") <= pct);
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

  const activeNo = useMemo(() => {
    const m = activeSceneId.match(/^d(\d+)-/);
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
          <div className="tnav-fill" ref={fillRef} />
          {renderTicks(false)}
        </div>
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
          background: linear-gradient(to bottom, rgba(250, 249, 246, 0.96) 65%, rgba(250, 249, 246, 0));
          pointer-events: none;
        }
        .tnav-track {
          position: relative;
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: #e3e0da;
          pointer-events: auto;
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
          color: #6b7280;
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
          background: #e3e0da;
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
          border: 1px solid #e3e0da;
          border-radius: 50%;
          background: #f8f6f2;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease, border-color 0.2s ease,
            background 0.2s ease, transform 0.25s ease;
        }
        .tnav-top-btn:hover {
          color: #0e7d9c;
          border-color: #1ba7c9;
          background: #e8f5f9;
          transform: translateY(-2px);
        }
        /* v12 (2026-09-28 user request): lit at the finale — page essentially
           fully scrolled (TravelNav's rAF toggles .lit at >=98%). Same accent
           family as the hover, calmer: the blue reads as "you reached the
           end, ride the arrow back up". */
        .tnav-top-btn.lit {
          color: #0e7d9c;
          border-color: #1ba7c9;
          background: #e8f5f9;
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
        .tnav-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0%;
          border-radius: 2px;
          background: #1ba7c9;
          opacity: 0.55;
          transition: width 0.1s linear;
        }
        .tnav-tick {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid #f8f6f2;
          background: #b9b2a7;
          cursor: pointer;
          padding: 0;
          transition: background 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.2s ease;
        }
        .tnav-tick:hover {
          transform: translate(-50%, -50%) scale(1.45);
          background: #1ba7c9;
          box-shadow: 0 0 0 4px rgba(27, 167, 201, 0.18);
        }
        .tnav-tick:active {
          transform: translate(-50%, -50%) scale(1.15);
        }
        .tnav-tick.read {
          background: #1ba7c9; /* already read: blue, but no halo */
        }
        .tnav-tick.active {
          background: #1ba7c9;
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
          color: #374151;
          background: #f8f6f2;
          border: 1px solid #e3e0da;
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
        .tnav-toc-btn {
          pointer-events: auto;
          border: 1px solid #e3e0da;
          background: #f8f6f2;
          color: #4b5563;
          border-radius: 6px;
          width: 30px;
          height: 26px;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s ease, border-color 0.2s ease, transform 0.25s ease,
            background 0.2s ease;
        }
        /* v13 (2026-09-28 user request): on narrow viewports the top sticky
           bar overlaid the map's upper edge and fought the basemap slider
           ("总进度条和地图的干涉效果很奇怪"). Pin the whole bar to the
           VIEWPORT BOTTOM instead. fixed takes it out of flow (the ~28px it
           occupied at the story top is reclaimed — harmless), so re-declare
           every positioning property the base rule set, and flip the fade
           gradient upward. Desktop keeps display:none (base ≥1024 rule). */
        @media (max-width: 1023.9px) {
          .tnav {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
            background: linear-gradient(
              to top,
              rgba(250, 249, 246, 0.97) 62%,
              rgba(250, 249, 246, 0)
            );
          }
        }
        .tnav-toc-btn:hover {
          color: #1ba7c9;
          border-color: #1ba7c9;
          transform: scale(1.08);
        }
        .tnav-toc-btn.is-open {
          color: #0e7d9c;
          border-color: #1ba7c9;
          background: #e8f5f9;
        }
        .tnav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(31, 41, 55, 0.28);
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
          background: #fdfcfa;
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
          color: #1f2937;
          border-bottom: 1px solid #eee9e2;
        }
        .tnav-close {
          border: none;
          background: none;
          font-size: 22px;
          color: #6b7280;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s ease, transform 0.25s ease;
        }
        .tnav-close:hover {
          color: #1f2937;
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
          color: #374151;
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
          background: #1ba7c9;
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }
        .tnav-row:hover {
          background: #f3f0ea;
          padding-left: 24px;
        }
        .tnav-row:hover::before {
          transform: scaleY(1);
        }
        .tnav-row.active {
          background: #e8f5f9;
          color: #0e7d9c;
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
          color: #9ca3af;
          font-size: 12.5px;
        }
      `}</style>
    </>
  );
}
