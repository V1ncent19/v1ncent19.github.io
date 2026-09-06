/**
 * Build-time badge inliner (2026-09-06, user-confirmed plan B).
 *
 * Source of truth: `public/assets/gallery/badges/`
 *  - `badge-frame.svg`  the shared stamp frame (two rings), inlined into every
 *                       composed badge so there is exactly ONE place to edit it;
 *  - `<key>.svg`        icon-only artwork (NO baked-in rings), one file per
 *                       badge key used in `content/gallery/items.json`.
 *
 * Each file's ROOT presentation attributes (stroke-width, linecap, linejoin,
 * …) are preserved onto a wrapping <g>, because inlining strips the <svg>
 * root. Everything keeps `stroke="currentColor"` so the composed badge is
 * tinted by CSS (tile accent / hover / dark mode).
 *
 * AUTO-FIT (2026-09-06 user request): icons are measured geometrically (path
 * sampling incl. arcs, circle/rect/polygon shapes, rotate/matrix transforms)
 * and, when any ink falls outside the inner solid ring (r = 38, minus the
 * ring stroke and a small gap), the icon is scaled about (50,50) to fit.
 * Stroke width is divided by the scale so the authored ink WEIGHT stays
 * uniform across the whole set. Icons already inside the ring are untouched
 * (never upscaled).
 *
 * Output: `components/gallery/badge-art.generated.ts` — committed to the repo;
 * rerun via `npm run badges` (also wired as a `prebuild`/`predev` hook).
 * The script also cross-checks items.json badge keys and warns about keys
 * without a matching file (those render the placeholder at runtime).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const BADGES_DIR = "public/assets/gallery/badges";
const ITEMS_JSON = "content/gallery/items.json";
const OUT_FILE = "components/gallery/badge-art.generated.ts";
const FRAME_KEY = "badge-frame.svg";

/* Ring geometry: inner circle r=38 stroke 2.4 → ink inner edge 36.8.
 * Fit target keeps the icon's ink OUTER edge (incl. half stroke) inside
 * 36.8 with a 1.2 gap. */
const RING_INNER_EDGE = 36.8;
const FIT_GAP = 1.2;

/** Root attributes worth carrying onto the wrapping <g>. */
const KEEP_ATTRS = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
];

/* --------------------------------------------------------------------------
 * Geometry engine — enough SVG for measuring these icons: paths (M L H V C S
 * Q T A Z, absolute+relative, implicit repeats, arc flags), basic shapes and
 * rotate / translate / scale / matrix transforms.
 * ------------------------------------------------------------------------ */

const IDENT = [1, 0, 0, 1, 0, 0];

function matMul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function applyMat(m, x, y, out) {
  out.push(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]);
}

function parseTransformAttr(str) {
  let m = IDENT;
  const re = /(translate|scale|rotate|matrix)\s*\(([^)]*)\)/g;
  for (const [, name, raw] of str.matchAll(re)) {
    const a = raw.trim().split(/[\s,]+/).map(Number);
    let t;
    if (name === "translate") t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (name === "scale")
      t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (name === "rotate") {
      const rad = ((a[0] || 0) * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const cx = a[1] || 0, cy = a[2] || 0;
      t = matMul(matMul([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    } else t = a; // matrix
    m = matMul(m, t);
  }
  return m;
}

/** Endpoint-to-center arc conversion (SVG spec F.6.5) + sampling. */
function arcPoints(x1, y1, rx, ry, phiDeg, fA, fS, x2, y2, m, pts) {
  if (!rx || !ry) { applyMat(m, x1, y1, pts); applyMat(m, x2, y2, pts); return; }
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180;
  const cosP = Math.cos(phi), sinP = Math.sin(phi);
  const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
  const x1p = cosP * dx2 + sinP * dy2;
  const y1p = -sinP * dx2 + cosP * dy2;
  const lr = x1p ** 2 / rx ** 2 + y1p ** 2 / ry ** 2;
  if (lr > 1) { const f = Math.sqrt(lr); rx *= f; ry *= f; }
  const num = rx ** 2 * ry ** 2 - rx ** 2 * y1p ** 2 - ry ** 2 * x1p ** 2;
  const den = rx ** 2 * y1p ** 2 + ry ** 2 * x1p ** 2;
  let co = Math.sqrt(Math.max(0, num / den));
  if (fA === fS) co = -co;
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
  const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTh = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fS && dTh > 0) dTh -= 2 * Math.PI;
  if (fS && dTh < 0) dTh += 2 * Math.PI;
  const STEPS = 16;
  for (let i = 0; i <= STEPS; i++) {
    const t = th1 + (dTh * i) / STEPS;
    applyMat(m, cx + rx * Math.cos(t), cy + ry * Math.sin(t), pts);
  }
}

function cubicAt(p0, p1, p2, p3, t, m, pts) {
  const u = 1 - t;
  const x = u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0];
  const y = u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1];
  applyMat(m, x, y, pts);
}

/** Sample a path's d attribute into transformed points. */
function samplePath(d, m0, pts) {
  // Split into commands; numbers may run together (e.g. "1.5-.5", arc flags).
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)/g;
  const tokens = [];
  for (const m of d.matchAll(re)) tokens.push(m[1] ? { c: m[1] } : { n: parseFloat(m[2]) });

  let i = 0;
  const nextNum = () => tokens[i++]?.n ?? 0;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let prevC = null, prevQ = null;
  let m = m0;

  const reflect = (p, c) => [2 * c[0] - p[0], 2 * c[1] - p[1]];

  while (i < tokens.length) {
    if (tokens[i].c) {
      var cmd = tokens[i++].c;
    } else {
      // implicit repeat: M→L, m→l, others repeat
      cmd = cmd === "M" ? "L" : cmd === "m" ? "l" : cmd;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === "Z") {
      applyMat(m, sx, sy, pts);
      cx = sx; cy = sy; prevC = prevQ = null;
      continue;
    }
    // consume parameter groups
    for (;;) {
      if (C === "M" || C === "L") {
        if (i + 2 > tokens.length || tokens[i].c) break;
        const x = nextNum(), y = nextNum();
        const nx = rel ? cx + x : x, ny = rel ? cy + y : y;
        if (C === "M") { sx = nx; sy = ny; applyMat(m, nx, ny, pts); }
        else applyMat(m, nx, ny, pts); // L
        cx = nx; cy = ny; prevC = prevQ = null;
      } else if (C === "H" || C === "V") {
        if (i + 1 > tokens.length || tokens[i].c) break;
        const v = nextNum();
        const nx = C === "H" ? (rel ? cx + v : v) : cx;
        const ny = C === "V" ? (rel ? cy + v : v) : cy;
        applyMat(m, nx, ny, pts);
        cx = nx; cy = ny; prevC = prevQ = null;
      } else if (C === "C" || C === "S" || C === "Q" || C === "T") {
        const need = C === "C" ? 6 : C === "S" || C === "Q" ? 4 : 2;
        if (i + need > tokens.length || tokens[i].c) break;
        const raw = [];
        for (let k = 0; k < need; k++) raw.push(nextNum());
        const abs = (v, base) => (rel ? base + v : v);
        let p1, p2;
        const p0 = [cx, cy], p3 = [abs(raw[raw.length - 2], cx), abs(raw[raw.length - 1], cy)];
        if (C === "C") {
          p1 = [abs(raw[0], cx), abs(raw[1], cy)];
          p2 = [abs(raw[2], cx), abs(raw[3], cy)];
        } else if (C === "S") {
          p1 = prevC ? reflect(prevC[1], p0) : p0;
          p2 = [abs(raw[0], cx), abs(raw[1], cy)];
        } else if (C === "Q") {
          p1 = [abs(raw[0], cx), abs(raw[1], cy)];
          p2 = p1;
        } else { // T
          p1 = prevQ ? reflect(prevQ[0], p0) : p0;
          p2 = p1;
        }
        for (let k = 1; k <= 12; k++) cubicAt(p0, p1, p2, p3, k / 12, m, pts);
        prevC = C === "C" || C === "S" ? [p1, p2] : null;
        prevQ = C === "Q" || C === "T" ? [p1] : null;
        cx = p3[0]; cy = p3[1];
      } else if (C === "A") {
        // rx ry rot fA fS x y — flags are SINGLE characters, may be unspaced
        if (i + 7 > tokens.length) break;
        const rx = nextNum(), ry = nextNum(), rot = nextNum();
        const fA = nextNum(), fS = nextNum();
        const x = nextNum(), y = nextNum();
        arcPoints(cx, cy, rx, ry, rot, fA ? 1 : 0, fS ? 1 : 0, rel ? cx + x : x, rel ? cy + y : y, m, pts);
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        prevC = prevQ = null;
      } else break;
      if (i >= tokens.length || tokens[i].c) break;
      if (C === "M") cmd = "L";
      else if (C === "m") cmd = "l";
    }
  }
}

/** Collect transformed sample points for every shape in an SVG fragment. */
function collectPoints(markup) {
  const pts = [];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const stack = [IDENT];
  let m = IDENT;
  for (const match of markup.matchAll(tagRe)) {
    const [, closing, tag, rawAttrs] = match;
    const attrs = {};
    for (const a of rawAttrs.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2];
    if (tag === "g" || tag === "svg") {
      if (closing) { stack.pop(); m = stack[stack.length - 1]; }
      else {
        const next = attrs.transform ? matMul(m, parseTransformAttr(attrs.transform)) : m;
        stack.push(next); m = next;
      }
      continue;
    }
    if (closing) continue;
    const n = (v, d = 0) => parseFloat(attrs[v]) || d;
    switch (tag) {
      case "path": if (attrs.d) samplePath(attrs.d, m, pts); break;
      case "circle": case "ellipse": {
        const rx = tag === "circle" ? n("r") : n("rx");
        const ry = tag === "circle" ? n("r") : n("ry");
        for (let k = 0; k < 24; k++) {
          const t = (k / 24) * 2 * Math.PI;
          applyMat(m, n("cx") + rx * Math.cos(t), n("cy") + ry * Math.sin(t), pts);
        }
        break;
      }
      case "rect":
        applyMat(m, n("x"), n("y"), pts);
        applyMat(m, n("x") + n("width"), n("y"), pts);
        applyMat(m, n("x"), n("y") + n("height"), pts);
        applyMat(m, n("x") + n("width"), n("y") + n("height"), pts);
        break;
      case "line":
        applyMat(m, n("x1"), n("y1"), pts);
        applyMat(m, n("x2"), n("y2"), pts);
        break;
      case "polygon": case "polyline":
        (attrs.points || "").match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g)?.forEach((v, idx, arr) => {
          if (idx % 2 === 0 && arr[idx + 1] !== undefined) applyMat(m, parseFloat(v), parseFloat(arr[idx + 1]), pts);
        });
        break;
    }
  }
  return pts;
}

/* --------------------------------------------------------------------------
 * Inlining helpers
 * ------------------------------------------------------------------------ */

/** Resolve <use href="#id"> references by inlining the referenced element
 *  (wrapped in a <g> carrying the use's own attrs, e.g. transform), then drop
 *  <defs> blocks. This makes every badge self-contained — no ids ever survive
 *  inlining, so per-page duplication is impossible and defs/use artwork
 *  (e.g. cherry-blossom petals) keeps working. Two passes cover nesting. */
function resolveUses(markup) {
  for (let pass = 0; pass < 2; pass++) {
    const defs = new Map();
    for (const m of markup.matchAll(
      /<([a-zA-Z][\w-]*)([^>]*\bid="([^"]+)"[^>]*)(?:\/>|>([\s\S]*?)<\/\1>)/g,
    )) {
      // keep the FULL element markup (works for self-closing defs too),
      // minus the id that would collide after inlining
      defs.set(m[3], m[0].replace(/\s+id="[^"]*"/, ""));
    }
    if (!defs.size) return markup.replace(/<defs>[\s\S]*?<\/defs>\s*/g, "");
    let used = false;
    markup = markup.replace(
      /<use\b([^>]*)\/>/g,
      (_, attrsRaw) => {
        const href = attrsRaw.match(/(?:href|xlink:href)="([^"]+)"/)?.[1] ?? "";
        const target = defs.get(href.replace(/^#/, ""));
        if (target === undefined) return "<g></g>";
        used = true;
        const rest = attrsRaw
          .replace(/\s(?:href|xlink:href)="[^"]*"/g, "")
          .trim();
        return `<g ${rest}>${target}</g>`;
      },
    );
    markup = markup.replace(/<defs>[\s\S]*?<\/defs>\s*/g, "");
    if (!used) return markup;
  }
  return markup;
}

/** Strip prolog/comments and the <svg> root; keep inner markup (ids dropped —
 *  the same frame is inlined into many badges per page, so ids would dupe). */
function innerMarkup(svgText) {
  return resolveUses(
    svgText
      .replace(/<\?[\s\S]*?\?>/g, "")
      .replace(/<!DOCTYPE[\s\S]*?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<svg\b[^>]*>/, "")
      .replace(/<\/svg>\s*$/, ""),
  )
    .replace(/\s(id|class)="[^"]*"/g, "")
    .trim();
}

function rootAttrValue(svgText, attr) {
  const root = svgText.match(/<svg\b([^>]*)>/)?.[1] ?? "";
  return root.match(new RegExp(`\\b${attr}="([^"]*)"`))?.[1];
}

/** Extract whitelisted presentation attributes from an <svg …> root tag. */
function rootAttrs(svgText) {
  const kept = [];
  for (const attr of KEEP_ATTRS) {
    const v = rootAttrValue(svgText, attr);
    if (v !== undefined) kept.push(`${attr}="${v}"`);
  }
  return kept.join(" ");
}

/**
 * Auto-fit: scale about (50,50) so every ink point (plus half the rendered
 * stroke) stays inside the inner ring with a small gap. Returns null when the
 * icon already fits. Stroke width is compensated by the caller.
 */
function fitScale(svgText) {
  const pts = collectPoints(innerMarkup(svgText));
  if (!pts.length) return null;
  let maxR = 0;
  for (let k = 0; k < pts.length; k += 2)
    maxR = Math.max(maxR, Math.hypot(pts[k] - 50, pts[k + 1] - 50));
  const w = parseFloat(rootAttrValue(svgText, "stroke-width")) || 4;
  const budget = RING_INNER_EDGE - FIT_GAP;
  // s·maxR + w/2 ≤ budget  →  iterate (w is divided by s for compensation)
  let s = Math.min(1, budget / maxR);
  for (let k = 0; k < 4; k++) s = Math.min(1, (budget - w / (2 * s)) / maxR);
  if (!Number.isFinite(s) || s >= 0.999) return null;
  return { s, maxR };
}

/** Wrap inner markup in a <g> carrying the root's presentation attributes. */
function wrapGroup(svgText) {
  const attrs = rootAttrs(svgText);
  const inner = innerMarkup(svgText);
  return attrs ? `<g ${attrs}>${inner}</g>` : `<g>${inner}</g>`;
}

/* --------------------------------------------------------------------------
 * Main
 * ------------------------------------------------------------------------ */

const files = readdirSync(BADGES_DIR).filter((f) => f.endsWith(".svg"));
if (!files.includes(FRAME_KEY)) {
  console.error(`✗ ${FRAME_KEY} not found in ${BADGES_DIR}/ — cannot build badges.`);
  process.exit(1);
}

const frame = wrapGroup(readFileSync(join(BADGES_DIR, FRAME_KEY), "utf8"));
const art = {};
const report = [];
for (const file of files) {
  if (file === FRAME_KEY) continue;
  const key = basename(file, ".svg");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) {
    console.warn(`⚠ Skipping "${file}": key must be lowercase kebab-case.`);
    continue;
  }
  const text = readFileSync(join(BADGES_DIR, file), "utf8");
  const fit = fitScale(text);
  let group = wrapGroup(text);
  if (fit) {
    const { s } = fit;
    const off = 50 * (1 - s);
    group = group.replace(
      /^<g /,
      `<g transform="translate(${off.toFixed(3)} ${off.toFixed(3)}) scale(${s.toFixed(4)})" `,
    );
    // compensate stroke so the authored ink weight survives the scaling
    group = group.replace(/\bstroke-width="([\d.]+)"/, (_, v) =>
      `stroke-width="${(parseFloat(v) / s).toFixed(2)}"`,
    );
    report.push(`  ${key.padEnd(20)} scale ${s.toFixed(2)}  (ink radius ${fit.maxR.toFixed(1)} → ${(fit.maxR * s).toFixed(1)})`);
  }
  art[key] = group;
}
if (report.length) console.log(`auto-fit (scaled to fit the inner ring):\n${report.join("\n")}`);

// Cross-check items.json so a stale/misspelled key surfaces at build time.
try {
  const items = JSON.parse(readFileSync(ITEMS_JSON, "utf8"));
  const used = new Set(
    (Array.isArray(items) ? items : []).map((it) => it.badge).filter(Boolean),
  );
  for (const key of used) {
    if (!art[key]) console.warn(`⚠ items.json uses badge "${key}" but ${BADGES_DIR}/${key}.svg is missing — it will render the placeholder.`);
  }
  const unused = Object.keys(art).filter((k) => !used.has(k));
  if (unused.length) {
    console.log(`ℹ ${unused.length} badge file(s) not yet referenced in items.json: ${unused.join(", ")}`);
  }
} catch {
  console.warn(`⚠ Could not read ${ITEMS_JSON} for key cross-check.`);
}

const lines = [
  "/**",
  " * GENERATED by `scripts/build-badges.mjs` — do not edit by hand.",
  " * Sources: public/assets/gallery/badges/*.svg (badge-frame.svg + icons).",
  " * Rerun `npm run badges` after adding or changing badge artwork.",
  " */",
  "",
  "/** Shared stamp frame (two rings) — inlined from badge-frame.svg. */",
  `export const BADGE_FRAME = ${JSON.stringify(frame)};`,
  "",
  "/** Icon-only artwork per badge key, each wrapped with its root attrs. */",
  "export const BADGE_ART: Record<string, string> = {",
  ...Object.entries(art).map(([k, v], idx, arr) =>
    `  ${JSON.stringify(k)}: ${JSON.stringify(v)}${idx < arr.length - 1 ? "," : ""}`,
  ),
  "};",
  "",
];
writeFileSync(OUT_FILE, lines.join("\n"));
console.log(`✓ ${OUT_FILE} written (${Object.keys(art).length} badges + frame).`);
