"use client";

/**
 * About "travel globe" (2026-09-07) — the flat Mercator sheet of the travel
 * board re-imagined as a draggable orthographic globe.
 *
 * Canvas + d3-geo (geoOrthographic) over Natural Earth 110m land, fetched at
 * runtime from /assets/about/land-110m.json (vendored from the world-atlas
 * package; if the fetch fails the globe still renders as sphere + graticule).
 *
 * Interaction model (tuned in the .workbuddy/globe-proto prototype):
 * - One unified angular-velocity ω: a fling hands its speed to ω, which then
 *   eases (τ = SPIN_TAU) toward the idle drift AUTO_SPEED in the direction
 *   of the fling — no phase boundary between "inertia" and "auto spin", and
 *   no reverse-overshoot after a hard throw.
 * - Hovering (a dot or a checklist row via the shared hoverId) pauses the
 *   drift; leaving lets ω ease back in.
 * - prefers-reduced-motion: no auto drift, no breathing halos — the globe
 *   only moves when dragged.
 * - IntersectionObserver: the rAF loop keeps ticking only while the globe is
 *   on screen; while visible it re-renders every frame (the breathing halos
 *   are a continuous animation — ~29 small arcs, well under 0.5ms).
 *
 * Spacetime fusion: the wrapper registers itself with the site backdrop
 * (registerStaticMass) as a second, heavier gravity well — the warped grid
 * bends around the sphere and shows through the translucent ocean
 * (SEA_ALPHA). Theme colours are read from CSS custom properties and
 * re-read whenever the `dark` class flips, so both themes stay in sync.
 *
 * Accessibility: purely decorative — aria-hidden; the checklists beside it
 * carry the data, and hover sync is bidirectional through the parent's
 * hoverId (globe hit-test ⇄ list rows).
 */

import { useEffect, useRef } from "react";
import {
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, MultiPolygon } from "geojson";
import type { Topology } from "topojson-specification";
import { registerStaticMass } from "@/components/background/spacetime-canvas";

/** ──────────────── 维护接口：调整效果改这里 ──────────────── */
const CONFIG = {
  /** Natural Earth 110m land (TopoJSON), vendored from world-atlas */
  LAND_URL: "/assets/about/land-110m.json",
  /** idle drift speed (deg/s) — direction follows the last fling */
  AUTO_SPEED: 3.5,
  /** ease time constant (ms) from fling speed → drift speed */
  SPIN_TAU: 1500,
  /** fling clamp (deg/s) */
  FLING_MAX: 420,
  /** ocean translucency 0–1 — lower = more spacetime grid shows through */
  SEA_ALPHA: 0.75,
  /** gravity well this globe presses into the spacetime backdrop */
  WELL: { strength: 120, radius: 800, softening: 100 },
  /** pointer hit radius for dot tooltips (px) */
  HIT_PX: 18,
  /** gap between sphere edge and canvas edge (px) */
  PAD: 8,
  MAX_DPR: 2,
  /** marker halo treatment — ports the old flat sheet's world-map-pulse
   *  keyframes verbatim (2.6s, scale 0.9→2.7, opacity 0.55→0 within the
   *  first 55%, points staggered ~17% of a period) */
  BREATH: {
    /** soft glow base radius / centre alpha (under every marker) */
    GLOW_R: 7,
    GLOW_A: 0.2,
    /** breathing halo: base radius, max scale, start alpha */
    HALO_R0: 5.5,
    HALO_SCALE: 2.7,
    HALO_A: 0.55,
    /** period (ms), fade-out end (fraction of period), per-point stagger */
    PERIOD: 2600,
    FADE_END: 0.55,
    STAGGER: 0.173,
  },
  /** hover ring — instead of popping in, the ring slips onto the marker:
   *  it starts at FROM (larger) and eases down to R while fading in
   *  (IN_MS), and reverses outward on leave (OUT_MS) */
  HOT: { R: 6.5, FROM: 15, LINE: 1.6, IN_MS: 240, OUT_MS: 200 },
  /** wishlist pulse — the wish counterpart of the visited ping: a soft
   *  dashed ring expands out of the marker and fades, same period/stagger
   *  family as BREATH (shares its clock so pings interleave) */
  WISH_PULSE: { R0: 5.5, R1: 13, A: 0.4, FADE_END: 0.6 },
} as const;

export type GlobePoint = {
  /** join key shared with the checklist rows ("v3" / "w1") */
  id: string;
  lat: number;
  lon: number;
  kind: "visited" | "wish";
  name: string;
  year: number | null;
};

type Palette = {
  sea: string;
  land: string;
  landLine: string;
  graticule: string;
  outline: string;
  visited: string;
  wish: string;
};

const hexRgbCache = new Map<string, string>();
function hexRgb(hex: string): string | null {
  const cached = hexRgbCache.get(hex);
  if (cached) return cached;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const rgb = `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
  hexRgbCache.set(hex, rgb);
  return rgb;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    (cs.getPropertyValue(name) || "").trim() || fallback;
  const rgba = (hex: string, a: number, fallback: string) => {
    const rgb = hexRgb(hex);
    return rgb ? `rgba(${rgb}, ${a})` : fallback;
  };
  return {
    // Translucent ocean: the site's spacetime grid (rendered behind all
    // content) shows through and reads as "bent around the planet".
    sea: rgba(v("--surface", "#ffffff"), CONFIG.SEA_ALPHA, "rgba(255,255,255,0.75)"),
    land: v("--surface-sink", "#e9eff2"),
    landLine: v("--line", "#d7e1e7"),
    graticule: rgba(v("--line", "#d7e1e7"), 0.55, "rgba(0,0,0,0.08)"),
    outline: v("--line", "#d7e1e7"),
    visited: v("--travel-visited", "#1ba7c9"),
    wish: v("--travel-wish", "#e8590c"),
  };
}

export function TravelGlobe({
  points,
  hotId,
  onHover,
}: {
  points: GlobePoint[];
  /** shared hover join id — set by the checklist rows or by this globe */
  hotId: string | null;
  onHover: (id: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  /* latest props for the imperative loop (no re-subscribe on hover churn);
     synced in an effect — React forbids ref writes during render */
  const propsRef = useRef({ points, hotId, onHover });
  useEffect(() => {
    propsRef.current = { points, hotId, onHover };
  });

  const hotPoint = hotId
    ? (points.find((p) => p.id === hotId) ?? null)
    : null;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const tipEl = tipRef.current!; // non-null assertion: TS narrowing does
    if (!wrap || !canvas || !tipEl) return; // not survive into the closures below
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let size = 0;
    let dpr = 1;
    /* start centred on East Asia */
    const rotation = [-105, -32];
    let omega = 0; // deg/s, signed
    let driftDir = 1;
    let dragging = false;
    let raf = 0;
    let lastT = 0;
    let inView = true;
    let dirty = true;
    let palette = readPalette();
    let landFc: FeatureCollection<MultiPolygon> | null = null;
    /* hover-ring animation progress per point id: 0 = absent, 1 = settled */
    const hotProg = new Map<string, number>();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const graticule = geoGraticule10();
    const projection = geoOrthographic().clipAngle(90);
    const path = geoPath(projection, ctx);
    const SPHERE = { type: "Sphere" } as GeoPermissibleObjects;

    const radius = () => size / 2 - CONFIG.PAD;
    const sens = () => 75 / Math.max(60, radius()); // deg per px of drag

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      const s = Math.floor(Math.min(rect.width, rect.height));
      if (s < 10 || s === size) return;
      size = s;
      dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    }

    function render() {
      const c = ctx!;
      const r = radius();
      if (r < 10) return;
      projection
        .scale(r)
        .rotate([rotation[0], rotation[1], 0])
        .translate([size / 2, size / 2]);

      c.clearRect(0, 0, size, size);
      c.beginPath();
      path(SPHERE);
      c.fillStyle = palette.sea;
      c.fill();
      c.beginPath();
      path(graticule as GeoPermissibleObjects);
      c.strokeStyle = palette.graticule;
      c.lineWidth = 0.5;
      c.stroke();
      if (landFc) {
        c.beginPath();
        path(landFc as GeoPermissibleObjects);
        c.fillStyle = palette.land;
        c.fill();
        c.strokeStyle = palette.landLine;
        c.lineWidth = 0.6;
        c.stroke();
      }
      c.beginPath();
      path(SPHERE);
      c.strokeStyle = palette.outline;
      c.lineWidth = 1;
      c.stroke();

      /* markers — backside dots fade out near the horizon instead of
         vanishing. Layer stack mirrors the old flat sheet exactly:
         soft glow base → breathing halo (visited; expand & fade, phases
         staggered so the pings don't flash in unison) / expanding dashed
         pulse (wish, same clock) → core symbol (visited solid dot /
         wishlist dashed ring) → hover ring (animated: slips onto the
         marker from outside, eases back out on leave).
         Per-frame cost: ~29 gradients+arcs, well under 0.5ms. */
      const { points: pts, hotId: hot } = propsRef.current;
      const centre: [number, number] = [-rotation[0], -rotation[1]];
      const now = performance.now();
      const B = CONFIG.BREATH;
      let tipX = 0;
      let tipY = 0;
      let tipOn = false;
      pts.forEach((p, i) => {
        const ang = geoDistance([p.lon, p.lat], centre);
        if (ang > Math.PI / 2 + 0.05) return;
        const xy = projection([p.lon, p.lat]);
        if (!xy) return;
        const fade =
          ang > Math.PI / 2 - 0.35
            ? Math.max(0, 1 - (ang - (Math.PI / 2 - 0.35)) / 0.4)
            : 1;
        const accent = p.kind === "visited" ? palette.visited : palette.wish;
        const rgb = hexRgb(accent);
        /* soft static glow base — a radial gradient gives the old blurred
           circle's feathered look without a per-frame canvas filter */
        if (rgb) {
          const g = c.createRadialGradient(xy[0], xy[1], 0, xy[0], xy[1], B.GLOW_R);
          g.addColorStop(0, `rgba(${rgb}, ${B.GLOW_A * fade})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          c.fillStyle = g;
          c.beginPath();
          c.arc(xy[0], xy[1], B.GLOW_R, 0, Math.PI * 2);
          c.fill();
        }
        if (p.kind === "visited") {
          /* breathing halo — the old world-map-pulse: expand 0.9×→2.7×
             while fading 0.55→0 inside the first 55% of the period, then
             rest; `i * STAGGER` reproduces the old negative delays */
          if (!reduced.matches) {
            const ph = (now / B.PERIOD + i * B.STAGGER) % 1;
            if (ph < B.FADE_END) {
              const k = ph / B.FADE_END;
              c.beginPath();
              c.arc(
                xy[0],
                xy[1],
                B.HALO_R0 * (0.9 + (B.HALO_SCALE - 0.9) * k),
                0,
                Math.PI * 2,
              );
              c.fillStyle = `rgba(${rgb ?? "27,167,201"}, ${B.HALO_A * (1 - k) * fade})`;
              c.fill();
            }
          }
          c.globalAlpha = fade;
          c.beginPath();
          c.arc(xy[0], xy[1], 3.1, 0, Math.PI * 2);
          c.fillStyle = accent;
          c.fill();
        } else {
          /* wishlist symbol: static dashed halo + dashed core, plus a soft
             expanding dashed pulse — the wish counterpart of the visited
             ping, sharing the BREATH clock (and stagger) so the pings
             interleave instead of flashing in unison */
          c.globalAlpha = 0.45 * fade;
          c.beginPath();
          c.arc(xy[0], xy[1], 5.2, 0, Math.PI * 2);
          c.strokeStyle = accent;
          c.lineWidth = 1;
          c.setLineDash([2.2, 1.8]);
          c.stroke();
          c.globalAlpha = fade;
          c.beginPath();
          c.arc(xy[0], xy[1], 3.1, 0, Math.PI * 2);
          c.lineWidth = 1.4;
          c.stroke();
          if (!reduced.matches) {
            const W = CONFIG.WISH_PULSE;
            const ph = (now / B.PERIOD + i * B.STAGGER) % 1;
            if (ph < W.FADE_END) {
              const k = ph / W.FADE_END;
              c.globalAlpha = W.A * (1 - k) * fade;
              c.beginPath();
              c.arc(
                xy[0],
                xy[1],
                W.R0 + (W.R1 - W.R0) * k,
                0,
                Math.PI * 2,
              );
              c.lineWidth = 1;
              c.stroke();
            }
          }
          c.setLineDash([]);
        }
        /* hover ring — animated "slips onto the marker": starts at FROM and
           eases down to R (easeOutCubic) while fading in; on leave it
           reverses outward. The tooltip lands as the ring settles. */
        const prog = hotProg.get(p.id) ?? 0;
        if (prog > 0.002) {
          const e = 1 - Math.pow(1 - prog, 3);
          c.globalAlpha = fade * e;
          c.beginPath();
          c.arc(
            xy[0],
            xy[1],
            CONFIG.HOT.FROM + (CONFIG.HOT.R - CONFIG.HOT.FROM) * e,
            0,
            Math.PI * 2,
          );
          c.strokeStyle = accent;
          c.lineWidth = CONFIG.HOT.LINE;
          c.stroke();
          c.globalAlpha = 1;
        }
        if (p.id === hot && prog > 0.55) {
          tipX = xy[0];
          tipY = xy[1];
          tipOn = true;
        }
        c.globalAlpha = 1;
      });
      tipEl.style.opacity = tipOn ? "1" : "0";
      if (tipOn) {
        tipEl.style.left = `${tipX}px`;
        tipEl.style.top = `${tipY}px`;
      }
    }

    function tick(t: number) {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, lastT ? t - lastT : 16);
      lastT = t;
      if (!dragging) {
        /* unified ω model: fling decays INTO the drift, a still globe spins
           up gently — one continuous motion, no phase boundary. Hovering
           (dot or list row) eases the target to zero; leaving recovers. */
        const hovering =
          propsRef.current.hotId !== null || tipEl.style.opacity === "1";
        const target =
          !reduced.matches && inView && !hovering
            ? CONFIG.AUTO_SPEED * driftDir
            : 0;
        omega += (target - omega) * (1 - Math.exp(-dt / CONFIG.SPIN_TAU));
        if (Math.abs(omega) > 0.005) {
          rotation[0] += (omega * dt) / 1000;
          dirty = true;
        }
      }
      /* breathing halos animate per-frame, so while the globe is on screen
         and motion is allowed the canvas stays alive (the drift above is a
         no-op while hovering; halos alone keep it ticking) */
      if (!reduced.matches && inView) dirty = true;
      /* hover-ring progress: ease toward the target each frame (instant
         under reduced motion). Runs even when out of view? No — frozen
         off-screen is fine, it resumes on return. */
      if (inView) {
        const { points: pts, hotId: hot } = propsRef.current;
        for (const p of pts) {
          const target = p.id === hot ? 1 : 0;
          const cur = hotProg.get(p.id) ?? 0;
          if (cur === target) continue;
          if (reduced.matches) {
            hotProg.set(p.id, target);
          } else {
            const step = dt / (target ? CONFIG.HOT.IN_MS : CONFIG.HOT.OUT_MS);
            hotProg.set(
              p.id,
              target ? Math.min(1, cur + step) : Math.max(0, cur - step),
            );
          }
          dirty = true;
        }
      }
      if (dirty) {
        dirty = false;
        render();
      }
    }

    /* ---- pointer: drag / fling / hover hit-test ---- */
    let lastX = 0;
    let lastY = 0;
    let samples: { t: number; dx: number }[] = [];
    let globeHover: string | null = null;

    const setGlobeHover = (id: string | null) => {
      if (globeHover === id) return;
      globeHover = id;
      propsRef.current.onHover(id);
    };

    const hitTest = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const centre: [number, number] = [-rotation[0], -rotation[1]];
      let best: string | null = null;
      let bestD: number = CONFIG.HIT_PX;
      for (const p of propsRef.current.points) {
        if (geoDistance([p.lon, p.lat], centre) > Math.PI / 2) continue;
        const xy = projection([p.lon, p.lat]);
        if (!xy) continue;
        const d = Math.hypot(xy[0] - px, xy[1] - py);
        if (d < bestD) {
          bestD = d;
          best = p.id;
        }
      }
      setGlobeHover(best);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      omega = 0;
      samples = [];
      lastX = e.clientX;
      lastY = e.clientY;
      canvas!.setPointerCapture(e.pointerId);
      canvas!.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        const k = sens();
        rotation[0] += dx * k;
        rotation[1] = Math.max(-90, Math.min(90, rotation[1] - dy * k));
        const now = performance.now();
        samples.push({ t: now, dx });
        while (samples.length > 1 && now - samples[0].t > 110) samples.shift();
        dirty = true;
      } else {
        hitTest(e);
      }
    };
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      canvas!.style.cursor = "grab";
      /* fling: recent drag samples → angular velocity; the drift direction
         follows the throw so the globe never reverses after letting go */
      const now = performance.now();
      let dxSum = 0;
      for (const s of samples) if (now - s.t <= 110) dxSum += s.dx;
      const span = samples.length > 1 ? now - samples[0].t : 80;
      const speed = span > 16 ? ((dxSum * sens()) / span) * 1000 : 0;
      omega = Math.max(-CONFIG.FLING_MAX, Math.min(CONFIG.FLING_MAX, speed));
      if (Math.abs(omega) > 2) driftDir = omega > 0 ? 1 : -1;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (canvas!.hasPointerCapture(e.pointerId))
        canvas!.releasePointerCapture(e.pointerId);
      endDrag();
    };
    const onPointerLeave = () => {
      if (!dragging) setGlobeHover(null);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    /* ---- visibility / size / theme ---- */
    const ro = new ResizeObserver(() => {
      resize();
      dirty = true;
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((en) => en.isIntersecting);
      },
      { rootMargin: "80px" },
    );
    io.observe(wrap);
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      dirty = true;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    /* ---- spacetime fusion: register as a static gravity well ---- */
    const unregister = registerStaticMass({
      el: wrap,
      strength: CONFIG.WELL.strength,
      radius: CONFIG.WELL.radius,
      softening: CONFIG.WELL.softening,
    });

    /* ---- land data (graceful fallback: sphere + graticule only) ---- */
    let alive = true;
    fetch(CONFIG.LAND_URL)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Topology>;
      })
      .then((topo) => {
        if (!alive) return;
        landFc = feature(topo, topo.objects.land) as unknown as FeatureCollection<MultiPolygon>;
        dirty = true;
      })
      .catch(() => {
        /* keep the graticule-only globe */
      });

    resize();
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      unregister();
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      onMouseLeave={() => onHover(null)}
      className="relative mx-auto aspect-square w-[min(80%,26rem)] select-none"
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="h-full w-full touch-none rounded-full"
        style={{ cursor: "grab" }}
      />
      {/* Place-name tooltip — always mounted; the render loop positions it
          at the hot dot and toggles opacity (shared .map-tip treatment). */}
      <span
        ref={tipRef}
        className="map-tip ui-text rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink shadow-md"
        style={{ opacity: 0 }}
      >
        {hotPoint?.name}
        {hotPoint?.year ? (
          <span className="ml-1.5 text-muted tabular-nums">
            {hotPoint.year}
          </span>
        ) : null}
      </span>
    </div>
  );
}
