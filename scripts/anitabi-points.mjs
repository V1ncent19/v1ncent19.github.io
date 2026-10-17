#!/usr/bin/env node
/**
 * anitabi-points.mjs — one-time snapshot of anitabi.cn pilgrimage point data
 * for a bangumi subject.
 *
 *   npm run anitabi:snapshot -- --bangumi 212278
 *   node scripts/anitabi-points.mjs --bangumi 212278 --out public/data/travel/just-because/anitabi-212278.json
 *
 * WHY A SNAPSHOT AND NOT A LIVE FETCH
 * -----------------------------------
 * The site reads its data from a static, sharded JSON dataset, and that dataset
 * is what we snapshot — the result is committed and the site then reads only
 * the local file. That insulates us from anitabi changing or dropping the data,
 * and keeps the deployed site off anyone else's bandwidth.
 *
 * DO NOT USE api.anitabi.cn
 * ------------------------
 * The published docs (github.com/anitabi/anitabi.cn-document) point at
 * api.anitabi.cn, but that host is behind a Cloudflare WAF rule that rejects
 * every non-browser client — verified 2026-10-15: curl and Node fetch both get
 * an HTTP 403 block page, from a plain residential connection, and the rule
 * survives UA spoofing, Referer/Origin headers and HTTP/1.1. A headless Chrome
 * navigation is refused too. Do not spend time on it. The main site's dataset
 * below is unauthenticated, cacheable and works fine.
 *
 * DATASET SHAPE (undocumented; reverse-engineered 2026-10-15)
 * ----------------------------------------------------------
 *   https://www.anitabi.cn/d/g.json      all works, one array each:
 *        [0] bangumiId      [2] title (ja)     [3] title (zh)   [4] city
 *        [5] colour         [6] cover path     [7] rating       [8] type
 *        [9] centre lat     [10] centre lng    [11] zoom
 *        [12] PACKED COORDINATES — flat run of [pointId, lat, lng, ord]
 *        [16] icon path     [17] short code
 *      `g[0]` is the works array; `g[1]` and `g[2]` are dataset metadata.
 *   https://www.anitabi.cn/d/g0.json … g6.json   per-work point DETAIL, sharded
 *        over 7 files whose split is not stable — search all of them:
 *        [0] bangumiId   [1] theme [coverPath, [pointIds…], ts, w, h]
 *        [2] points[] — each [0] pointId, [1] name (ja), [2] name (zh),
 *            [4] Google-My-Maps doc id, [6] screenshot path,
 *            [8] episode (null = key visual), [9] second within episode,
 *            [10] episode label ("1話,2話")
 *      Coordinates live ONLY in g.json; names/screenshots ONLY in g*.json —
 *      they are joined on pointId here.
 *
 * LICENSING: anitabi's point data is shared under CC BY-NC-SA 4.0. Anything that
 * renders it must credit anitabi and link `sourceURL`. This snapshot keeps the
 * attribution fields so the renderer can comply.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://www.anitabi.cn/d/";
/** Dataset files the map page itself loads. The `?d=` token is a cache buster. */
const DATASET_VERSION = "qo8w";
const DETAIL_SHARDS = 7;

const argv = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  const v = i >= 0 ? argv[i + 1] : null;
  return v && !v.startsWith("--") ? v : fallback;
}

const BANGUMI = Number(arg("bangumi", "0"));

const HEADERS = {
  // Plain JSON over the main site host — no Cloudflare challenge here, but a
  // normal UA keeps us polite and future-proof.
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

async function getJSON(file, cacheDir) {
  const cached = cacheDir ? path.join(cacheDir, file) : null;
  if (cached && fs.existsSync(cached)) {
    return JSON.parse(fs.readFileSync(cached, "utf8"));
  }
  const url = `${BASE}${file}?d=${DATASET_VERSION}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(
      `GET ${url} → ${res.status} ${res.statusText}` +
        (res.status === 403
          ? "\n  → 403 from www.anitabi.cn is unexpected; the WAF block applies to\n" +
            "    api.anitabi.cn only. The dataset URL or version token may have moved."
          : ""),
    );
  }
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error(`GET ${url} → expected JSON, got HTML`);
  if (cached) {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    fs.writeFileSync(cached, text);
  }
  return JSON.parse(text);
}

/**
 * Image CDN. The dataset stores site-relative asset paths as `/images/…`, and
 * the site's frontend rewrites them onto this host with the `/images` prefix
 * dropped. NOTE: `https://www.anitabi.cn/images/…` is NOT a real path — that
 * host answers any unknown path with the SPA shell (HTTP 200 + text/html), so a
 * naive `origin + path` join silently yields 154 dead links. Verified
 * 2026-10-15 by capturing the map page's own image requests.
 */
const IMAGE_CDN = "https://img-tc.anitabi.cn";

function abs(p) {
  if (typeof p !== "string" || !p) return "";
  if (p.startsWith("/images/")) return `${IMAGE_CDN}${p.slice("/images".length)}`;
  if (p.startsWith("/")) return `https://www.anitabi.cn${p}`;
  return p;
}

/** g.json work record → metadata + packed coordinates. */
function readWork(work) {
  const coords = work[12];
  const points = [];
  if (Array.isArray(coords)) {
    for (let i = 0; i + 3 < coords.length; i += 4) {
      const lat = coords[i + 1];
      const lon = coords[i + 2];
      if (typeof coords[i] !== "string") continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      points.push({ id: coords[i], lat, lon });
    }
  }
  return {
    meta: {
      bangumiId: work[0],
      titleCn: work[1] || "",
      title: work[2] || "",
      titleZh: work[3] || "",
      city: work[4] || "",
      color: work[5] || "",
      cover: abs(work[6]),
      rating: Number.isFinite(work[7]) ? work[7] : null,
      type: work[8] || "",
      center: Number.isFinite(work[9]) && Number.isFinite(work[10]) ? [work[9], work[10]] : null,
      zoom: Number.isFinite(work[11]) ? work[11] : null,
      icon: abs(work[16]),
      code: work[17] || "",
    },
    points,
  };
}

/** A g*.json point record → attribution + episode info. */
function readDetail(p) {
  return {
    name: p[1] || "",
    nameCn: p[2] || "",
    mapsMid: typeof p[4] === "string" ? p[4] : "",
    image: abs(p[6]),
    ep: Number.isFinite(p[8]) ? p[8] : null,
    s: Number.isFinite(p[9]) ? p[9] : null,
    label: p[10] || "",
  };
}

async function main() {
  if (!Number.isFinite(BANGUMI) || BANGUMI <= 0) {
    console.error(
      "usage: node scripts/anitabi-points.mjs --bangumi <subjectID> [--out <file>] [--cache <dir>]",
    );
    console.error("  find the subjectID at https://bangumi.tv (Just Because! = 212278)");
    process.exit(1);
  }
  const outAbs = path.resolve(root, arg("out", `public/data/travel/just-because/anitabi-${BANGUMI}.json`));
  // Raw downloads are ~9 MB and carry no personal data, but they are throwaway —
  // default the cache under the git-ignored assets-src/travel-data/.
  const cacheDir = path.resolve(
    root,
    arg("cache", "assets-src/travel-data/anitabi-cache"),
  );

  console.log(`[anitabi] fetching dataset for bangumi ${BANGUMI} …`);
  const g = await getJSON("g.json", cacheDir);
  const works = Array.isArray(g?.[0]) ? g[0] : [];
  if (!works.length) throw new Error("g.json did not contain a works array at [0]");
  const work = works.find((w) => Array.isArray(w) && w[0] === BANGUMI);
  if (!work) {
    throw new Error(
      `bangumi ${BANGUMI} is not in the dataset (${works.length} works) — ` +
        "check the id, or the work may have no pilgrimage points yet",
    );
  }
  const { meta, points: coordPoints } = readWork(work);
  console.log(
    `[anitabi] ${meta.title}${meta.city ? ` · ${meta.city}` : ""} — ${coordPoints.length} points with coordinates`,
  );

  // Detail shard: the split across g0..g6 is not stable, so probe them all.
  let detailPoints = null;
  let shardUsed = null;
  for (let s = 0; s < DETAIL_SHARDS; s++) {
    const f = `g${s}.json`;
    let shard;
    try {
      shard = await getJSON(f, cacheDir);
    } catch (err) {
      console.warn(`[anitabi] ${f} unavailable (${err.message})`);
      continue;
    }
    const rec = Array.isArray(shard) ? shard.find((r) => Array.isArray(r) && r[0] === BANGUMI) : null;
    if (rec) {
      detailPoints = rec[2];
      shardUsed = f;
      break;
    }
  }

  const byId = new Map();
  if (Array.isArray(detailPoints)) {
    for (const p of detailPoints) byId.set(p[0], readDetail(p));
  } else {
    console.warn(
      "[anitabi] no detail shard carried this work — snapshot will lack names/screenshots",
    );
  }

  const points = coordPoints.map((c) => {
    const d = byId.get(c.id) ?? {};
    return {
      id: c.id,
      name: d.name ?? "",
      nameCn: d.nameCn ?? "",
      ep: d.ep ?? null,
      s: d.s ?? null,
      /** the episode list this point appears in, e.g. "1話,2話" */
      epLabel: d.label ?? "",
      lat: c.lat,
      lon: c.lon,
      /** anime screenshot for this point */
      image: d.image ?? "",
      /** provenance of the coordinate: the Google My Maps document it came from */
      mapsMid: d.mapsMid ?? "",
    };
  });
  byId.clear();

  const noImage = points.filter((p) => !p.image).length;
  const noName = points.filter((p) => !p.name).length;

  const snapshot = {
    _source:
      "anitabi.cn static dataset (www.anitabi.cn/d/g.json + g0..g6.json) — point data is " +
      "CC BY-NC-SA 4.0: credit anitabi and link `sourceURL` wherever it is rendered.",
    _generator: "scripts/anitabi-points.mjs",
    _caveat:
      "Coordinates come from the work record in g.json; names/screenshots from the detail " +
      "shard. Both are undocumented internals and may change shape without notice — which " +
      "is exactly why this file is committed rather than fetched at runtime.",
    fetchedAt: new Date().toISOString(),
    datasetVersion: typeof g?.[2] === "number" ? g[2] : null,
    ...meta,
    sourceURL: `https://anitabi.cn/map?bangumiId=${BANGUMI}`,
    detailShard: shardUsed,
    pointsLength: points.length,
    pointCount: points.length,
    withImage: points.length - noImage,
    points,
  };

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(`[anitabi] detail shard: ${shardUsed ?? "none"}`);
  console.log(`[anitabi] wrote ${path.relative(root, outAbs)}`);
  console.log(
    `         ${points.length} points · ${points.length - noImage} with a screenshot · ` +
      `${noName} without a name`,
  );
  const eps = {};
  for (const p of points) {
    const k = p.ep == null ? "key-visual" : `ep${p.ep}`;
    eps[k] = (eps[k] ?? 0) + 1;
  }
  const keys = Object.keys(eps).sort((a, b) => (a === "key-visual" ? -1 : Number(a.slice(2)) - Number(b.slice(2))));
  console.log(`         by episode: ${keys.map((k) => `${k}=${eps[k]}`).join(" ")}`);
}

try {
  await main();
} catch (err) {
  console.error(`[anitabi] failed: ${err.message}`);
  process.exit(1);
}
