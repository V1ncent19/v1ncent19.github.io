#!/usr/bin/env node
/**
 * pilgrimage-photos.mjs — lift every pilgrimage photo's position + capture time
 * into a sidecar table BEFORE any compositing happens.
 *
 *   npm run pilgrimage:photos -- --dir "<photo dir>" \
 *        --points content/travel/just-because/source/anitabi-212278.json
 *
 * WHY THIS STEP EXISTS
 * --------------------
 * The online "巡礼对比图生成器" (lab.magiconch.com/image-merge/) composites a
 * real photo with the matching anime frame and exports a FLAT bitmap — the EXIF
 * block (GPS + capture time) is dropped in that step. That is only a problem if
 * the composite is treated as the data carrier. It should not be. This script
 * records the truth exactly once, up front; afterwards the composite's missing
 * metadata is irrelevant and the composite only has to be nameable back to a
 * photo id.
 *
 * Two outputs:
 *   1. photos.json   — { id, file, shotAt, shotAtLocal, tzOffset, lat, lon } per
 *                      photo, sorted by time. THE single source of truth for
 *                      position. `shotAt` is full ISO-8601 including the capture
 *                      offset read from EXIF (e.g. 2026-09-21T06:50:39+09:00).
 *   2. a review CSV  — pre-filled when --points is given: every photo paired
 *                      with its nearest anitabi points (by distance) so the
 *                      matching worksheet only has to be CONFIRMED, not typed
 *                      from scratch. Blank columns at the end are for you:
 *                      `chosen_anitabi_id`, `composite_file`, `status`.
 *
 * PRIVACY: the output holds personal capture coordinates, so the default
 * destination is assets-src/travel-data/ — which is git-ignored. Keep it there.
 * Only the derived, curated pilgrimage.json should ever reach public/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import exifr from "exifr";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE_RE = /\.(jpe?g|png|heic|heif|webp|tiff?)$/i;
/** haversine radius */
const EARTH_R = 6371000;

const argv = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  const v = i >= 0 ? argv[i + 1] : null;
  return v && !v.startsWith("--") ? v : fallback;
}

const SRC_DIR = arg("dir");
const DEFAULT_OUT = "assets-src/travel-data/pilgrimage/photos.json";
const OUT_ABS = path.resolve(root, arg("out", DEFAULT_OUT));
const POINTS_ABS = arg("points") ? path.resolve(root, arg("points")) : null;
const WORKSHEET_ABS = path.resolve(
  root,
  arg("worksheet", path.join(path.dirname(OUT_ABS), "pilgrimage-review.csv")),
);
/** A photo whose nearest anitabi point is further than this is not treated as
 *  a pilgrimage match — it is probably just an unrelated photo in the folder.
 *  200 m is generous enough for GPS error and shooting from across the street. */
const NEAR_M = Number(arg("near-m", "200"));

/* ------------------------------------------------------------------ helpers */

function slugifyId(file) {
  const base = path.basename(file).replace(/\.[^.]+$/, "");
  const id = base
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "photo";
}

function uniqueId(file, taken) {
  const base = slugifyId(file);
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  const id = `${base}-${n}`;
  taken.add(id);
  return id;
}

/**
 * EXIF DateTimeOriginal → naive wall-clock ISO ("YYYY-MM-DDTHH:MM:SS").
 *
 * EXIF stores the capture time as a bare wall clock; the zone it was written in
 * lives in a SEPARATE tag (OffsetTimeOriginal, e.g. "+09:00"). exifr hands back
 * a Date built from those wall-clock digits interpreted in the machine's own
 * zone, so reading the local calendar fields gives the wall clock back verbatim
 * — do that, and never let the runtime shift the value.
 */
function toNaiveIso(value) {
  const p = (n) => String(n).padStart(2, "0");
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return (
      `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}` +
      `T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`
    );
  }
  const m = String(value ?? "").match(
    /(\d{4})[-:](\d{2})[-:](\d{2})[T ](\d{2}):(\d{2}):(\d{2})/,
  );
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : "";
}

/**
 * EXIF OffsetTimeOriginal ("+09:00") — the zone the wall clock was written in.
 * iOS writes it next to DateTimeOriginal; when it is absent the capture time is
 * ambiguous, so the caller flags it rather than silently assuming UTC.
 */
function tzOffsetOf(parsed) {
  const raw = parsed?.OffsetTimeOriginal ?? parsed?.OffsetTime ?? "";
  if (typeof raw !== "string") return "";
  const m = raw.trim().match(/^([+-])(\d{2}):?(\d{2})$/);
  return m ? `${m[1]}${m[2]}:${m[3]}` : "";
}

async function exifMeta(fileAbs) {
  try {
    const parsed = await exifr.parse(fileAbs, {
      gps: true,
      exif: true,
      iptc: false,
      xmp: false,
      icc: false,
    });
    const lat =
      typeof parsed?.latitude === "number"
        ? parsed.latitude
        : typeof parsed?.gps?.latitude === "number"
          ? parsed.gps.latitude
          : null;
    const lon =
      typeof parsed?.longitude === "number"
        ? parsed.longitude
        : typeof parsed?.gps?.longitude === "number"
          ? parsed.gps.longitude
          : null;
    const make = parsed?.Make ?? parsed?.make ?? "";
    const model = parsed?.Model ?? parsed?.model ?? "";
    const shotAtLocal = toNaiveIso(parsed?.DateTimeOriginal);
    const tzOffset = tzOffsetOf(parsed);
    return {
      // Full ISO-8601 WITH the capture offset, so downstream code (sorting,
      // timeline scrubbing, "was this shot before or after that") never has to
      // guess a zone. 2026-09-21T06:50:39+09:00, not a bare wall clock.
      shotAt: shotAtLocal ? `${shotAtLocal}${tzOffset}` : "",
      shotAtLocal,
      tzOffset,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      camera: String(`${make} ${model}`).trim(),
    };
  } catch {
    return { shotAt: "", shotAtLocal: "", tzOffset: "", lat: null, lon: null, camera: "" };
  }
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(abs));
    else if (IMAGE_RE.test(ent.name)) out.push(abs);
  }
  return out;
}

function haversine(lat1, lon1, lat2, lon2) {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/* --------------------------------------------------------------------- main */

async function main() {
  if (!SRC_DIR) {
    console.error(
      "usage: node scripts/pilgrimage-photos.mjs --dir <photo dir> " +
        "[--out <photos.json>] [--points <anitabi snapshot>] [--worksheet <csv>]",
    );
    process.exit(1);
  }
  const srcAbs = path.resolve(root, SRC_DIR);
  if (!fs.existsSync(srcAbs)) {
    console.error(`[photos] directory not found: ${srcAbs}`);
    process.exit(1);
  }

  const files = walk(srcAbs).sort();
  if (!files.length) {
    console.error(`[photos] no images under ${srcAbs}`);
    process.exit(1);
  }
  console.log(`[photos] ${files.length} images under ${srcAbs}`);

  const taken = new Set();
  const photos = [];
  for (const abs of files) {
    const meta = await exifMeta(abs);
    photos.push({
      id: uniqueId(abs, taken),
      file: path.relative(root, abs).replace(/\\/g, "/"),
      shotAt: meta.shotAt,
      shotAtLocal: meta.shotAtLocal,
      tzOffset: meta.tzOffset,
      lat: meta.lat,
      lon: meta.lon,
      camera: meta.camera,
    });
  }

  photos.sort(
    (a, b) => (a.shotAt || "9999").localeCompare(b.shotAt || "9999") || a.id.localeCompare(b.id),
  );

  const withGps = photos.filter((p) => p.lat != null);
  const dated = photos.filter((p) => p.shotAt);

  fs.mkdirSync(path.dirname(OUT_ABS), { recursive: true });
  fs.writeFileSync(
    OUT_ABS,
    `${JSON.stringify(
      {
        _note:
          "Position/time truth for pilgrimage photos. Contains personal capture coordinates — keep under assets-src/ (git-ignored) and ship only the derived pilgrimage.json.",
        _generator: "scripts/pilgrimage-photos.mjs",
        generatedAt: new Date().toISOString(),
        dir: path.relative(root, srcAbs).replace(/\\/g, "/"),
        count: photos.length,
        withGps: withGps.length,
        photos,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `[photos] wrote ${path.relative(root, OUT_ABS)} — ${photos.length} photos ` +
      `(${withGps.length} with GPS, ${dated.length} with a capture time)`,
  );
  if (photos.length - withGps.length > 0) {
    console.warn(
      `[photos] ${photos.length - withGps.length} photo(s) have NO GPS — they will need ` +
        "manual placement in the worksheet (their rows carry empty nearest_* columns).",
    );
  }

  const noTz = photos.filter((p) => p.shotAt && !p.tzOffset);
  if (noTz.length) {
    console.warn(
      `[photos] ${noTz.length} photo(s) carry a capture time but NO EXIF offset ` +
        "(OffsetTimeOriginal) — those shotAt values are wall-clock only and ambiguous.",
    );
  }

  /* ------------------------------------------------- pre-filled worksheet */

  if (!POINTS_ABS) {
    console.log(
      "[photos] no --points snapshot given → skipped the review worksheet. " +
        "Re-run with --points <anitabi snapshot> to pre-fill it.",
    );
    return;
  }
  if (!fs.existsSync(POINTS_ABS)) {
    console.warn(`[photos] points snapshot not found: ${POINTS_ABS} — worksheet skipped`);
    return;
  }
  const snap = JSON.parse(fs.readFileSync(POINTS_ABS, "utf8"));
  const points = (snap.points ?? []).filter((p) => p.lat != null && p.lon != null);
  if (!points.length) {
    console.warn("[photos] snapshot has no points with coordinates — worksheet skipped");
    return;
  }
  console.log(
    `[photos] matching against ${points.length} anitabi points (${snap.title ?? "?"})`,
  );

  const HEADER = [
    "photo_id",
    "file",
    "shotAt",
    "lat",
    "lon",
    // pre-filled suggestions — confirm or overwrite the first one
    "nearest_anitabi_id",
    "nearest_name",
    "nearest_ep",
    "nearest_s",
    "nearest_dist_m",
    "cand2_anitabi_id",
    "cand2_dist_m",
    "cand3_anitabi_id",
    "cand3_dist_m",
    // ── blank columns for you ───────────────────────────────────────────
    "chosen_anitabi_id",
    "composite_file",
    "status",
  ];

  const lines = [HEADER.join(",")];
  let ambiguous = 0;
  let unmatched = 0;
  let suggested = 0;
  for (const ph of photos) {
    if (ph.lat == null) {
      // keep the column count identical to HEADER (17): id, file, shotAt,
      // then 13 blanks (lat/lon + nearest/cand ids & distances + the three
      // hand-filled columns), then status.
      lines.push(
        [ph.id, ph.file, ph.shotAt, ...Array(13).fill(""), "no-gps"]
          .map(csvCell)
          .join(","),
      );
      continue;
    }
    const ranked = points
      .map((p) => ({ p, d: haversine(ph.lat, ph.lon, p.lat, p.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    const [n1, n2, n3] = ranked;
    // Three-way status so the worksheet can be FILTERED instead of read whole:
    //   unmatched — nothing within NEAR_M; the photo probably is not a
    //               pilgrimage shot (or has no matching anitabi point yet).
    //   ambiguous — the runner-up is within 1.5× AND under 60 m, so the
    //               nearest is not a safe guess; check these on the map.
    //   suggested — one clear winner.
    let status;
    if (!n1 || n1.d > NEAR_M) {
      status = "unmatched";
      unmatched += 1;
    } else if (n2 && n2.d < n1.d * 1.5 && n2.d < 60) {
      status = "ambiguous";
      ambiguous += 1;
    } else {
      status = "suggested";
      suggested += 1;
    }
    lines.push(
      [
        ph.id,
        ph.file,
        ph.shotAt,
        ph.lat.toFixed(6),
        ph.lon.toFixed(6),
        n1?.p.id ?? "",
        n1?.p.name ?? "",
        n1?.p.ep ?? "",
        n1?.p.s ?? "",
        n1 ? Math.round(n1.d) : "",
        n2?.p.id ?? "",
        n2 ? Math.round(n2.d) : "",
        n3?.p.id ?? "",
        n3 ? Math.round(n3.d) : "",
        "",
        "",
        status,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  // BOM so Excel / WPS opens the CJK names correctly instead of mojibake.
  fs.mkdirSync(path.dirname(WORKSHEET_ABS), { recursive: true });
  fs.writeFileSync(WORKSHEET_ABS, `\uFEFF${lines.join("\r\n")}\r\n`);
  console.log(`[photos] wrote ${path.relative(root, WORKSHEET_ABS)} — ${photos.length} rows`);
  console.log(
    `         status: ${suggested} suggested · ${ambiguous} ambiguous · ${unmatched} unmatched · ` +
      `${photos.length - withGps.length} no-gps`,
  );
  if (ambiguous) {
    console.log(
      '         "ambiguous" = runner-up point within 60 m — check those on the magiconch map first.',
    );
  }
  if (unmatched) {
    console.log(
      `         "unmatched" = nearest point further than ${NEAR_M} m — likely not a pilgrimage ` +
        "shot; ignore it or place it by hand.",
    );
  }
  console.log(
    "         Fill `chosen_anitabi_id`, `composite_file`, `status` as you composite.",
  );
}

try {
  await main();
} catch (err) {
  console.error(`[photos] failed: ${err.message}`);
  process.exit(1);
}
