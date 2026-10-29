#!/usr/bin/env node
/**
 * Extract screen-crisp contour polylines from the local Terrarium DEM.
 * z13 provides a roughly 1800×1500 working grid over the trip area: detailed
 * enough for smooth 100 m contours without shipping a heavy z14 dataset.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZOOM = 13;
const TILE_SIZE = 256;
const SOURCE = path.join(ROOT, "public", "assets", "terrain", "guatemala", String(ZOOM));
const OUT = path.join(ROOT, "public", "assets", "terrain", "guatemala-contours.geojson");
const MIN_ELEVATION = 1200;
const MAX_ELEVATION = 4200;
const INTERVAL = 100;
const BLUR_SIGMA = 1.1;
const SIMPLIFY_TOLERANCE = 0.22;

const tileXs = fs.readdirSync(SOURCE, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => Number(entry.name)).sort((a, b) => a - b);
const tileYs = [...new Set(tileXs.flatMap(x => fs.readdirSync(path.join(SOURCE, String(x)))
  .filter(name => name.endsWith(".png")).map(name => Number(name.replace(/\.png$/, "")))))]
  .sort((a, b) => a - b);
const minX = tileXs[0];
const minY = tileYs[0];
const width = tileXs.length * TILE_SIZE;
const height = tileYs.length * TILE_SIZE;
const elevations = new Float32Array(width * height);

for (const tileX of tileXs) for (const tileY of tileYs) {
  const file = path.join(SOURCE, String(tileX), `${tileY}.png`);
  if (!fs.existsSync(file)) throw new Error(`Missing DEM tile ${file}`);
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const left = (tileX - minX) * TILE_SIZE;
  const top = (tileY - minY) * TILE_SIZE;
  for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) {
    const sourceIndex = (y * TILE_SIZE + x) * info.channels;
    elevations[(top + y) * width + left + x] = data[sourceIndex] * 256 +
      data[sourceIndex + 1] + data[sourceIndex + 2] / 256 - 32768;
  }
}

/**
 * Smooth the elevation field rather than merely blurring the rendered line.
 * The resulting paths remain genuine isolines of one coherent surface, while
 * pixel-scale DEM noise no longer turns every steep slope into a saw blade.
 */
function gaussianKernel(sigma) {
  const radius = Math.ceil(sigma * 3);
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let offset = -radius; offset <= radius; offset++) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[offset + radius] = weight;
    sum += weight;
  }
  for (let index = 0; index < kernel.length; index++) kernel[index] /= sum;
  return { kernel, radius };
}

function blurElevation(source, gridWidth, gridHeight, sigma) {
  const { kernel, radius } = gaussianKernel(sigma);
  const horizontal = new Float32Array(source.length);
  const result = new Float32Array(source.length);
  for (let y = 0; y < gridHeight; y++) for (let x = 0; x < gridWidth; x++) {
    let value = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const sampleX = Math.max(0, Math.min(gridWidth - 1, x + offset));
      value += source[y * gridWidth + sampleX] * kernel[offset + radius];
    }
    horizontal[y * gridWidth + x] = value;
  }
  for (let y = 0; y < gridHeight; y++) for (let x = 0; x < gridWidth; x++) {
    let value = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const sampleY = Math.max(0, Math.min(gridHeight - 1, y + offset));
      value += horizontal[sampleY * gridWidth + x] * kernel[offset + radius];
    }
    result[y * gridWidth + x] = value;
  }
  return result;
}

const contourElevations = blurElevation(elevations, width, height, BLUR_SIGMA);

function edgePoint(edge, x, y, level, values) {
  const interpolate = (a, b) => Math.max(0, Math.min(1, (level - a) / Math.max(1e-6, b - a)));
  const [tl, tr, br, bl] = values;
  if (edge === 0) return [x + interpolate(tl, tr), y];
  if (edge === 1) return [x + 1, y + interpolate(tr, br)];
  if (edge === 2) return [x + interpolate(bl, br), y + 1];
  return [x, y + interpolate(tl, bl)];
}

function pairsFor(mask, centerHigh) {
  switch (mask) {
    case 1: return [[3, 0]];
    case 2: return [[0, 1]];
    case 3: return [[3, 1]];
    case 4: return [[1, 2]];
    case 5: return centerHigh ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
    case 6: return [[0, 2]];
    case 7: return [[3, 2]];
    case 8: return [[2, 3]];
    case 9: return [[0, 2]];
    case 10: return centerHigh ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
    case 11: return [[1, 2]];
    case 12: return [[1, 3]];
    case 13: return [[0, 1]];
    case 14: return [[3, 0]];
    default: return [];
  }
}

function key(point) {
  return `${Math.round(point[0] * 1e5)},${Math.round(point[1] * 1e5)}`;
}

function stitch(segments) {
  const endpoints = new Map();
  segments.forEach((segment, index) => segment.forEach(point => {
    const k = key(point);
    const list = endpoints.get(k) ?? [];
    list.push(index);
    endpoints.set(k, list);
  }));
  const used = new Uint8Array(segments.length);
  const lines = [];
  const extend = (start, forward) => {
    const result = [];
    let cursor = start;
    while (true) {
      const candidates = endpoints.get(key(cursor)) ?? [];
      const next = candidates.find(index => !used[index]);
      if (next === undefined) break;
      used[next] = 1;
      const segment = segments[next];
      cursor = key(segment[0]) === key(cursor) ? segment[1] : segment[0];
      result.push(cursor);
    }
    return forward ? result : result.reverse();
  };
  segments.forEach((segment, index) => {
    if (used[index]) return;
    used[index] = 1;
    const before = extend(segment[0], false);
    const after = extend(segment[1], true);
    lines.push([...before, segment[0], segment[1], ...after]);
  });
  return lines;
}

function simplify(points, tolerance = 0.45) {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const a = points[first];
    const b = points[last];
    let best = 0;
    let bestIndex = -1;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const denom = dx * dx + dy * dy;
    for (let i = first + 1; i < last; i++) {
      const p = points[i];
      const t = denom ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denom)) : 0;
      const px = a[0] + dx * t;
      const py = a[1] + dy * t;
      const distance = (p[0] - px) ** 2 + (p[1] - py) ** 2;
      if (distance > best) { best = distance; bestIndex = i; }
    }
    if (bestIndex >= 0 && best > sqTolerance) {
      keep[bestIndex] = 1;
      stack.push([first, bestIndex], [bestIndex, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

/** One conservative corner-cutting pass. Chaikin stays inside each segment's
 * hull, so it softens grid-shaped bends without the overshoot of a spline. */
function smoothLine(points) {
  if (points.length < 3) return points;
  const closed = key(points[0]) === key(points[points.length - 1]);
  const base = closed ? points.slice(0, -1) : points;
  if (base.length < 3) return points;
  const result = closed ? [] : [base[0]];
  const pairs = closed ? base.length : base.length - 1;
  for (let index = 0; index < pairs; index++) {
    const a = base[index];
    const b = base[(index + 1) % base.length];
    result.push(
      [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
      [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75],
    );
  }
  if (closed) result.push(result[0]);
  else result.push(base[base.length - 1]);
  return result;
}

function lngLat(point) {
  const world = TILE_SIZE * 2 ** ZOOM;
  const globalX = minX * TILE_SIZE + point[0];
  const globalY = minY * TILE_SIZE + point[1];
  const lon = globalX / world * 360 - 180;
  const n = Math.PI * (1 - 2 * globalY / world);
  const lat = Math.atan(Math.sinh(n)) * 180 / Math.PI;
  return [Number(lon.toFixed(6)), Number(lat.toFixed(6))];
}

const features = [];
let totalLines = 0;
for (let level = MIN_ELEVATION; level <= MAX_ELEVATION; level += INTERVAL) {
  const segments = [];
  for (let y = 0; y < height - 1; y++) for (let x = 0; x < width - 1; x++) {
    const tl = contourElevations[y * width + x];
    const tr = contourElevations[y * width + x + 1];
    const br = contourElevations[(y + 1) * width + x + 1];
    const bl = contourElevations[(y + 1) * width + x];
    const values = [tl, tr, br, bl];
    const mask = (tl >= level ? 1 : 0) | (tr >= level ? 2 : 0) |
      (br >= level ? 4 : 0) | (bl >= level ? 8 : 0);
    const centerHigh = (tl + tr + br + bl) / 4 >= level;
    for (const [a, b] of pairsFor(mask, centerHigh)) {
      segments.push([edgePoint(a, x, y, level, values), edgePoint(b, x, y, level, values)]);
    }
  }
  const coordinates = stitch(segments)
    .map(line => smoothLine(simplify(line, SIMPLIFY_TOLERANCE)))
    .filter(line => line.length >= 2)
    .map(line => line.map(lngLat));
  totalLines += coordinates.length;
  features.push({
    type: "Feature",
    properties: { elevation: level, major: level % 500 === 0 ? 1 : 0 },
    geometry: { type: "MultiLineString", coordinates },
  });
}

fs.writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`[contours] ${features.length} levels, ${totalLines} lines, ${(fs.statSync(OUT).size / 1024).toFixed(1)} KiB`);
