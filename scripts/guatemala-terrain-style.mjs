#!/usr/bin/env node
/**
 * Derive a quiet monochrome paper surface from the lossless
 * Terrarium DEM. The original DEM remains the source for MapLibre's 3D mesh;
 * vector contours are generated separately by guatemala-contours.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "public", "assets", "terrain", "guatemala");
const OUT = path.join(ROOT, "public", "assets", "terrain", "guatemala-tint");
const FORCE = process.argv.includes("--force");
const STOPS = [
  [0, [239, 240, 237]],
  [1400, [236, 237, 234]],
  [1900, [232, 233, 230]],
  [2500, [228, 229, 226]],
  [3100, [223, 224, 221]],
  [3500, [218, 219, 216]],
  [3900, [212, 213, 210]],
  [4500, [205, 207, 204]],
];

function colour(elevation) {
  let a = STOPS[0];
  let b = STOPS.at(-1);
  for (let i = 1; i < STOPS.length; i++) {
    if (elevation <= STOPS[i][0]) { a = STOPS[i - 1]; b = STOPS[i]; break; }
  }
  const t = Math.max(0, Math.min(1, (elevation - a[0]) / Math.max(1, b[0] - a[0])));
  return a[1].map((value, i) => Math.round(value + (b[1][i] - value) * t));
}

const files = [];
for (const zEntry of fs.readdirSync(SOURCE, { withFileTypes: true })) {
  if (!zEntry.isDirectory() || !/^\d+$/.test(zEntry.name)) continue;
  for (const xEntry of fs.readdirSync(path.join(SOURCE, zEntry.name), { withFileTypes: true })) {
    if (!xEntry.isDirectory()) continue;
    for (const name of fs.readdirSync(path.join(SOURCE, zEntry.name, xEntry.name))) {
      if (name.endsWith(".png")) files.push({ z: Number(zEntry.name), x: xEntry.name, name });
    }
  }
}

let written = 0;
let reused = 0;
for (const file of files) {
  const src = path.join(SOURCE, String(file.z), file.x, file.name);
  const dest = path.join(OUT, String(file.z), file.x, file.name.replace(/\.png$/, ".webp"));
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) { reused++; continue; }
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const elevations = new Float32Array(info.width * info.height);
  for (let i = 0; i < elevations.length; i++) {
    elevations[i] = data[i * info.channels] * 256 + data[i * info.channels + 1] + data[i * info.channels + 2] / 256 - 32768;
  }
  const rgb = Buffer.alloc(info.width * info.height * 3);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = y * info.width + x;
    const base = colour(elevations[i]);
    rgb[i * 3] = base[0];
    rgb[i * 3 + 1] = base[1];
    rgb[i * 3 + 2] = base[2];
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 82, effort: 5 }).toFile(dest);
  written++;
}
console.log(`[terrain-style] ${written} written, ${reused} reused`);
