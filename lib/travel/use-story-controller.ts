"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TripInfo, TripTrack, TravelScene } from "./types";
import { interpolatePosition } from "./gps";

export type StoryMode = "story" | "explore";

export interface StoryState {
  activeSceneId: string; // "__intro__" for the trip overview block
  mode: StoryMode;
  /** damped narrative time (epoch ms) — spring-follows the scroll target */
  currentTime: number;
  /** interpolated marker position */
  position: { lon: number; lat: number };
  /** index into track.points of the last passed observation */
  pointIdx: number;
}

const INTRO = "__intro__";

/**
 * Anchor: a document-space scroll position mapped to a narrative time.
 * Two anchors per timed scene — section top -> startTime, bottom -> endTime —
 * so the scroll target time is a single piecewise-linear function of scroll
 * position across the whole page.
 */
type Anchor = { y: number; t: number };

/** viewport line used for both scene activation and time sampling */
const BAND = 0.475;

// ---- damped follower (critically damped spring on narrative time) ----
// Fast flings or content-thin sections move the scroll target far ahead;
// the rendered time accelerates to catch up (proportional to distance) and
// decelerates into place — the route grows continuously instead of jumping.
const SPRING_OMEGA = 8; // rad/s, critically damped; ~0.6s to settle (was 5: felt laggy)
const VMAX_FLOOR = 3.6 * 3_600_000; // ms/s floor: small gaps still glide, never crawl
const CATCH_SECONDS = 0.5; // the gap observed at fling time is crossed in ~this long
const SETTLE_DIST_MS = 250;
const SETTLE_SPEED_MS = 5_000;

/**
 * Core interaction model:
 * - Scroll position -> target narrative time via global anchors.
 * - Target -> rendered time via critically damped spring (velocity-capped).
 * - Scene activation via IntersectionObserver (highlights text + camera zoom
 *   target only — it does not drive time).
 * - rendered time -> binary search + interpolation into the GPS track.
 */
export function useStoryController(
  trip: TripInfo | null,
  track: TripTrack | null,
  scenes: TravelScene[]
) {
  const [activeSceneId, setActiveSceneId] = useState<string>(INTRO);
  const [mode, setMode] = useState<StoryMode>("story");
  const [currentTime, setCurrentTime] = useState<number>(0);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const activeRef = useRef<string>(INTRO);
  const anchorsRef = useRef<Anchor[]>([]);
  const targetTimeRef = useRef<number>(0);
  const springRef = useRef({ t: 0, v: 0, running: false, raf: 0 });
  // velocity cap priced on the gap observed when the fling started (refreshed
  // on scroll); constant during pure catch-up so the spring can land naturally
  const capRef = useRef<number>(VMAX_FLOOR);

  const sceneById = useMemo(() => {
    const m = new Map<string, TravelScene>();
    for (const s of scenes) m.set(s.id, s);
    return m;
  }, [scenes]);

  // ---- damped follower loop (starts on target change, stops when settled)
  const kickSpring = useCallback(() => {
    const s = springRef.current;
    if (s.running) return;
    if (s.t === 0) s.t = targetTimeRef.current; // first tick: no catch-up
    s.running = true;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const d = targetTimeRef.current - s.t;
      if (Math.abs(d) < SETTLE_DIST_MS && Math.abs(s.v) < SETTLE_SPEED_MS) {
        s.t = targetTimeRef.current;
        s.v = 0;
        s.running = false;
        setCurrentTime(s.t);
        return;
      }
      // substepped integration: frame-rate independent (headless rAF
      // throttling must not slow the simulation) and unconditionally stable
      let remain = dt;
      while (remain > 0) {
        const h = Math.min(0.016, remain);
        remain -= h;
        const d2 = targetTimeRef.current - s.t;
        if (Math.abs(d2) < SETTLE_DIST_MS && Math.abs(s.v) < SETTLE_SPEED_MS) {
          s.t = targetTimeRef.current;
          s.v = 0;
          break;
        }
        // cruise cap from the fling-time gap, but never above the spring's
        // natural braking envelope (omega * |d|) — prevents overshoot cycles
        // that used to make big catch-ups bounce for seconds
        const vmax = Math.max(VMAX_FLOOR, Math.min(capRef.current, SPRING_OMEGA * Math.abs(d2)));
        const a = SPRING_OMEGA * SPRING_OMEGA * d2 - 2 * SPRING_OMEGA * s.v;
        s.v += a * h;
        if (s.v > vmax) s.v = vmax;
        if (s.v < -vmax) s.v = -vmax;
        s.t += s.v * h;
      }
      (window as unknown as Record<string, unknown>).__ttime = s.t;
      setCurrentTime(s.t);
      if (s.v === 0 && s.t === targetTimeRef.current) {
        s.running = false;
        return;
      }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(springRef.current.raf), []);

  // initial narrative time (before the first anchor takes over).
  // Site-integration note: setCurrentTime deferred to a rAF — the main site's
  // react-hooks lint forbids synchronous setState inside effects; the one
  // frame of delay is invisible (the spring itself is rAF-driven).
  useEffect(() => {
    if (track && currentTime === 0 && track.points.length > 0) {
      const t0 = track.points[0].ts;
      targetTimeRef.current = t0;
      springRef.current.t = t0;
      const raf = requestAnimationFrame(() => setCurrentTime(t0));
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  const updateProgressRef = useRef<() => void>(() => {});

  // ---- global scroll -> target time anchors
  const rebuildAnchors = useCallback(() => {
    const list: Anchor[] = [];
    for (const [id, el] of sectionRefs.current) {
      const scene = sceneById.get(id);
      if (!scene) continue; // intro / non-timed blocks
      const t0 = Date.parse(scene.startTime);
      const t1 = Date.parse(scene.endTime);
      if (!Number.isFinite(t0) || !Number.isFinite(t1)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) continue;
      const top = rect.top + window.scrollY;
      list.push({ y: top, t: t0 });
      list.push({ y: top + rect.height, t: t1 });
    }
    list.sort((a, b) => a.y - b.y);
    anchorsRef.current = list;
    (window as unknown as Record<string, unknown>).__tanchors = list;
    updateProgressRef.current();
  }, [sceneById]);

  // rebuild whenever layout may have shifted (load, images, resize)
  useEffect(() => {
    if (!trip) return;
    rebuildAnchors();
    const ro = new ResizeObserver(() => rebuildAnchors());
    ro.observe(document.body);
    window.addEventListener("resize", rebuildAnchors);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", rebuildAnchors);
    };
  }, [trip, rebuildAnchors]);

  // ---- scene activation (IntersectionObserver over the mid viewport band)
  useEffect(() => {
    if (!trip) return;
    const rootMargin = "-45% 0px -50% 0px";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.sceneId;
            if (id && id !== activeRef.current) {
              activeRef.current = id;
              setActiveSceneId(id);
            }
          }
        }
      },
      { rootMargin, threshold: 0 }
    );
    for (const el of sectionRefs.current.values()) io.observe(el);
    return () => io.disconnect();
  }, [trip, scenes]);

  // ---- global scroll position -> target time (piecewise linear)
  const updateProgress = useCallback(() => {
    const anchors = anchorsRef.current;
    if (anchors.length < 2) return;
    const y = window.scrollY + window.innerHeight * BAND;
    let t: number;
    if (y <= anchors[0].y) {
      t = anchors[0].t;
    } else if (y >= anchors[anchors.length - 1].y) {
      t = anchors[anchors.length - 1].t;
    } else {
      let lo = 0;
      let hi = anchors.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (anchors[mid].y <= y) lo = mid;
        else hi = mid;
      }
      const a = anchors[lo];
      const b = anchors[hi];
      const f = (y - a.y) / Math.max(1, b.y - a.y);
      t = a.t + f * (b.t - a.t);
    }
    capRef.current = Math.max(VMAX_FLOOR, Math.abs(t - springRef.current.t) / CATCH_SECONDS);
    targetTimeRef.current = t;
    kickSpring();
  }, [kickSpring]);

  // Site-integration note: was a render-phase ref write — moved into an
  // effect (declared before the scroll subscription so later commits always
  // have the freshest closure before any rebuild can call it).
  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateProgress();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [updateProgress]);

  // ---- rendered narrative time -> GPS position (pointIdx derived, no state
  // mirror: a setState-in-effect here risks update loops on fast catch-ups)
  const position = useMemo(() => {
    if (!track || track.points.length === 0) return { lon: 0, lat: 0, idx: 0 };
    return interpolatePosition(track.points, currentTime);
  }, [track, currentTime]);

  // debug handle (probe contract: window.__tpoints) — was inside the memo
  // above; external writes belong in an effect under the site's lint rules
  useEffect(() => {
    if (track) {
      (window as unknown as Record<string, unknown>).__tpoints = track.points;
    }
  }, [track]);

  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
    else sectionRefs.current.delete(id);
  }, []);

  const enterExplore = useCallback(() => setMode("explore"), []);
  const resumeStory = useCallback(() => setMode("story"), []);

  const state: StoryState = {
    activeSceneId,
    mode,
    currentTime,
    position,
    pointIdx: position.idx,
  };

  return { state, registerSection, enterExplore, resumeStory };
}
