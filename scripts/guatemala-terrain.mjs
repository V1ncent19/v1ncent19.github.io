#!/usr/bin/env node
/** Download the small Terrarium DEM pyramid used by the Guatemala log. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "assets", "terrain", "guatemala");
const BOUNDS = { west: -91.0107421875, south: 14.34954783718537, east: -90.615234375, north: 14.689881366618769 };
const MIN_ZOOM = 8;
const MAX_ZOOM = 14;
const FORCE = process.argv.includes("--force");

function tile(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const rad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n);
  return { x, y };
}

const jobs = [];
for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
  const nw = tile(BOUNDS.west, BOUNDS.north, z);
  const se = tile(BOUNDS.east, BOUNDS.south, z);
  for (let x = nw.x; x <= se.x; x++) for (let y = nw.y; y <= se.y; y++) jobs.push({ z, x, y });
}

let cursor = 0;
let downloaded = 0;
let reused = 0;
async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    const dest = path.join(OUT, String(job.z), String(job.x), `${job.y}.png`);
    if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 100) { reused++; continue; }
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${job.z}/${job.x}/${job.y}.png`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) throw new Error(`Not PNG: ${url}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    downloaded++;
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
fs.writeFileSync(path.join(OUT, "attribution.txt"),
  "Terrain Tiles (Mapzen, a Linux Foundation project) via the Registry of Open Data on AWS.\nhttps://registry.opendata.aws/terrain-tiles/\n");
console.log(`[terrain] ${downloaded} downloaded, ${reused} reused, ${jobs.length} tiles total`);
