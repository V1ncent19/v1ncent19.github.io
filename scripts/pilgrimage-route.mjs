#!/usr/bin/env node
/**
 * pilgrimage-route.mjs — cut the Fujisawa pilgrimage loop out of the year-long
 * phone GPS export and emit a SHIPPABLE, sanitized route.
 *
 *   node scripts/pilgrimage-route.mjs
 *   node scripts/pilgrimage-route.mjs --from 2026-09-21T06:43 --to 2026-09-21T09:12
 *
 * INPUT (git-ignored, NEVER published)
 *   assets-src/travel-data/gps/2026.01.01-2026.12.31.csv
 *       The raw whole-year export. Columns:
 *       dataTime,locType,longitude,latitude,heading,accuracy,speed,distance,
 *       isBackForeground,stepType,altitude
 *       `dataTime` is a UNIX epoch in **UTC seconds**; the trip happened in JST,
 *       so all wall-clock filtering here is done with a fixed +09:00 offset.
 *
 * OUTPUT (committed — this is the only route data the site ships)
 *   public/data/travel/just-because/route.json
 *
 * PRIVACY CONTRACT
 *   This is the whole reason the script exists. The raw file holds a whole
 *   year of home-address-level movement, so:
 *     1. only points inside a tight Fujisawa bounding box are considered, and
 *     2. of those, only the requested time window is kept, and
 *     3. every field except longitude/latitude is DROPPED — no accuracy, no
 *        speed, no heading, no altitude, no stepType. Timestamps are reduced to
 *        seconds-since-start (a relative offset), never absolute wall clock.
 *   The output therefore cannot be used to reconstruct where the owner lives or
 *   when exactly they were anywhere else. Do not weaken these three rules.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  const v = i >= 0 ? argv[i + 1] : null;
  return v && !v.startsWith("--") ? v : fallback;
}

const SRC_ABS = path.resolve(
  root,
  arg("src", "assets-src/travel-data/gps/2026.01.01-2026.12.31.csv"),
);
const OUT_ABS = path.resolve(
  root,
  arg("out", "public/data/travel/just-because/route.json"),
);

/**
 * The trip's bounding box, in Fujisawa / Kamakura. Deliberately tight: anything
 * outside it is by definition not part of this walk and must never be shipped.
 */
const BOX = {
  latMin: Number(arg("lat-min", "35.29")),
  latMax: Number(arg("lat-max", "35.35")),
  lonMin: Number(arg("lon-min", "139.47")),
  lonMax: Number(arg("lon-max", "139.54")),
};

/**
 * Window, as a JST wall clock. Defaults bracket the whole loop: set off from
 * Kamakura-Kōkō-Mae at 06:44, got back at 09:12. Note the photos only span
 * 06:50–08:53 of it — the head and tail of the loop legitimately have no stop.
 */
const FROM_JST = arg("from", "2026-09-21T06:40");
const TO_JST = arg("to", "2026-09-21T09:15");
const JST_OFFSET_S = 9 * 3600;

const jstToEpoch = (naive) => {
  // "2026-09-21T06:40" read as if UTC, then backed off by the +09:00 offset.
  const m = String(naive).match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!m) throw new Error(`bad time (want YYYY-MM-DDTHH:MM): ${naive}`);
  const [, Y, Mo, D, H, Mi, S = "0"] = m;
  return (
    Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S) / 1000 - JST_OFFSET_S
  );
};

const jst = (epoch) =>
  new Date((epoch + JST_OFFSET_S) * 1000).toISOString().replace("T", " ").slice(0, 19);

/** haversine, metres */
const R = 6371000;
function dist(lat1, lon1, lat2, lon2) {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function main() {
  if (!fs.existsSync(SRC_ABS)) {
    console.error(`[route] raw GPS export not found: ${path.relative(root, SRC_ABS)}`);
    console.error("  it lives under assets-src/ (git-ignored) and is never shipped.");
    process.exit(1);
  }
  const t0 = jstToEpoch(FROM_JST);
  const t1 = jstToEpoch(TO_JST);

  const lines = fs.readFileSync(SRC_ABS, "utf8").split(/\r?\n/);
  const head = lines[0].split(",");
  const iT = head.indexOf("dataTime");
  const iLat = head.indexOf("latitude");
  const iLon = head.indexOf("longitude");
  if (iT < 0 || iLat < 0 || iLon < 0) {
    console.error(`[route] unexpected header: ${head.join(",")}`);
    process.exit(1);
  }

  let total = 0;
  let inBox = 0;
  const pts = [];
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const c = line.split(",");
    const t = +c[iT];
    const lat = +c[iLat];
    const lon = +c[iLon];
    if (!Number.isFinite(t) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    total += 1;
    if (
      lat < BOX.latMin ||
      lat > BOX.latMax ||
      lon < BOX.lonMin ||
      lon > BOX.lonMax
    )
      continue;
    inBox += 1;
    if (t < t0 || t > t1) continue;
    // THE ALLOW-LIST. Only these two values leave the script.
    pts.push({ t, lat, lon });
  }
  pts.sort((a, b) => a.t - b.t);

  if (!pts.length) {
    console.error("[route] nothing matched — widen the box or the window?");
    console.error(`        box: ${JSON.stringify(BOX)}  window: ${FROM_JST} → ${TO_JST} (JST)`);
    process.exit(1);
  }

  const start = pts[0].t;
  const coordinates = pts.map((p) => [
    Number(p.lon.toFixed(6)),
    Number(p.lat.toFixed(6)),
  ]);
  const offsets = pts.map((p) => p.t - start);

  // Track stats for the console report only — nothing here is shipped.
  let length = 0;
  let maxGap = 0;
  for (let i = 1; i < pts.length; i += 1) {
    length += dist(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon);
    maxGap = Math.max(maxGap, pts[i].t - pts[i - 1].t);
  }

  const doc = {
    _note:
      "Sanitized Fujisawa pilgrimage loop (Just Because!). Only lon/lat and a " +
      "relative time offset are kept; the year-long phone export it was cut " +
      "from stays under assets-src/ and is never published.",
    _generator: "scripts/pilgrimage-route.mjs",
    _license: "Route traced from personal GPS; basemap © OpenStreetMap contributors.",
    generatedAt: new Date().toISOString(),
    date: "2026-09-21",
    tzOffset: "+09:00",
    // ISO start of the walk, JST — enough to say "we set off at 06:44" on the
    // page; the per-point absolute times are NOT shipped, only the offsets.
    startedAtLocal: jst(start),
    endedAtLocal: jst(pts[pts.length - 1].t),
    durationSec: pts[pts.length - 1].t - start,
    pointCount: pts.length,
    // [lon, lat] pairs, GeoJSON order, ready for a LineString.
    coordinates,
    // seconds since start, index-aligned with `coordinates`
    offsets,
  };

  fs.mkdirSync(path.dirname(OUT_ABS), { recursive: true });
  fs.writeFileSync(OUT_ABS, `${JSON.stringify(doc)}\n`);

  console.log(
    `[route] scanned ${total} rows · ${inBox} in box · ${pts.length} in window`,
  );
  console.log(
    `[route] ${jst(start)} → ${jst(pts[pts.length - 1].t)} JST  ` +
      `(${(doc.durationSec / 3600).toFixed(2)} h, ${(length / 1000).toFixed(2)} km traced)`,
  );
  console.log(`[route] largest sampling gap: ${maxGap}s`);
  console.log(
    `[route] wrote ${path.relative(root, OUT_ABS).replace(/\\/g, "/")} — ` +
      `${pts.length} points, ${(fs.statSync(OUT_ABS).size / 1024).toFixed(1)} KB`,
  );
  console.log("[route] shipped fields: coordinates (lon/lat) + relative offsets only.");
}

try {
  main();
} catch (err) {
  console.error(`[route] failed: ${err.message}`);
  process.exit(1);
}
