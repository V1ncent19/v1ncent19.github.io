"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import type { PilgrimageData } from "@/lib/travel/pilgrimage";
import { CHAPTER_END, CHAPTER_START } from "@/lib/travel/pilgrimage";
import { readingPanel } from "@/lib/travel/log/reading-geometry";
import { MAP_SPLIT_EVENT } from "@/lib/travel/map-split";
import ChapterNavigation from "./log/ChapterNavigation";
import { navigateToChapter } from "@/lib/travel/log/navigation";
import TravelLogFacts from "./log/TravelLogFacts";
import TravelLogScrollCue from "./log/TravelLogScrollCue";

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
  activeStopId: string | null;
}

export default function PilgrimageStory({
  data,
  onActiveStop,
  focusStopId,
  focusNonce,
  lang = "en",
  activeStopId,
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
  const readPanel = () => readingPanel(containerRef.current);

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
    navigateToChapter(containerRef.current, focusStopId, "pilgrimage");

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
    const marks: { id: string; sectionId: string; label: string }[] = [
      { id: CHAPTER_START, sectionId: CHAPTER_START, label: lang === "zh" ? "开场" : "Opening" },
      ...stops.map((s, i) => ({
        id: s.id, sectionId: s.id,
        label: `${stopNo(i)} ${s.anitabi?.name ?? (lang === "zh" ? "圣地巡礼地点" : "Anitabi spot")}`,
      })),
      { id: CHAPTER_END, sectionId: CHAPTER_END, label: lang === "zh" ? "完结" : "Finale" },
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
        <section className="pj-overview" data-pj-stop={CHAPTER_START} data-log-section={CHAPTER_START}>
          <p className="pj-kicker">Anitabi · 圣地巡礼</p>
          <h1>{data.title}</h1>
          <p className="pj-overview-meta">
            {data.subtitle} · {data.route.startedAtLocal.slice(11, 16)}–
            {data.route.endedAtLocal.slice(11, 16)}
          </p>
          <TravelLogFacts items={[
            { label: lang === "zh" ? "巡礼时长" : "Duration", value: `${(data.route.durationSec / 3600).toFixed(1)} h` },
            { label: lang === "zh" ? "路线记录" : "Route samples", value: data.route.pointCount.toLocaleString() },
            { label: lang === "zh" ? "对比图" : "Comparisons", value: stops.length.toLocaleString() },
          ]} />
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
          <TravelLogScrollCue lang={lang} />
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
              data-pj-stop={s.id} data-log-section={s.id}
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
        <section className="pj-outro" data-pj-stop={CHAPTER_END} data-log-section={CHAPTER_END}>
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
      <ChapterNavigation chapters={railTicks} scopeRef={containerRef} activeId={activeStopId} kind="pilgrimage" lang={lang} />
    </div>
  );
}
