"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { PilgrimageData } from "@/lib/travel/pilgrimage";
import { CHAPTER_END, CHAPTER_START } from "@/lib/travel/pilgrimage";
import { MAP_SPLIT_EVENT } from "@/lib/travel/map-split";
import { chapterAtFraction } from "@/lib/travel/scrub-chapters";
import { useScrubTrack } from "@/lib/travel/use-scrub-track";

/**
 * Pilgrimage story column.
 *
 * The reading model is intentionally simpler than the trip log's: there is no
 * narrative clock and no camera scrubbing. Each stop owns one block; as a block
 * crosses the reading band it becomes "active", which is what the map uses to
 * light up its dot, slide the traveller cursor and draw the bright line. Leaving
 * the band closes the popup again — that is the auto-open behaviour the reader
 * asked for, and gating on a single active stop (rather than on "near"
 * proximity) is what keeps two neighbouring stops from fighting over the popup.
 */

interface Props {
  data: PilgrimageData;
  onActiveStop: (id: string | null, progress: number) => void;
  /** set by the parent when the reader clicks a dot on the map */
  focusStopId: string | null;
  /** bumped by the parent to force a scroll-to on the same stop */
  focusNonce: number;
  /** Page language — the only thing it changes here is the scroll cue, which
   *  is page copy rather than map UI (a zh mirror must not show an English
   *  instruction, and an en page must not show a Chinese one). */
  lang?: "en" | "zh";
}

export default function PilgrimageStory({
  data,
  onActiveStop,
  focusStopId,
  focusNonce,
  lang = "en",
}: Props) {
  const { stops, overview, outro, interludes = [] } = data;
  /** The scrolling column. Every lookup goes through this element rather than
   *  through cached node references — see the observation effect below. */
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** Kept in a ref so the observer effect never needs to re-subscribe; written
   *  from an effect because refs must not be mutated during render. */
  const onActiveRef = useRef(onActiveStop);
  useEffect(() => {
    onActiveRef.current = onActiveStop;
  }, [onActiveStop]);

  /** The observer's scoring function, published so a programmatic scroll can
   *  force a re-run once it lands. IntersectionObserver does not call back when
   *  no ratio crosses a threshold, which is exactly the case after a jump that
   *  parks a section at the band's edge. */
  const recomputeRef = useRef<(() => void) | null>(null);

  const stopIndex = useMemo(
    () => new Map(stops.map((s, i) => [s.id, i])),
    [stops],
  );

  /** Interludes keyed by the stop they precede. */
  const beforeStop = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const it of interludes) {
      const list = m.get(it.before) ?? [];
      list.push(it.text);
      m.set(it.before, list);
    }
    return m;
  }, [interludes]);

  /* --------------------------------------------------------- observation */

  /**
   * The rectangle the reading band lives in: the part of the viewport that
   * shows STORY, i.e. neither covered by the sticky map nor scrolled past.
   *
   * Measuring against the viewport alone is wrong on a phone: `.pj-map-col` is
   * `position: sticky` at 58vh, so it permanently owns y = 0…490 and the story
   * runs below it. A viewport-relative band (0.35 × 844 = 295) therefore sits
   * INSIDE THE MAP — no section ever overlaps it, so the scorer fell back to
   * "nearest centre" and reported the section straddling y=295, which is the
   * one ABOVE the section the reader just asked for. On desktop the map column
   * is the whole left half and the story column starts at y=0, so the
   * viewport-relative definition happens to be correct there.
   *
   * Measured (390 × 844): map column 0–490, story column starts at y=490 and,
   * once scrolled into, has top ≈ −3510 — so the column's own rect tells us
   * nothing about where the reader can SEE it. What survives both cases is the
   * intersection of the viewport with the story column, minus the map: on a
   * phone that is 490…844, on desktop it is empty (the map fills the viewport
   * height and the story sits beside it, not below), which is the signal to
   * fall back to the viewport band.
   *
   * Read live, on every call: the column moves when the layout settles, when
   * the phone's address bar collapses, and when the sticky map re-frames.
   */
  const readPanel = () => {
    const vh = window.innerHeight;
    const col = containerRef.current;
    const r = col ? col.getBoundingClientRect() : null;
    if (!r || r.height < 1) return { top: 0, bottom: vh, height: vh };

    // Visible span of the story column itself (clamped to the viewport). Once
    // the reader has scrolled into it this is the whole viewport; before that
    // it is the part below the map.
    const colVisibleTop = Math.max(0, r.top);
    const colVisibleBottom = Math.min(vh, r.bottom);

    // The sticky map's bottom edge. It is 0 when the map is a full-height
    // DESKTOP column that the story sits BESIDE rather than under — in which
    // case subtracting it would leave an empty band and we keep the viewport.
    const mapCol = containerRef.current?.closest(".pj-page")?.querySelector(".pj-map-col");
    const mr = mapCol ? mapCol.getBoundingClientRect() : null;
    const mapBottom = mr ? Math.max(0, Math.min(vh, mr.bottom)) : 0;
    // Only treat the map as an overlay when it actually covers the top of the
    // viewport AND leaves usable room below (the mobile sticky band). A
    // full-height column (desktop) leaves none, so it is not an overlay.
    const covered = mapBottom > 0 && mapBottom < vh - 120 ? mapBottom : 0;

    const top = Math.max(colVisibleTop, covered);
    const bottom = colVisibleBottom;
    if (bottom - top < 120) return { top: 0, bottom: vh, height: vh };
    return { top, bottom, height: Math.max(1, bottom - top) };
  };

  useEffect(() => {
    // Query the DOM rather than trusting cached refs. `ref={register(id)}`
    // hands React a NEW callback every render (register is memoised, but
    // register(id) is a fresh function), so React detaches the ref — calling
    // it with null — before re-attaching. Anything that captured the element
    // list once (an earlier version of this effect did) can end up observing
    // nodes that React has since swapped out, and then no callback ever
    // fires. Reading the live tree sidesteps the whole lifecycle.
    const nodes = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>("[data-pj-stop]") ?? [],
    ).filter((el) => el.dataset.pjStop);
    if (!nodes.length) return;

    const setActive = (active: HTMLElement | null) => {
      for (const el of nodes) {
        el.dataset.pjActive = el === active ? "1" : "0";
      }
    };

    // The reading band: the middle sliver of the viewport. IntersectionObserver
    // with rootMargin pins that band without any scroll maths on our side, and
    // this is the ONLY place the active stop is decided — so the map's dot and
    // the popup can never disagree with what the reader is looking at.
    //
    // The scoring run is factored out so it can be invoked on demand as well as
    // from the observer. That matters for the click-to-scroll flow: an
    // IntersectionObserver only calls back when a ratio CROSSES a threshold, so
    // a programmatic scroll that lands with the same sections still in the band
    // never fires — and the previous stop stays marked active even though the
    // geometry has completely changed. (Observed: the right section parked at
    // the band's top edge, the previous one still flagged active; nudging the
    // page 2 px fixed it instantly.) A scroll-to-stop therefore recomputes
    // explicitly instead of waiting for a callback that will not come.
    const recompute = () => {
      // Recompute from the live geometry on every callback instead of
      // reasoning about which entries changed. During a fast scroll several
      // sections cross the band at once, and picking the winner from the
      // actual positions is both simpler and flicker-free.
      //
      // Score = how much of the section actually sits inside the band, and
      // only THEN how centred it is. Ranking by centre distance alone has a
      // dead zone at the boundary: sections are 740 px tall, so a neighbour
      // whose bottom edge touches the band's top (centre far above us) can
      // still be "closer to the centre" than the section we deliberately
      // scrolled into view — which made a click on a dot report the PREVIOUS
      // stop as active. Overlap is the honest measure of "what am I reading".
      //
      // The band is measured against the STORY column's own panel, not the
      // viewport. On a phone the map is a sticky 58vh band that still occupies
      // flow space (`.pj-map-col` is `position: sticky`, not `fixed`), so the
      // story column starts at y≈490; adding the map height into the band put
      // it 490 px too low, i.e. wholly inside the map. On desktop the panel
      // starts at y=0 and the two definitions coincide, which is why this only
      // ever broke on mobile.
      const panel = readPanel();
      const bandTop = panel.top + panel.height * 0.35;
      const bandBottom = panel.top + panel.height * 0.65;
      let best: { el: HTMLElement; score: number; d: number } | null = null;
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (r.bottom < panel.top || r.top > panel.bottom) continue;
        const overlap = Math.min(r.bottom, bandBottom) - Math.max(r.top, bandTop);
        const centre = (bandTop + bandBottom) / 2;
        const d = Math.abs(r.top + r.height / 2 - centre);
        if (overlap <= 0) continue;
        if (!best || overlap > best.score || (overlap === best.score && d < best.d)) {
          best = { el, score: overlap, d };
        }
      }
      // Nothing physically inside the band (between two sections): fall back
      // to the section nearest the band's centre, so the map still tracks
      // something instead of going blank at a gap.
      if (!best) {
        const centre = (bandTop + bandBottom) / 2;
        for (const el of nodes) {
          const r = el.getBoundingClientRect();
          if (r.bottom < panel.top || r.top > panel.bottom) continue;
          const d = Math.abs(r.top + r.height / 2 - centre);
          if (!best || d < best.d) best = { el, score: 0, d };
        }
      }
      if (!best) {
        setActive(null);
        onActiveRef.current(null, 0);
        return;
      }
      setActive(best.el);
      const id = best.el.dataset.pjStop ?? "";
      // progress: stop i of n sits at (i+1)/n of the way, so the first photo
      // is already at 1/n — the cover is the only thing at 0. The finale is
      // 1 and the last photo is 1 − 1/n, not 1.
      //
      // The two text chapters take part in the OBSERVATION (so the map knows
      // it is at the head or the tail of the route) but must not be looked up
      // in `stopIndex`: they are not photos, and `?? 0` would silently report
      // the finale as 1/n, i.e. as being back at the first stop.
      const idx = stopIndex.get(id);
      const progress =
        id === CHAPTER_START
          ? 0
          : id === CHAPTER_END
            ? 1
            : ((idx ?? 0) + 1) / Math.max(1, stops.length);
      onActiveRef.current(id, progress);
    };

    const observer = new IntersectionObserver(recompute, {
      // a 30%-tall band centred in the viewport
      rootMargin: "-35% 0px -35% 0px",
      threshold: 0,
    });

    for (const el of nodes) observer.observe(el);
    // Expose the scorer so a programmatic scroll can re-run it once it lands
    // (see the click-to-scroll effect's `reassert`).
    recomputeRef.current = recompute;
    // The band is scored from live geometry, but nothing makes the observer
    // FIRE when the map is resized — a drag changes the panel without any
    // intersection crossing, and the address bar collapsing changes it again.
    // Without this the plate keeps naming the stop that owned the OLD band
    // until the reader happens to scroll the next section across the old
    // threshold. (`rootMargin` above is only a trigger region, not the scorer.)
    window.addEventListener(MAP_SPLIT_EVENT, recompute);
    return () => {
      window.removeEventListener(MAP_SPLIT_EVENT, recompute);
      observer.disconnect();
      recomputeRef.current = null;
    };
  }, [stops, stopIndex]);

  /* ------------------------------------------- map → story (click a dot) */

  useEffect(() => {
    if (!focusStopId) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-pj-stop="${CSS.escape(focusStopId)}"]`,
    );
    if (!el) return;

    // Land the section inside the READING BAND by handing the CHROME the job.
    //
    // The previous version computed a scroll destination itself:
    //   target = absTop - (coverH + (vh - coverH) * 0.35)
    // and then chased the result. Three things made that formula wrong or
    // fragile, all measured on a 390×844 viewport:
    //   1. `coverH` subtracted the map height from the band, i.e. assumed the
    //      story was inset below a fixed overlay. It is not — `.pj-map-col` is
    //      `position: sticky`, so it keeps its 490 px of flow space and the
    //      story column begins at y=490. The band was therefore 490 px too low
    //      and the destination put the section 526 px above where it had to
    //      be: clicking stop 13 landed on stop 7, with the target section
    //      parked at secTop=88 while the band sat at 614.
    //   2. `absTop` is measured once, before the jump, from a layout that is
    //      still settling (lazy composites above it are being decoded).
    //   3. Recovering afterwards cost a polling loop, an anchor hack and a
    //      correction scroll — a pile of guesswork on top of a stale number.
    //
    // `scrollIntoView` has no such intermediate: the browser resolves the
    // section's own box against the CURRENT layout at scroll time, applies
    // `scroll-margin-top` from CSS (so the sticky map and any sticky header
    // stay clear), and exposes an `end` event. No formula, nothing to drift.
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    let settled = false;
    let raf = 0;
    let lastY = -1;
    let stable = 0;
    let moved = false;
    /** scrollY at the moment of the click — used to tell "the page moved and
     *  came back" apart from "nothing happened at all". */
    const y0 = Math.round(window.scrollY);
    /** Assigned in the watcher below; `finish` may re-arm it after correcting
     *  the landing position, which is why it has to be reachable from both. */
    let watch = () => {};
    /** The top of the reading band, the way the scorer computes it. Recomputed
     *  live because the phone's address bar and the sticky map both move. */
    const bandTop = () => {
      const p = readPanel();
      return p.top + p.height * 0.35;
    };

    let corrections = 0;
    const finish = () => {
      if (settled) return;
      // The jump is finished. Verify where it actually LANDED before handing
      // over to the scorer: `scrollIntoView` resolves its destination from the
      // layout at the instant it is called, and thirty-odd lazy composites
      // above the target may still be settling. Their aspect boxes come from
      // the `width`/`height` attributes, so normally the position is right —
      // but a section near the end of a 20 000 px document can still come to
      // rest tens of pixels off, and near the bottom the browser also clamps
      // to the maximum scroll. One measured correction, then stop (a loop here
      // would fight the reader).
      const want = bandTop();
      const got = el.getBoundingClientRect().top;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const clampedByEnd = Math.abs(window.scrollY - maxY) < 2;
      if (corrections < 2 && !clampedByEnd && Math.abs(got - want) > 24) {
        corrections++;
        window.scrollTo({ top: window.scrollY + got - want, behavior: "instant" });
        lastY = -1;
        stable = 0;
        raf = requestAnimationFrame(watch);
        return;
      }
      settled = true;
      // Force the reading-band scorer to run. The observer stays silent when
      // no ratio crosses a threshold during a programmatic scroll, so without
      // this the PREVIOUS stop keeps the active flag (and its popup) even
      // though the right section is parked in the band.
      recomputeRef.current?.();
    };

    // `scrollend` fires once the scroll animation actually ends — but only
    // AFTER the page has moved. If the reader taps the dot of the section they
    // are already reading, nothing animates, nothing fires, and a `{ once:
    // true }` listener would linger and hijack the NEXT unrelated scroll. So
    // gate it on having observed motion first; the frame watcher below
    // finishes that no-op case immediately anyway.
    const onEnd = () => {
      if (!moved && Math.round(window.scrollY) === y0) return;
      finish();
    };
    window.addEventListener("scrollend", onEnd);

    // Fallback for engines that do not fire `scrollend` — and for the case
    // where the scroll is already complete when the listener is attached, so
    // nothing animates and nothing fires.
    //
    // The "已到位" test must be `scrollY stopped changing`, NOT "the element is
    // somewhere on screen". A smooth scroll passes through every intermediate
    // position, and by the second frame the target section is already poking
    // into the viewport from below (`r.top < innerHeight` is true for a section
    // that has not arrived yet) — so the earlier version called finish()
    // IMMEDIATELY, recomputed mid-flight, and let the observer then settle on
    // whichever section the animation was passing through. That is exactly the
    // "one stop behind" symptom. Wait for two consecutive frames with the same
    // scrollY before declaring the jump complete.
    const watchImpl = () => {
      if (settled) return;
      const y = Math.round(window.scrollY);
      if (y !== y0) moved = true;
      if (y === lastY) {
        if (++stable >= 2) {
          finish();
          return;
        }
      } else {
        stable = 0;
        lastY = y;
      }
      raf = requestAnimationFrame(watchImpl);
    };
    watch = watchImpl;
    raf = requestAnimationFrame(watchImpl);
    const timer = window.setTimeout(finish, 2500);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      window.removeEventListener("scrollend", onEnd);
    };
    // focusNonce is a deliberate dependency: clicking the SAME dot twice must
    // re-scroll, which a dependency on focusStopId alone would not give.
  }, [focusStopId, focusNonce]);

  const stopNo = (i: number) => String(i + 1).padStart(2, "0");

  /* ------------------------------------------------------- progress rail */

  /** Document-space fraction of each chapter, for the rail's ticks. Same
   *  formula as ptes' TravelNav: an anchor's position over the scrollable
   *  range, biased by the reading band so the tick lights up when the chapter
   *  ARRIVES in the band rather than when it crosses the very top. */
  const railTicks = useMemo(() => {
    const marks: { id: string; label: string }[] = [
      { id: CHAPTER_START, label: lang === "zh" ? "开场" : "Opening" },
      ...stops.map((s, i) => ({
        id: s.id,
        label: `${stopNo(i)} ${s.anitabi?.name ?? (lang === "zh" ? "圣地巡礼地点" : "Anitabi spot")}`,
      })),
      { id: CHAPTER_END, label: lang === "zh" ? "完结" : "Finale" },
    ];
    return marks;
  }, [stops, lang]);

  return (
    <div className="pj-story-col">
      <div className="pj-inner" ref={containerRef}>
        {/* ---- overview ---- */}
        {/* The two text-only blocks are chapters too, not just chrome around
            the stops. They carry sentinel ids so the reading observer reports
            them like any other stop, which is what lets the map put the route's
            head at its very first vertex for the cover and its very last one
            for the finale (see CHAPTER_START / CHAPTER_END in PilgrimageMap).
            Before this, both blocks reported `null` and the line simply froze
            wherever the neighbouring photo had left it. */}
        <section className="pj-overview" data-pj-stop={CHAPTER_START}>
          <p className="pj-kicker">Anitabi · 圣地巡礼</p>
          <h1>{data.title}</h1>
          <p className="pj-overview-meta">
            {data.subtitle} · {data.route.startedAtLocal.slice(11, 16)}–
            {data.route.endedAtLocal.slice(11, 16)} · {(data.route.durationSec / 3600).toFixed(1)} h ·{" "}
            {stops.length} 张对比图
          </p>
          <div className="pj-overview-body">
            {overview.text ? (
              overview.text
                .split("\n\n")
                .map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p className="pj-placeholder">
                巡礼概述待填写 —— 在 content/travel/just-because/page.json 的
                overview.text 里写好后重新构建即可。
              </p>
            )}
          </div>
          {/* Two-layer scroll cue, exactly ptes' boot screen (2026-10-17 user
              request: "scroll 指引应该用和 ptes 相同的 …"): a sentence, then a
              centred column of two stroked chevrons looping through a drop
              animation above an uppercase, letter-spaced label. The English
              page reuses ptes' verbatim wording; the zh mirror says the same
              thing in Chinese, because the sentence is page copy and this page
              is bilingual by construction (lang comes from the route). */}
          <p className="pj-intro-hint">
            {lang === "zh"
              ? "向下滚动，沿着这条路线开始这趟旅程，一路读下去。"
              : "Scroll the journal to start the trip and read the story."}
          </p>
          <div className="pj-scroll-hint" aria-hidden="true">
            <span className="hint-chevrons">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 8 6 6 6-6" />
              </svg>
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 8 6 6 6-6" />
              </svg>
            </span>
            <span className="hint-text">{lang === "zh" ? "向下滚动" : "Scroll to read"}</span>
          </div>
        </section>

        {/* ---- stops ---- */}
        {stops.map((s, i) => (
          <Fragment key={s.id}>
            {(beforeStop.get(s.id) ?? []).map((text, j) => (
              <div className="pj-interlude" key={`${s.id}-pre-${j}`}>
                {text.split("\n\n").map((p, k) => (
                  <p key={k}>{p}</p>
                ))}
              </div>
            ))}
            <section
              className="pj-stop"
              data-pj-stop={s.id}
            >
              <div className="pj-stop-head">
                <span className="pj-stop-no">{stopNo(i)}</span>
                <span className="pj-stop-time">{s.time}</span>
                <span className="pj-stop-place">
                  {s.anitabi?.name ?? "圣地巡礼地点"}
                  {s.anitabi?.ep != null && (
                    <span className="pj-ep">第 {s.anitabi.ep} 话</span>
                  )}
                </span>
              </div>
              {/* Reading order is title → caption → picture: the caption says
                  what to look FOR, then the picture answers it. The caption
                  used to sit under the composite, which meant the reader met
                  the prose only after they had already formed their own
                  reading of the image. */}
              {s.note && <p className="pj-stop-note">{s.note}</p>}
              <figure className="pj-stop-card" style={{ aspectRatio: `${s.imgW} / ${s.imgH}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={`${s.time} ${s.anitabi?.name ?? ""} 圣地巡礼对比图`}
                  loading={i < 2 ? "eager" : "lazy"}
                  width={s.imgW}
                  height={s.imgH}
                />
              </figure>
            </section>
          </Fragment>
        ))}

        {/* ---- finale ---- */}
        <section className="pj-outro" data-pj-stop={CHAPTER_END}>
          <p className="pj-kicker">Finale</p>
          <h2 className="pj-outro-title">{outro.title || "完结撒花 🎉"}</h2>
          <p className="pj-outro-line">
            {data.route.startedAtLocal.slice(11, 16)} 出发 ·{" "}
            {data.route.endedAtLocal.slice(11, 16)} 返回 ·{" "}
            {(data.route.durationSec / 3600).toFixed(1)} 小时 · {stops.length} 个场景
          </p>
          <div className="pj-outro-body">
            {outro.text ? (
              outro.text.split("\n\n").map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p className="pj-placeholder">
                结尾感言待填写 —— 在 content/travel/just-because/page.json 的
                outro.text 里写。
              </p>
            )}
          </div>
          <p className="pj-outro-hint">感谢阅读 ~</p>
        </section>
      </div>

      {/* Right-gutter progress rail — ptes' .tnav-rail, same anatomy: a
          percentage head, a 4px track with a blue fill, one clickable tick per
          chapter, and a back-to-top button at the foot. Ticks are positioned
          from MEASURED document offsets (not a formula), and the rail's x is
          measured from the story column every frame, so it tracks the text at
          any viewport instead of relying on hand-tuned constants.
          Desktop only (≥1024); below that the same component renders the
          horizontal bar pinned to the viewport bottom, exactly as TravelNav
          does for ptes. */}
      <PilgrimageRail marks={railTicks} scopeRef={containerRef} lang={lang} />
    </div>
  );
}

/* ------------------------------------------------------------ progress rail */

/**
 * Scroll progress + chapter jumps — the pilgrimage page's counterpart to the
 * trip log's `TravelNav`, deliberately the same object: 4px track, blue fill
 * at 55% opacity, 12px ticks with a tooltip, a monospace percentage head and a
 * back-to-top foot button. A reader moving between /travel/ptes-2025 and
 * /travel/just-because should recognise it instantly.
 *
 * Two layouts, same as ptes:
 *   ≥1024 — vertical rail in the story gutter, head = percentage, foot =
 *           back-to-top. Its x is MEASURED from the story column every frame
 *           (ptes learned this the hard way: hand-computed CSS constants broke
 *           silently once the pane width changed).
 *   <1024 — horizontal bar fixed to the viewport BOTTOM. ptes moved it there
 *           because a top bar overlaid the map's controls; on this page the
 *           map owns the top 58vh, so the same reasoning applies twice over.
 *
 * Ticks are positioned from the real DOM offsets of the sections, re-measured
 * on resize and whenever the document's height changes (36 lazy composites
 * land continuously, so a one-shot measure would drift).
 */
function PilgrimageRail({
  marks,
  scopeRef,
  lang,
}: {
  /** chapter ids in reading order — the SAME ids the sections carry */
  marks: { id: string; label: string }[];
  /** the scrolling column that owns the [data-pj-stop] sections */
  scopeRef: RefObject<HTMLDivElement | null>;
  lang: "en" | "zh";
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const railFillRef = useRef<HTMLDivElement | null>(null);
  const barTrackRef = useRef<HTMLDivElement | null>(null);
  const barFillRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const topBtnRef = useRef<HTMLButtonElement | null>(null);
  /** id → position along the track, 0…100 (%). */
  const [ticks, setTicks] = useState<{ id: string; label: string; at: number }[]>([]);
  /** The chapter currently in the reading band — lit tick. */
  const [activeId, setActiveId] = useState<string | null>(null);
  /** v16 (2026-10-24 user request): the chapter index drawer. Same object and
   *  the same interaction as the trip log's ☰ ("anitabi页面也可以有一个目录按钮，
   *  操作逻辑与ptes相同"): tap to open a right-hand sheet listing every chapter,
   *  tap a row to jump to it, tap the scrim or press Escape to close. */
  const [open, setOpen] = useState(false);

  /* measure: section top → percentage of the scrollable range.
     The 0.475 bias is ptes' constant (TravelNav), and it is right for the
     reason it was right there: a section is "reached" when its top crosses the
     middle of the viewport, not when the document has scrolled that far. */
  useEffect(() => {
    const measure = () => {
      const root = scopeRef.current;
      if (!root) return;
      const vh = window.innerHeight;
      // The band has to follow the DRAGGABLE split (2026-10-24): on a phone
      // the map owns y = 0..mapH, so the reading band's centre is
      // mapH + 0.35 x (vh - mapH), not 0.475 x vh. At the default 58vh the two
      // agree to within half a percent; once the reader drags the split 150px
      // they diverge by ~100px, which is enough for a neighbour's tick to light
      // up instead of the chapter being read. Measured, never assumed.
      const mapCol = root.closest(".pj-page")?.querySelector(".pj-map-col");
      const mapH = mapCol
        ? Math.min(vh, Math.max(0, mapCol.getBoundingClientRect().height))
        : 0;
      // A full-height column (desktop) is not an overlay: keep the viewport rule.
      const stacked = mapH > 0 && mapH < vh - 120;
      const bandY = stacked ? mapH + 0.35 * (vh - mapH) : vh * 0.475;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const next: { id: string; label: string; at: number }[] = [];
      for (const m of marks) {
        const el = root.querySelector<HTMLElement>(`[data-pj-stop="${CSS.escape(m.id)}"]`);
        if (!el) continue;
        const y = el.getBoundingClientRect().top + window.scrollY;
        next.push({
          id: m.id,
          label: m.label,
          at: Math.min(100, Math.max(0, ((y - bandY) / max) * 100)),
        });
      }
      setTicks(next);
    };
    measure();
    // Two signals, because neither alone is enough: ResizeObserver catches the
    // lazy composites arriving (they change body height without a scroll), and
    // the resize listener catches the viewport (which changes `max`).
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    // A drag on the licence strip changes the map height WITHOUT resizing the
    // body, so neither signal above fires; map-split.tsx dispatches this.
    window.addEventListener(MAP_SPLIT_EVENT, measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener(MAP_SPLIT_EVENT, measure);
    };
  }, [marks, scopeRef]);

  /* per-frame: fill height, percentage text, read ticks, and the rail's x.
     Deliberately imperative — this runs 60×/s and must not re-render React. */
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const f = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (railFillRef.current) railFillRef.current.style.height = `${(f * 100).toFixed(2)}%`;
      if (barFillRef.current) barFillRef.current.style.width = `${(f * 100).toFixed(2)}%`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(f * 100)}%`;
      topBtnRef.current?.classList.toggle("lit", f >= 0.98);

      // A tick is "read" once the reader is past it. Recomputed every frame
      // rather than stored in state: React would wipe the imperative classes
      // on any unrelated re-render.
      for (const container of [railRef.current, barTrackRef.current]) {
        if (!container) continue;
        // .pjr-mark are graduations, not chapter buttons — skip them, or the
        // walk would tag each one `read`.
        for (const el of Array.from(container.querySelectorAll<HTMLElement>(".pjr-tick"))) {
          el.classList.toggle("read", parseFloat(el.dataset.at ?? "0") <= f * 100);
        }
      }

      // Which chapter owns the band — the same band the observer and the
      // landing offset use, so the lit tick always agrees with the lit section.
      //
      // The band is NOT a fixed slice of the viewport on a stacked layout: the
      // sticky map owns the top of the screen and the reader can drag where it
      // ends (lib/travel/map-split.tsx publishes that as --pj-band-top on the
      // page root). Reading `vh * 0.35` here lit the wrong tick as soon as the
      // split moved — measured: dragging the map from 58vh to 44vh left the
      // rail highlighting the NEXT chapter, because the real band had moved up
      // 78px while this window had not. On desktop the column is full-height,
      // the hook writes nothing, and the fallback is the original 35%.
      const root = scopeRef.current;
      if (root) {
        const vh = window.innerHeight;
        const declaredBandTop = parseFloat(
          getComputedStyle(root).getPropertyValue("--pj-band-top"),
        );
        const bandTop = Number.isFinite(declaredBandTop)
          ? declaredBandTop
          : vh * 0.35;
        // The band is the first 65% of what is left below the map, which on a
        // full-height column is 0.35vh…0.65vh — the original numbers.
        const bandBottom = bandTop + (vh - bandTop) * 0.65;
        let best: { id: string; score: number } | null = null;
        for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-pj-stop]"))) {
          const r = el.getBoundingClientRect();
          const overlap = Math.min(r.bottom, bandBottom) - Math.max(r.top, bandTop);
          if (overlap > 0 && (!best || overlap > best.score)) {
            best = { id: el.dataset.pjStop ?? "", score: overlap };
          }
        }
        // Only setState on an actual change — 60 setState/s would be a loop.
        const nextActive = best?.id ?? null;
        setActiveId((cur) => (cur === nextActive ? cur : nextActive));
      }

      // Rail x: mirror ptes' plan-A measurement. The axis sits in the gutter
      // to the RIGHT of the text, so anchor to the column's right edge minus
      // its padding, then step out by half the rail width. Measured, not
      // guessed, so it survives any future change to .pj-inner's max-width.
      if (boxRef.current && window.innerWidth >= 1024) {
        const col = scopeRef.current;
        if (col) {
          const r = col.getBoundingClientRect();
          const centre = r.right - 12;
          const vw = document.documentElement.clientWidth || window.innerWidth;
          const right = Math.max(10, vw - centre - 2);
          boxRef.current.style.right = `${right.toFixed(1)}px`;
        }
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scopeRef]);

  const jumpTo = (id: string) => {
    const el = scopeRef.current?.querySelector<HTMLElement>(
      `[data-pj-stop="${CSS.escape(id)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  };

  /* Mobile slider scrub (2026-10-24) — the trip log's .tnav-scrub, mirrored.
     "进度条还是不要刻度了，做成一个普通的可拖动进度条就可以。不过在拖动的时候，
     端点上可以浮现出一个方框，标示拖到的是哪个章节。"
     Fraction is in the SCROLL domain, matching how the bar's fill is drawn.
     behavior:"instant" is required: a smooth scroll restarted on every
     pointermove never converges on the finger's position. */
  const scrubTo = useCallback((fraction: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    window.scrollTo({ top: fraction * max, behavior: "instant" });
  }, []);

  const scrubBoxRef = useRef<HTMLDivElement>(null);
  const scrubBoxTextRef = useRef<HTMLSpanElement>(null);

  /** Same shape as the trip log's marks so chapterAtFraction can read both. */
  const scrubMarks = useMemo(
    () => ticks.map((t) => ({ no: t.id, left: t.at })),
    [ticks]
  );

  /** DOM write, not state — the frame loop owns .read/.active here and a
   *  re-render per pointermove would fight it. */
  const paintScrub = useCallback(
    (fraction: number) => {
      const box = scrubBoxRef.current;
      const track = barTrackRef.current;
      const mark = chapterAtFraction(scrubMarks, fraction);
      if (!box || !track || !mark) return;
      const hit = ticks.find((t) => t.id === mark.no);
      if (scrubBoxTextRef.current) scrubBoxTextRef.current.textContent = hit?.label ?? "";
      const w = track.getBoundingClientRect().width;
      // Keep the box inside the bar's rounded ends.
      const inset = Math.min(52, w / 2);
      box.style.left = `${Math.min(w - inset, Math.max(inset, fraction * w)).toFixed(1)}px`;
      box.classList.add("is-on");
    },
    [scrubMarks, ticks]
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

  // Escape closes the index sheet (same contract as the trip log's drawer).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const renderTicks = (vertical: boolean) =>
    ticks.map((t) => (
      <button
        key={t.id}
        type="button"
        className={
          "pjr-tick" +
          (t.id === activeId ? " active" : "") +
          (!vertical ? (t.at > 88 ? " edge-r" : t.at < 12 ? " edge-l" : "") : "")
        }
        style={vertical ? { top: `${t.at}%` } : { left: `${t.at}%` }}
        data-at={t.at}
        onClick={() => jumpTo(t.id)}
        aria-label={t.label}
      >
        <span className="pjr-tip">{t.label}</span>
      </button>
    ));

  return (
    <>
      {/* vertical rail (desktop) */}
      <div
        ref={boxRef}
        className="pjr-rail"
        role="navigation"
        aria-label={lang === "zh" ? "阅读进度" : "Reading progress"}
      >
        <span className="pjr-pct" ref={pctRef}>
          0%
        </span>
        <div className="pjr-rail-track" ref={railRef}>
          <div className="pjr-fill pjr-rail-fill" ref={railFillRef} />
          {renderTicks(true)}
        </div>
        <button
          type="button"
          className="pjr-top"
          ref={topBtnRef}
          onClick={toTop}
          aria-label={lang === "zh" ? "回到顶部" : "Back to top"}
          title={lang === "zh" ? "回到顶部" : "Back to top"}
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

      {/* horizontal bar (phone / tablet), pinned to the viewport bottom */}
      <div
        className="pjr-bar"
        role="navigation"
        aria-label={lang === "zh" ? "阅读进度" : "Reading progress"}
      >
        <div className="pjr-track" ref={barTrackRef}>
          {/* Graduations: DESKTOP RAIL ONLY since 2026-10-24. On a phone the
              bar is a plain slider — "进度条还是不要刻度了" — so the media
              query below hides .pjr-mark and .pjr-tick together. They stay in
              the DOM because the vertical rail reuses the same arrays. */}
          {ticks.map((t) => (
            <span
              key={t.id}
              className="pjr-mark"
              /* round() snaps the percentage to a whole CSS pixel before the
                 rule is drawn — without it the edge lands on a fractional
                 device pixel and the ruler shows marks of differing width.
                 See .tnav-mark in TravelNav.tsx for the measurements. */
              style={{
                left: `round(${Math.min(99.9, Math.max(0, t.at))}%, 1px)`,
              }}
              aria-hidden="true"
            />
          ))}
          <div className="pjr-fill" ref={barFillRef} />
          {/* Draggable surface (the whole tube). The chapter box is NOT in
              here — .pjr-track clips (overflow:hidden), so a box above its
              top edge would be invisible; see the note at the box below. */}
          <div className="pjr-scrub" {...scrub.surfaceProps} />
          {renderTicks(false)}
        </div>
        {/* Chapter box — a sibling of the tube, inside .pjr-bar. It has to be
            OUT here: .pjr-track carries overflow:hidden, so anything placed
            above its top edge is clipped away silently (measured correctly,
            opacity 1, and completely invisible). Anchored off the bar's own
            box; the bar's padding-top is the tube's top inset. */}
        <div className="pjr-scrub-box" ref={scrubBoxRef} aria-hidden="true">
          <span className="pjr-scrub-text" ref={scrubBoxTextRef} />
        </div>

        {/* v16: chapter index, left of the tube (the trip log puts it on the
            right; here the reading direction is the same L→R fill, so the
            button sits on the side the reader is heading towards). */}
        <button
          type="button"
          className={`pjr-toc${open ? " is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={lang === "zh" ? "目录" : "Chapter index"}
          aria-expanded={open}
        >
          ☰
        </button>
      </div>

      {/* chapter index sheet — same interaction contract as the trip log's day
          drawer: scrim tap / Escape / row tap all close it. */}
      <div
        className={`pjr-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`pjr-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={lang === "zh" ? "目录" : "Chapter index"}
        aria-hidden={!open}
      >
        <div className="pjr-drawer-head">
          <span>{lang === "zh" ? "目录" : "Chapter index"}</span>
          <button
            type="button"
            className="pjr-drawer-x"
            onClick={() => setOpen(false)}
            aria-label={lang === "zh" ? "关闭" : "Close"}
            tabIndex={open ? 0 : -1}
          >
            ×
          </button>
        </div>
        <div className="pjr-list">
          {ticks.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`pjr-row${t.id === activeId ? " active" : ""}`}
              onClick={() => jumpTo(t.id)}
              tabIndex={open ? 0 : -1}
            >
              {t.label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
