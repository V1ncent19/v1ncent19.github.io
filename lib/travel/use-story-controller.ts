"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TripInfo, TripTrack, TravelScene } from "./types";
import { readingLine } from "./log/reading-geometry";
import { MAP_SPLIT_EVENT } from "./map-split";
import { interpolatePosition } from "./gps";

import { cameraAfterGesture, type CameraMode } from "./log/camera";
export type StoryMode = CameraMode;

export interface StoryState {
  activeSceneId: string; // "__intro__" for the trip overview block
  mode: StoryMode;
  /** Narrative time (epoch ms) derived from the damped reading line. */
  currentTime: number;
  /** The same spring-damped document reading line that produced currentTime. */
  readingY: number;
  /** interpolated marker position */
  position: { lon: number; lat: number };
  /** index into track.points of the last passed observation */
  pointIdx: number;
}

const INTRO = "__intro__";

/**
 * Anchor: a document-space scroll position mapped to a narrative time.
 * Two anchors per timed scene — section top -> startTime, bottom -> endTime —
 * joined by a monotone cubic so speed does not change abruptly at scene edges.
 */
type Anchor = { y: number; t: number; slope: number };
type SceneAnchor = { id: string; y: number };

const bandY = () => readingLine();

// ---- damped follower (critically damped spring in document pixels) ----
// Fast flings or content-thin sections move the scroll target far ahead;
// the shared reading line accelerates to catch up and decelerates into place.
const SPRING_OMEGA = 12; // rad/s, critically damped; tighten the marker's catch-up
const VMAX_FLOOR = 9_000; // px/s floor: small gaps still glide, never crawl
const CATCH_SECONDS = 0.32; // target gap at a fling is crossed more promptly
const SETTLE_DIST_PX = 0.5;
const SETTLE_SPEED_PX = 8;

function timeAtY(y: number, anchors: Anchor[]): number {
  if (anchors.length === 0) return 0;
  if (y <= anchors[0].y) return anchors[0].t;
  if (y >= anchors[anchors.length - 1].y) return anchors[anchors.length - 1].t;
  let lo = 0;
  let hi = anchors.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (anchors[mid].y <= y) lo = mid;
    else hi = mid;
  }
  const a = anchors[lo];
  const b = anchors[hi];
  const h = b.y - a.y;
  const f = (y - a.y) / h;
  const f2 = f * f;
  const f3 = f2 * f;
  return (
    (2 * f3 - 3 * f2 + 1) * a.t +
    (f3 - 2 * f2 + f) * h * a.slope +
    (-2 * f3 + 3 * f2) * b.t +
    (f3 - f2) * h * b.slope
  );
}

function addMonotoneSlopes(anchors: Omit<Anchor, "slope">[]): Anchor[] {
  const n = anchors.length;
  if (n < 2) return anchors.map((a) => ({ ...a, slope: 0 }));
  const h = new Array<number>(n - 1);
  const delta = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = Math.max(1, anchors[i + 1].y - anchors[i].y);
    delta[i] = (anchors[i + 1].t - anchors[i].t) / h[i];
  }

  const slopes = new Array<number>(n);
  if (n === 2) {
    slopes[0] = slopes[1] = delta[0];
  } else {
    const endpoint = (h0: number, h1: number, d0: number, d1: number) => {
      let m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(m) !== Math.sign(d0)) m = 0;
      else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(m) > Math.abs(3 * d0)) m = 3 * d0;
      return m;
    };
    slopes[0] = endpoint(h[0], h[1], delta[0], delta[1]);
    slopes[n - 1] = endpoint(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
    for (let i = 1; i < n - 1; i++) {
      const before = delta[i - 1];
      const after = delta[i];
      if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after)) {
        slopes[i] = 0;
      } else {
        const w1 = 2 * h[i] + h[i - 1];
        const w2 = h[i] + 2 * h[i - 1];
        slopes[i] = (w1 + w2) / (w1 / before + w2 / after);
      }
    }
  }
  return anchors.map((a, i) => ({ ...a, slope: slopes[i] }));
}

/**
 * Core interaction model:
 * - Scroll position -> target document reading line.
 * - One critically damped spring produces the reading line used by both the
 *   marker timeline and camera-key interpolation.
 * - Scene activation uses the same scroll reading line as time sampling, so
 *   the highlighted story section and moving marker stay in step.
 * - rendered time -> binary search + interpolation into the GPS track.
 */
export function useStoryController(
  trip: TripInfo | null,
  track: TripTrack | null,
  scenes: TravelScene[]
) {
  const [activeSceneId, setActiveSceneId] = useState<string>(INTRO);
  const [mode, setMode] = useState<StoryMode>("follow");
  const narrativeTimeRef = useRef(0);
  const readTime = useCallback(() => narrativeTimeRef.current, []);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [readingY, setReadingY] = useState<number>(0);

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const activeRef = useRef<string>(INTRO);
  const anchorsRef = useRef<Anchor[]>([]);
  const sceneAnchorsRef = useRef<SceneAnchor[]>([]);
  const targetYRef = useRef<number>(0);
  const springRef = useRef({ y: 0, v: 0, running: false, raf: 0 });
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
    if (s.y === 0) s.y = targetYRef.current; // first tick: no catch-up
    s.running = true;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const d = targetYRef.current - s.y;
      if (Math.abs(d) < SETTLE_DIST_PX && Math.abs(s.v) < SETTLE_SPEED_PX) {
        s.y = targetYRef.current;
        s.v = 0;
        s.running = false;
        setReadingY(s.y);
        const t = timeAtY(s.y, anchorsRef.current);
        narrativeTimeRef.current = t;
        setCurrentTime(t);
        return;
      }
      // substepped integration: frame-rate independent (headless rAF
      // throttling must not slow the simulation) and unconditionally stable
      let remain = dt;
      while (remain > 0) {
        const h = Math.min(0.016, remain);
        remain -= h;
        const d2 = targetYRef.current - s.y;
        if (Math.abs(d2) < SETTLE_DIST_PX && Math.abs(s.v) < SETTLE_SPEED_PX) {
          s.y = targetYRef.current;
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
        s.y += s.v * h;
      }
      const t = timeAtY(s.y, anchorsRef.current);
      narrativeTimeRef.current = t;
      setReadingY(s.y);
      setCurrentTime(t);
      if (s.v === 0 && s.y === targetYRef.current) {
        s.running = false;
        return;
      }
      s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(springRef.current.raf), []);

  // initialize at the restored/current reading line when track data arrives.
  // Site-integration note: setCurrentTime deferred to a rAF — the main site's
  // react-hooks lint forbids synchronous setState inside effects; the one
  // frame of delay is invisible (the spring itself is rAF-driven).
  useEffect(() => {
    if (track && currentTime === 0 && track.points.length > 0) {
      const y = window.scrollY + bandY();
      targetYRef.current = y;
      springRef.current.y = y;
      const t = timeAtY(y, anchorsRef.current) || track.points[0].ts;
      const raf = requestAnimationFrame(() => {
        setReadingY(y);
        setCurrentTime(t);
        narrativeTimeRef.current = t;
      });
      return () => cancelAnimationFrame(raf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  const updateProgressRef = useRef<() => void>(() => {});

  // ---- global scroll -> document-space timeline anchors
  const rebuildAnchors = useCallback(() => {
    const list: Omit<Anchor, "slope">[] = [];
    const sections: SceneAnchor[] = [];
    for (const [id, el] of sectionRefs.current) {
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) continue;
      const top = rect.top + window.scrollY;
      sections.push({ id, y: top });
      const scene = sceneById.get(id);
      if (!scene) continue; // intro / non-timed blocks
      const t0 = Date.parse(scene.startTime);
      const t1 = Date.parse(scene.endTime);
      if (!Number.isFinite(t0) || !Number.isFinite(t1)) continue;
      list.push({ y: top, t: t0 });
      list.push({ y: top + rect.height, t: t1 });
    }
    list.sort((a, b) => a.y - b.y);
    sections.sort((a, b) => a.y - b.y);
    anchorsRef.current = addMonotoneSlopes(list);
    sceneAnchorsRef.current = sections;
    (window as unknown as Record<string, unknown>).__tanchors = anchorsRef.current;
    updateProgressRef.current();
  }, [sceneById]);

  // rebuild whenever layout may have shifted (load, images, resize)
  useEffect(() => {
    if (!trip) return;
    rebuildAnchors();
    const ro = new ResizeObserver(() => rebuildAnchors());
    ro.observe(document.body);
    window.addEventListener("resize", rebuildAnchors);
    window.addEventListener(MAP_SPLIT_EVENT, rebuildAnchors);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", rebuildAnchors);
      window.removeEventListener(MAP_SPLIT_EVENT, rebuildAnchors);
    };
  }, [trip, rebuildAnchors]);

  // ---- global scroll position -> shared damped reading line
  const updateProgress = useCallback(() => {
    const sections = sceneAnchorsRef.current;
    if (sections.length > 0) {
      const lineY = window.scrollY + bandY();
      let lo = 0;
      let hi = sections.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sections[mid].y <= lineY) lo = mid + 1;
        else hi = mid;
      }
      const activeId = sections[Math.max(0, lo - 1)].id;
      if (activeId !== activeRef.current) {
        activeRef.current = activeId;
        setActiveSceneId(activeId);
      }
    }

    if (anchorsRef.current.length < 2) return;
    const y = window.scrollY + bandY();
    capRef.current = Math.max(VMAX_FLOOR, Math.abs(y - springRef.current.y) / CATCH_SECONDS);
    targetYRef.current = y;
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

  const enterExplore = useCallback(() => setMode(cameraAfterGesture()), []);
  const resumeStory = useCallback(() => setMode("follow"), []);

  const state: StoryState = {
    activeSceneId,
    mode,
    currentTime,
    readingY,
    position,
    pointIdx: position.idx,
  };

  return { state, registerSection, enterExplore, resumeStory, readTime };
}
