#!/usr/bin/env node
/**
 * anitabi-images.mjs — fetch the anime screenshots of a pilgrimage snapshot and
 * publish them as EXIF-free WebP under public/.
 *
 *   npm run anitabi:images
 *   node scripts/anitabi-images.mjs --points public/data/travel/just-because/anitabi-212278.json
 *   node scripts/anitabi-images.mjs --limit 3 --force        # smoke test
 *
 * WHY THESE ARE COMMITTED (unlike the shot photos)
 * ------------------------------------------------
 * A comparison pair is "your photo" + "the anime still". The still comes from a
 * third party, so the site must NOT depend on anitabi being up, and must not
 * hotlink their bandwidth on every page view. The stills are also small: all
 * 154 of them together are ~11 MB as JPEG, well under a tenth of the 701 MB of
 * shot originals. So they are downloaded once, re-encoded, and committed.
 * The shot originals instead stay local masters (see scripts/pilgrimage-derive.mjs).
 *
 * WHICH HOST, AND WHY NOT THE ONE IN THE SNAPSHOT'S DOCS
 * -----------------------------------------------------
 * Screenshots are served from the image CDN `img-tc.anitabi.cn` with the
 * `/images` prefix dropped: dataset path `/images/points/<id>/<pointId>.jpg`
 * → `https://img-tc.anitabi.cn/points/<id>/<pointId>.jpg`. The bare URL (no
 * `?plan=`) IS the full-size original. `?plan=` accepts h160 and h360 only —
 * h720/h1080/w640/raw all 404 (the originals are ~500 px tall, and upscaling is
 * refused). `api.anitabi.cn` is a dead end: a Cloudflare WAF rule 403s every
 * non-browser client, including a real headless Chrome (verified 2026-10-15).
 *
 * LICENSING: anitabi's point data and screenshots are CC BY-NC-SA 4.0. The
 * rendered page must credit anitabi and link `sourceURL` from the snapshot.
 * Re-hosting the stills here is within the licence for this non-commercial site
 * provided that attribution stays in place — do not remove it.
 *
 * OUTPUT
 *   <out>/{pointId}.webp            public, committed (default below)
 *   <cache>/{pointId}.jpg           raw download, git-ignored — makes re-runs offline
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
const flag = (name) => argv.includes(`--${name}`);

const POINTS = path.resolve(root, arg("points", "public/data/travel/just-because/anitabi-212278.json"));
const OUT_DIR = path.resolve(
  root,
  arg("out", "public/assets/photos/pilgrimage/just-because/anime"),
);
const CACHE_DIR = path.resolve(
  root,
  arg("cache", "assets-src/travel-data/anitabi-cache/images"),
);
const QUALITY = Number(arg("quality", "82"));
const CONCURRENCY = Math.max(1, Number(arg("concurrency", "4")));
/** "" = the full-size original; h160 / h360 are the only accepted downscales. */
const PLAN = arg("plan", "");
const LIMIT = Number(arg("limit", "0")); // 0 = all
const FORCE = flag("force");
const RETRIES = 2;

const CDN = "https://img-tc.anitabi.cn";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8",
  Referer: "https://www.anitabi.cn/",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Screenshot URL for one point — prefer the snapshot's, else rebuild from ids. */
function imageUrl(point) {
  const base =
    typeof point.image === "string" && /^https?:\/\//i.test(point.image)
      ? point.image
      : `${CDN}/points/${point.bangumiId}/${point.id}.jpg`;
  if (!PLAN) return base;
  return base.includes("?") ? `${base}&plan=${PLAN}` : `${base}?plan=${PLAN}`;
}

/** JPEG (FFD8) / PNG (8950) magic — a 200 with an HTML body means hotlink-blocked. */
function isImage(buf) {
  return (
    buf.length > 8 &&
    ((buf[0] === 0xff && buf[1] === 0xd8) || (buf[0] === 0x89 && buf[1] === 0x50))
  );
}

async function download(url, destAbs) {
  if (fs.existsSync(destAbs)) return fs.readFileSync(destAbs);
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await sleep(600 * attempt);
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        lastErr = new Error(`${res.status} ${res.statusText}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!isImage(buf)) {
        lastErr = new Error(
          `not an image (${res.headers.get("content-type")}, ${buf.length} B) — ` +
            "the CDN probably served a block page",
        );
        continue;
      }
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.writeFileSync(destAbs, buf);
      return buf;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function main() {
  if (!fs.existsSync(POINTS)) {
    console.error(`[anitabi-images] snapshot not found: ${POINTS}`);
    console.error("  run: npm run anitabi:snapshot -- --bangumi <subjectID>");
    process.exit(1);
  }
  const snap = JSON.parse(fs.readFileSync(POINTS, "utf8"));
  const all = Array.isArray(snap.points) ? snap.points : [];
  const bangumiId = snap.bangumiId ?? "";
  const points = (LIMIT > 0 ? all.slice(0, LIMIT) : all).map((p) => ({
    ...p,
    bangumiId,
  }));
  if (!points.length) {
    console.error(`[anitabi-images] no points in ${path.relative(root, POINTS)}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
  console.log(
    `[anitabi-images] ${points.length}/${all.length} points · ${snap.title ?? bangumiId}` +
      `${PLAN ? ` · plan=${PLAN}` : " · full size"}`,
  );
  console.log(`[anitabi-images] → ${rel(OUT_DIR)}/${"{pointId}"}.webp`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;
  const failures = [];
  let cursor = 0;

  async function worker() {
    while (cursor < points.length) {
      const p = points[cursor++];
      const outAbs = path.join(OUT_DIR, `${p.id}.webp`);
      const cacheAbs = path.join(CACHE_DIR, `${p.id}.jpg`);
      if (!FORCE && fs.existsSync(outAbs) && fs.existsSync(cacheAbs)) {
        bytes += fs.statSync(outAbs).size;
        skipped++;
        continue;
      }
      try {
        const raw = await download(imageUrl(p), cacheAbs);
        const info = await sharp(raw)
          .webp({ quality: QUALITY })
          .toFile(outAbs);
        bytes += info.size;
        done++;
        if (done % 25 === 0) console.log(`[anitabi-images]   … ${done} done`);
      } catch (err) {
        failed++;
        failures.push(`${p.id}: ${err.message}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, points.length) }, worker),
  );

  console.log(
    `[anitabi-images] ${done} downloaded · ${skipped} cached · ${failed} failed · ` +
      `${(bytes / 1024 / 1024).toFixed(1)} MB in ${rel(OUT_DIR)}`,
  );
  failures.slice(0, 10).forEach((f) => console.warn(`  ! ${f}`));
  if (failures.length > 10) console.warn(`  … and ${failures.length - 10} more`);
  if (failed) process.exit(1);
}

try {
  await main();
} catch (err) {
  console.error(`[anitabi-images] failed: ${err.message}`);
  process.exit(1);
}
