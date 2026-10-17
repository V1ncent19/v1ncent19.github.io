#!/usr/bin/env node
/**
 * pilgrimage-map.mjs — assemble the page's data source: which composites are
 * shipped, where each was taken, and which anitabi pilgrimage point it matches.
 *
 *   node scripts/pilgrimage-map.mjs
 *   node scripts/pilgrimage-map.mjs --near-m 150
 *
 * INPUTS
 *   public/assets/pilgrimage/just-because/compare/*.webp   (the shipped tier)
 *   assets-src/travel-data/pilgrimage/photos.json          (position truth, git-ignored)
 *   content/travel/just-because/source/route.json          (sanitized track)
 *   content/travel/just-because/source/anitabi-212278.json (anitabi point snapshot)
 *
 * OUTPUT (committed)
 *   content/travel/just-because/page.json
 *
 * WHY IT IS DERIVED RATHER THAN HAND-WRITTEN
 *   The stop list has to stay in lockstep with what is actually on disk. If a
 *   composite is added or dropped, running this regenerates the list; the parts
 *   that ARE hand-authored — the trip overview, the closing note, and each
 *   stop's own caption — are preserved across runs by reading the previous
 *   output first and carrying those fields over.
 *
 * PRIVACY: the output only carries what the page renders — the composite's
 * pixel path, its capture time to the minute, and a rounded coordinate. The
 * full-precision EXIF positions stay in photos.json under assets-src/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  const v = i >= 0 ? argv[i + 1] : null;
  return v && !v.startsWith("--") ? v : fallback;
}

const COMPARE_DIR = path.resolve(
  root,
  arg("compare-dir", "public/assets/pilgrimage/just-because/compare"),
);
const PHOTOS_ABS = path.resolve(
  root,
  arg("photos", "assets-src/travel-data/pilgrimage/photos.json"),
);
/* Layout (2026-10-17): one directory per trip under content/travel/<id>/ —
   `<id>/page.json` is what the page imports, `<id>/source/` holds the inputs
   that generators read. These defaults keep the whole pipeline runnable with
   no flags; each is still overridable via --route / --points / --out. */
const ROUTE_ABS = path.resolve(
  root,
  arg("route", "content/travel/just-because/source/route.json"),
);
const POINTS_ABS = path.resolve(
  root,
  arg("points", "content/travel/just-because/source/anitabi-212278.json"),
);
const OUT_ABS = path.resolve(
  root,
  arg("out", "content/travel/just-because/page.json"),
);

/** Beyond this, the nearest anitabi point is not a match — leave it blank. */
const NEAR_M = Number(arg("near-m", "180"));

const rel = (p) => path.relative(root, p).replace(/\\/g, "/");

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

/** "2026-09-21T07:15:52+09:00" → "07:15" */
const hhmm = (iso) => (iso ? iso.slice(11, 16) : "");

/**
 * Where along the route a photo was taken, as an INDEX into
 * route.coordinates.
 *
 * This exists because the loop folds back on itself: the outbound leg passes
 * 藤沢駅 and the return leg passes it again, so "nearest vertex to the photo's
 * coordinate" is ambiguous and comes out NON-MONOTONIC (measured: the index
 * sequence ran 89→84→85→79→113→…→199→155→207, jumping backwards in the
 * middle). Drawing the bright line to a backwards index would make it visibly
 * retract, which is exactly the mismatch the owner flagged.
 *
 * Anchoring on TIME instead is both physically correct and monotonic: each
 * photo carries `shotAt`, the route carries per-vertex `offsets` (seconds
 * since the ride started), so the vertex whose offset is closest to the
 * photo's elapsed time is where the rider actually was. Verified on the real
 * data: 0 monotonic violations, median error ~10 s, and — unlike the spatial
 * method — it keeps the seven 藤沢駅-area shots at seven distinct indices
 * instead of collapsing them all onto the first pass.
 *
 * Returns { idx, dtSec } so the caller can report the residual; a large |dt|
 * means the rider was stationary through the shot, which is expected and fine.
 */
function routeIndexOf(shotAt, startedAtLocal, route) {
  const parse = (s) =>
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/.exec(String(s ?? ""));
  const a = parse(shotAt);
  const b = parse(startedAtLocal);
  if (!a || !b) return { idx: 0, dtSec: null };
  const epoch = (m) =>
    Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
  const dt = epoch(a) - epoch(b);

  const offs = route.offsets ?? [];
  if (offs.length < 2) return { idx: 0, dtSec: dt };
  // offsets are already ascending, so a linear scan finds the closest one.
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < offs.length; i++) {
    const d = Math.abs(offs[i] - dt);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return { idx: best, dtSec: Math.round(offs[best] - dt) };
}

async function main() {  for (const [label, abs] of [
    ["compare dir", COMPARE_DIR],
    ["photos.json", PHOTOS_ABS],
    ["route", ROUTE_ABS],
    ["anitabi snapshot", POINTS_ABS],
  ]) {
    if (!fs.existsSync(abs)) {
      console.error(`[map] ${label} not found: ${rel(abs)}`);
      process.exit(1);
    }
  }

  const photos = JSON.parse(fs.readFileSync(PHOTOS_ABS, "utf8")).photos ?? [];
  const byId = new Map(photos.map((p) => [p.id, p]));
  const route = JSON.parse(fs.readFileSync(ROUTE_ABS, "utf8"));
  const snap = JSON.parse(fs.readFileSync(POINTS_ABS, "utf8"));
  const points = (snap.points ?? []).filter((p) => p.lat != null && p.lon != null);

  /** Carry hand-authored prose across regenerations. */
  const prev = fs.existsSync(OUT_ABS)
    ? JSON.parse(fs.readFileSync(OUT_ABS, "utf8"))
    : null;
  const prevNotes = new Map(
    (prev?.stops ?? []).map((s) => [s.id, s.note ?? ""]),
  );

  const files = fs
    .readdirSync(COMPARE_DIR)
    .filter((f) => /\.webp$/i.test(f))
    .sort();

  /** The composites are NOT all the same shape — `img-2853` (the 正片海报复刻
   *  shot) is 1121×2160, every other one is 1920×2160. The page needs the real
   *  numbers, not a guess: the <img> reserves its box from them before the
   *  bytes arrive, and a wrong aspect ratio crops the picture instead of
   *  reserving the right space. Read once here, cached in the output. */
  const dims = new Map();
  for (const f of files) {
    try {
      const m = await sharp(path.join(COMPARE_DIR, f)).metadata();
      if (m.width && m.height) dims.set(f, { w: m.width, h: m.height });
    } catch (err) {
      console.warn(`[map] could not read size of ${f}: ${err.message}`);
    }
  }

  const stops = [];
  const orphans = [];
  const unmatched = [];

  for (const f of files) {
    const id = f.replace(/\.webp$/i, "");
    const ph = byId.get(id);
    if (!ph || ph.lat == null) {
      orphans.push({ f, id });
      continue;
    }
    // Nearest anitabi point, and the runner-up so the match can be sanity-checked.
    const ranked = points
      .map((p) => ({ p, d: dist(ph.lat, ph.lon, p.lat, p.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    const [n1, n2] = ranked;
    const matched = n1 && n1.d <= NEAR_M;
    if (!matched) unmatched.push({ id, d: n1 ? Math.round(n1.d) : null });

    // Where the rider was, time-anchored (see routeIndexOf for why not
    // spatially). Computed here rather than in the browser so the page never
    // ships the full track just to do this arithmetic at runtime.
    const { idx: routeIdx, dtSec } = routeIndexOf(
      ph.shotAt,
      route.startedAtLocal,
      route,
    );

    const dm = dims.get(f);

    stops.push({
      id,
      // What the page renders. Path is rooted at the site, not the repo.
      src: `/assets/pilgrimage/just-because/compare/${f}`,
      // Intrinsic pixel size, so the story column can reserve the right box.
      imgW: dm?.w ?? 1920,
      imgH: dm?.h ?? 2160,
      // Rounded to ~1 m — enough to place the pin, not enough to be a leak.
      lat: Number(ph.lat.toFixed(5)),
      lon: Number(ph.lon.toFixed(5)),
      time: hhmm(ph.shotAt),
      shotAt: ph.shotAt,
      /** index into route.coordinates where the bright line should end */
      routeIdx,
      /** seconds between this vertex's offset and the photo's own time */
      routeDtSec: dtSec,
      anitabi: matched
        ? {
            id: n1.p.id,
            name: n1.p.name,
            nameCn: n1.p.nameCn || "",
            ep: n1.p.ep ?? null,
            s: n1.p.s ?? null,
            distM: Math.round(n1.d),
          }
        : null,
      // Second-best, for the ambiguous ones — surfaced in the console only.
      _runnerUpM: n2 ? Math.round(n2.d) : null,
      note: prevNotes.get(id) ?? "",
    });
  }

  stops.sort((a, b) => a.shotAt.localeCompare(b.shotAt) || a.id.localeCompare(b.id));

  // The draw head must never move backwards as the reader scrolls forward, or
  // the bright line visibly retracts. Time-anchoring already gives monotonic
  // indices on the real data; this is the belt to that braces, in case a
  // future edit to the track or the photo set breaks that property.
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].routeIdx < stops[i - 1].routeIdx) {
      console.warn(
        `[map] routeIdx went backwards at ${stops[i].id} ` +
          `(${stops[i - 1].routeIdx} → ${stops[i].routeIdx}); clamping.`,
      );
      stops[i].routeIdx = stops[i - 1].routeIdx;
    }
  }

  const doc = {
    _note:
      "Rendered data for the Just Because! pilgrimage page. Derived by " +
      "scripts/pilgrimage-map.mjs — re-run it after adding/removing a composite. " +
      "`overview`, `outro` and every stop's `note` are hand-authored and preserved.",
    _generator: "scripts/pilgrimage-map.mjs",
    generatedAt: new Date().toISOString(),
    title: "Just Because! — 藤沢・镰仓",
    subtitle: "2026-09-21",
    // ── hand-authored, carried over on every re-run ────────────────────────
    overview: prev?.overview ?? {
      _placeholder: true,
      text: "",
    },
    outro: prev?.outro ?? {
      _placeholder: true,
      title: "",
      text: "",
    },
    // ── attribution: anitabi is CC BY-NC-SA 4.0, credit + link are required ─
    attribution: {
      text: "圣地巡礼点位与动画截图来自 Anitabi",
      href: snap.sourceURL ?? "https://anitabi.cn/map?bangumiId=212278",
      license: "CC BY-NC-SA 4.0",
      basemap: "地图底图 © OpenStreetMap contributors",
    },
    route: {
      date: route.date,
      startedAtLocal: route.startedAtLocal,
      endedAtLocal: route.endedAtLocal,
      durationSec: route.durationSec,
      pointCount: route.pointCount,
      // GeoJSON-ordered [lon, lat]
      coordinates: route.coordinates,
      offsets: route.offsets,
    },
    stops,
  };

  fs.mkdirSync(path.dirname(OUT_ABS), { recursive: true });
  fs.writeFileSync(OUT_ABS, `${JSON.stringify(doc, null, 2)}\n`);

  const first = stops[0];
  const last = stops[stops.length - 1];
  console.log(`[map] ${stops.length} stop(s) → ${rel(OUT_ABS)}`);
  if (first) console.log(`[map] first: ${first.time} ${first.id} (${rel(path.join(COMPARE_DIR, first.id + ".webp"))})`);
  if (last) console.log(`[map] last : ${last.time} ${last.id}`);
  const matchedCount = stops.filter((s) => s.anitabi).length;
  console.log(`[map] anitabi match: ${matchedCount}/${stops.length}`);
  const dts = stops.map((s) => Math.abs(s.routeDtSec ?? 0)).sort((a, b) => a - b);
  if (dts.length) {
    const med = dts[Math.floor(dts.length / 2)];
    console.log(
      `[map] route index anchored by time: median |dt| ${med}s, ` +
        `max ${dts[dts.length - 1]}s (stops the rider held still for), ` +
        `${stops[0].routeIdx}→${stops[stops.length - 1].routeIdx} of ${route.pointCount}`,
    );
  }
  const ambiguous = stops.filter(
    (s) => s.anitabi && s._runnerUpM != null && s._runnerUpM < s.anitabi.distM * 1.6,
  );
  if (ambiguous.length) {
    console.log(`[map]   ${ambiguous.length} with a close runner-up (worth an eyeball):`);
    for (const s of ambiguous.slice(0, 10)) {
      console.log(`         ${s.id}  ${s.anitabi.name} (${s.anitabi.distM} m) vs runner-up ${s._runnerUpM} m`);
    }
  }
  if (unmatched.length) {
    console.warn(`[map]   ${unmatched.length} stop(s) with no anitabi point within ${NEAR_M} m:`);
    for (const u of unmatched.slice(0, 10)) console.warn(`         ${u.id}  nearest ${u.d ?? "?"} m`);
  }
  if (orphans.length) {
    console.warn(`[map]   ${orphans.length} composite(s) with no position — dropped:`);
    for (const o of orphans.slice(0, 10)) console.warn(`         ${o.f}`);
  }
  if (doc.overview?._placeholder || doc.outro?._placeholder) {
    console.log("[map] note: overview/outro are still placeholders — write them in the JSON.");
  }
}

try {
  // `main` is async (it awaits sharp for each composite's true pixel size), so
  // the failure path has to be a promise rejection as well as a throw.
  await main();
} catch (err) {
  console.error(`[map] failed: ${err.message}`);
  process.exit(1);
}
