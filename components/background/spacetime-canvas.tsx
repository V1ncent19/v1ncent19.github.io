"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide spacetime backdrop (2026-09-05, mass-registry rework 2026-09-07).
 *
 * A faint square grid — spacetime — rendered on a fixed full-viewport canvas
 * behind all content. Masses pull grid vertices toward them with a
 * (1 − d/R)² falloff, so lines bend and densify near each mass like an
 * embedding diagram of gravity wells.
 *
 * Two kinds of mass:
 * - The pointer: a dynamic mass on a damped spring (gives the cursor
 *   "inertia" through curved spacetime).
 * - Static wells registered by page widgets via `registerStaticMass` —
 *   e.g. the About travel globe presses a deeper well into the grid so the
 *   mesh visibly bends around the planet. Registration/unregistration is
 *   reactive; wells are re-read every frame from getBoundingClientRect, so
 *   they follow layout and scroll for free.
 *
 * Everything tunable lives in CONFIG below — strength, radius, spring, grid
 * density, line colours per theme. Adjust there; no other file needs touching.
 *
 * Performance & accessibility contract:
 * - ~400–900 vertices; per-frame warp cost is O(vertices × masses) but each
 *   mass has a radius early-out, so 2–3 masses stay ≪ 1ms; DPR capped to
 *   avoid 4K overdraw; the rAF loop stops entirely once the spring settles
 *   and wakes on the next pointer move / scroll (static wells move during
 *   scroll even though the pointer doesn't).
 * - Touch / prefers-reduced-motion: draws the flat grid + current wells once,
 *   no loop, no pointer warp — pure static backdrop.
 * - No mass dot, no fill, no extra ornament: only the grid itself.
 */

/** ──────────────── 静态质量注册表 ────────────────
 * Page widgets (travel globe etc.) register an element as a fixed gravity
 * well. The well's centre is the element's centre, re-read every rendered
 * frame — it tracks layout, scroll and resize automatically. Keep wells few
 * (one per decorative widget); each adds one O(vertices) warp pass with a
 * radius early-out. */
export type StaticMass = {
  el: HTMLElement;
  strength: number;
  radius: number;
  softening: number;
};

const staticMasses = new Set<StaticMass>();
let onRegistryChange: (() => void) | null = null;

/** Register `el` as a static gravity well. Returns the unregister function
 * (call in the widget's effect cleanup). */
export function registerStaticMass(mass: StaticMass): () => void {
  staticMasses.add(mass);
  onRegistryChange?.();
  return () => {
    staticMasses.delete(mass);
    onRegistryChange?.();
  };
}

/** ──────────────── 维护接口：调整效果改这里 ──────────────── */
const CONFIG = {
  /** 网格外观 */
  GRID: {
    spacing: 16, // 静止时网格间距（px），越小越密
    lineWidth: 0.3, // 线宽
  },
  /** 质量（鼠标）行为 */
  MASS: {
    strength: 25, // 引力强度：顶点被拉向质量的最大位移（px）
    radius: 220, // 影响半径（px）：只扭曲质量周围这个范围内的网格
    softening: 48, // 软化长度（px）：质心附近位移 → 0，防止网格折叠出尖角
    spring: 0.2, // 弹性跟随系数 0~1：越小越"沉重"、跟随越慢
  },
  /** 颜色与深浅（保持很淡，勿喧宾夺主） */
  LOOK: {
    lineColorLight: "rgba(70, 80, 95, 0.09)", // 亮色主题网格色
    lineColorDark: "rgba(148, 163, 184, 0.07)", // 暗色主题网格色
    showMassDot: true, // 是否在质量处画一个点（默认关闭，纯网格）
  },
  /** 性能相关（一般不用动） */
  BEHAVIOR: {
    idleStopFrames: 60, // 弹簧静止多少帧后停掉渲染循环（60 ≈ 1 秒）
    maxDpr: 1.75, // devicePixelRatio 上限，防 4K 过度绘制
  },
} as const;

export function SpacetimeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = false;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let baseX = new Float32Array(0);
    let baseY = new Float32Array(0);
    let warpX = new Float32Array(0);
    let warpY = new Float32Array(0);
    // Mass position + spring target. Offscreen start = flat grid on load;
    // the first pointer move "places" the mass.
    let mx = -1e5;
    let my = -1e5;
    let tx = -1e5;
    let ty = -1e5;
    let idle = 0;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(hover: none)");
    const staticOnly = () => reduced.matches || coarse.matches;
    const strokeColor = () =>
      document.documentElement.classList.contains("dark")
        ? CONFIG.LOOK.lineColorDark
        : CONFIG.LOOK.lineColorLight;

    function layout() {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        CONFIG.BEHAVIOR.maxDpr,
      );
      // Size from the canvas's own box, not innerWidth/innerHeight — the two
      // can disagree by a scrollbar width, which would shear the warp off
      // the pointer position.
      const rect = canvas!.getBoundingClientRect();
      w = rect.width || window.innerWidth;
      h = rect.height || window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = CONFIG.GRID.spacing;
      cols = Math.ceil(w / s) + 2;
      rows = Math.ceil(h / s) + 2;
      const n = cols * rows;
      baseX = new Float32Array(n);
      baseY = new Float32Array(n);
      warpX = new Float32Array(n);
      warpY = new Float32Array(n);
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          baseX[k] = (i - 0.5) * s;
          baseY[k] = (j - 0.5) * s;
          k++;
        }
      }
    }

    type ActiveMass = {
      x: number;
      y: number;
      strength: number;
      radius: number;
      r2: number;
      softening: number;
    };

    /* Pointer mass (if placed) + every registered static well whose element
       is on screen. The canvas is fixed inset-0, so client coordinates ARE
       canvas coordinates — no offset arithmetic needed. */
    function gatherMasses(): ActiveMass[] {
      const out: ActiveMass[] = [];
      if (mx > -1e4)
        out.push({
          x: mx,
          y: my,
          strength: CONFIG.MASS.strength,
          radius: CONFIG.MASS.radius,
          r2: CONFIG.MASS.radius * CONFIG.MASS.radius,
          softening: CONFIG.MASS.softening,
        });
      for (const m of staticMasses) {
        const r = m.el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (
          r.bottom < -64 ||
          r.top > h + 64 ||
          r.right < -64 ||
          r.left > w + 64
        )
          continue;
        out.push({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          strength: m.strength,
          radius: m.radius,
          r2: m.radius * m.radius,
          softening: m.softening,
        });
      }
      return out;
    }

    function render() {
      const c = ctx!;
      const masses = gatherMasses();
      // Warp pass: pull each vertex toward every mass. Regularised potential:
      // d/√(d²+ε²) ramps displacement in smoothly from 0 at the centre (no
      // fold-over spikes), (1 − d/R)² decays it to 0 at the influence edge.
      // The hard cap pull ≤ 0.8·d guarantees a vertex can never cross a mass
      // even if the config is tuned aggressively.
      for (let k = 0; k < baseX.length; k++) {
        let x = baseX[k];
        let y = baseY[k];
        for (let mi = 0; mi < masses.length; mi++) {
          const m = masses[mi];
          const vx = m.x - x;
          const vy = m.y - y;
          const d2 = vx * vx + vy * vy;
          if (d2 < m.r2 && d2 > 1e-4) {
            const d = Math.sqrt(d2);
            const fall = 1 - d / m.radius;
            let pull =
              m.strength *
              (d / Math.sqrt(d2 + m.softening * m.softening)) *
              fall *
              fall;
            if (pull > d * 0.8) pull = d * 0.8;
            x += (vx / d) * pull;
            y += (vy / d) * pull;
          }
        }
        warpX[k] = x;
        warpY[k] = y;
      }
      // Draw pass: all rows then all columns as one stroked path.
      c.clearRect(0, 0, w, h);
      c.strokeStyle = strokeColor();
      c.lineWidth = CONFIG.GRID.lineWidth;
      c.beginPath();
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          if (i === 0) c.moveTo(warpX[k], warpY[k]);
          else c.lineTo(warpX[k], warpY[k]);
        }
      }
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const k = j * cols + i;
          if (j === 0) c.moveTo(warpX[k], warpY[k]);
          else c.lineTo(warpX[k], warpY[k]);
        }
      }
      c.stroke();
      if (CONFIG.LOOK.showMassDot) {
        c.beginPath();
        c.arc(mx, my, 3.5, 0, Math.PI * 2);
        c.fillStyle = strokeColor();
        c.fill();
      }
    }

    function frame() {
      mx += (tx - mx) * CONFIG.MASS.spring;
      my += (ty - my) * CONFIG.MASS.spring;
      render();
      if (Math.abs(tx - mx) < 0.15 && Math.abs(ty - my) < 0.15) {
        idle++;
        if (idle >= CONFIG.BEHAVIOR.idleStopFrames) {
          running = false;
          raf = 0;
          return; // spring settled — park the loop until the next move
        }
      } else {
        idle = 0;
      }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (staticOnly() || running) return;
      running = true;
      idle = 0;
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      // First ever move: snap the mass to the cursor so the well doesn't
      // sweep across the page from offscreen.
      if (mx < -1e4) {
        mx = tx;
        my = ty;
      }
      wake();
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        layout();
        render();
      }, 120);
    };

    /* Static wells ride with the content during scroll even though the
       pointer mass doesn't — re-render (or wake the loop) while scrolling.
       Coalesced to one render per frame. */
    let renderScheduled = false;
    const scheduleRender = () => {
      if (renderScheduled) return;
      renderScheduled = true;
      requestAnimationFrame(() => {
        renderScheduled = false;
        if (staticOnly()) render();
        else wake();
      });
    };
    const onScroll = () => {
      if (staticMasses.size > 0) scheduleRender();
    };
    /* Widgets may register/unregister wells at any time — refresh once. */
    onRegistryChange = scheduleRender;

    // Theme flips (.dark on <html>) repaint once with the new palette.
    const themeObserver = new MutationObserver(render);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    layout();
    render(); // flat grid visible immediately, even before any pointer move

    return () => {
      if (raf) cancelAnimationFrame(raf);
      running = false;
      window.clearTimeout(resizeTimer);
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (onRegistryChange === scheduleRender) onRegistryChange = null;
    };
  }, []);

  return (
    // h-full/w-full is REQUIRED: <canvas> is a replaced element, so
    // position:fixed + inset-0 alone leave it at its intrinsic bitmap size
    // (which scales with DPR and desynchronises the grid from the pointer).
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
