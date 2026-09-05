#!/usr/bin/env node
/**
 * npm run gallery:gen — local image pipeline for the Gallery.
 *
 * Reads full-resolution originals from ./GalleryPhoto (git-ignored, 142 MB of
 * 14 MP JPEGs — never pushed to GitHub), and:
 *   1. generates the two committed web tiers under
 *      public/assets/gallery/thumb/<id>.webp  (~480px long edge) and
 *      public/assets/gallery/large/<id>.webp  (~1680px long edge),
 *   2. maintains content/gallery/items.json, the gallery manifest.
 *
 * items.json is the source of truth for the HUMAN fields — the bilingual text
 * block (place / placeLocal / title as `*_en` + `*_zh`, plus a SINGLE
 * language-neutral `alt`), the curated `featured` flag, and the shared
 * `country_code`, `originalUrl`, `badge`. The script never overwrites those:
 * it merges the generated fields (real EXIF capture date, EXIF GPS lat/lon,
 * oriented dimensions, asset URLs) into rows matched by the original filename,
 * appends rows for new originals, and warns (rather than deletes) when a source
 * file is gone. Delete a row from items.json to remove a photo.
 *
 * `color` is an OUTPUT of the `featured` flag, not a hand field any more: each
 * run derives it — featured (curated) rows get the curated orange-red accent
 * (CURATED_HEX, matching `--curated` in the light theme), everything else ""
 * (the default-blue site brand). The UI recolours from `featured` live, so the
 * manifest value is refreshed for inspection / parity on every run.
 *
 * Older-manifest migrations: the retired bilingual `alt` (`alt_en` + `alt_zh`)
 * and the pre-bilingual single keys `place` / `placeLocal` / `title` / `alt`
 * are folded into the current fields and dropped, so no hand-written caption is
 * lost when upgrading.
 *
 * EXIF extraction: orientation is applied via sharp's autoOrient() so stored
 * width/height always reflect the on-screen image; `date` comes from
 * DateTimeOriginal; `lat` / `lon` come from the EXIF GPS tag as decimal degrees
 * and are refreshed on every run when GPS is present (a human-correction is
 * preserved only when the source file has no GPS). Any extra keys a human adds
 * to an items.json row survive the merge untouched.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import exifr from "exifr";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(root, "GalleryPhoto");
const MANIFEST = path.join(root, "content", "gallery", "items.json");
const ASSET_ROOT = path.join(root, "public", "assets", "gallery");
const THUMB_DIR = path.join(ASSET_ROOT, "thumb");
const LARGE_DIR = path.join(ASSET_ROOT, "large");

const THUMB_LONG = 480; // masonry grid
const LARGE_LONG = 1680; // lightbox
const QUALITY = 78;
const MAX_ORPHANS = 20; // stop before 100s of stale warnings spam

/** Accent written into `color` for `featured` (curated) rows — matches the
 * light-theme `--curated` in globals.css. Non-featured rows keep "" (default
 * site brand). The UI derives the live accent from the `featured` flag, so this
 * value is informational / for manifest inspection; it is refreshed each run. */
const CURATED_HEX = "#c8441f";

/* ------------------------------------------------------------------------ */

function slugifyId(file) {
  const base = file.replace(/\.[^.]+$/, "");
  const id = base
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "photo";
}

/** EXIF "2023:06:24 12:00:00" (or a parsed Date) → "YYYY-MM-DD" ("" when unknown). */
function toIsoDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // exifr hands back a Date interpreted as naive wall-clock time; take its
    // calendar fields as-is (no tz shifting — EXIF has no timezone).
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  const m = s.match(/(\d{4})[-:](\d{2})[-:](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

/**
 * EXIF facts for one original: capture date ("" when unknown) plus decimal
 * GPS latitude / longitude (null when the file has no GPS). exifr hands the
 * GPS values back at the top level (parsed.latitude / .longitude); the nested
 * parsed.gps.* fallback is kept for robustness across exifr versions.
 */
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
    return {
      date: toIsoDate(parsed?.DateTimeOriginal),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    };
  } catch {
    return { date: "", lat: null, lon: null };
  }
}

/** Turn a source filename into a stable unique id for the manifest + assets. */
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

async function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/* ------------------------------------------------------------------------ */

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[gallery] source dir not found: ${SRC_DIR}`);
    console.error("Put full-res originals in GalleryPhoto/ (git-ignored) and retry.");
    process.exit(1);
  }
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.jpe?g$/i.test(f) || /\.png$/i.test(f))
    .sort();

  const previous = loadManifest();
  const bySource = new Map(previous.map((r) => [r.source, r]));
  const taken = new Set(previous.map((r) => r.id));

  if (files.length === 0) {
    console.error(`[gallery] no image files in ${SRC_DIR}`);
    process.exit(1);
  }

  console.log(`[gallery] ${files.length} originals → ${THUMB_DIR} + ${LARGE_DIR}`);
  const rows = [];

  for (const file of files) {
    const srcAbs = path.join(SRC_DIR, file);
    const prior = bySource.get(file);
    const id = prior?.id || uniqueId(file, taken);

    const thumbOut = path.join(THUMB_DIR, `${id}.webp`);
    const largeOut = path.join(LARGE_DIR, `${id}.webp`);

    const largeInfo = await sharp(srcAbs)
      .autoOrient()
      .resize({ width: LARGE_LONG, height: LARGE_LONG, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(largeOut);
    await sharp(srcAbs)
      .autoOrient()
      .resize({ width: THUMB_LONG, height: THUMB_LONG, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(thumbOut);

    const meta = await exifMeta(srcAbs);
    const { date, lat, lon } = meta;

    const row = {
      // human fields — preserved from the previous manifest when present
      ...(prior ?? {}),
      // id/source are the join keys; source filename always wins
      id,
      source: file,
      // generated fields — refreshed every run
      date: prior?.date && !date ? prior.date : date || prior?.date || "",
      // lat/lon are refreshed from the source's EXIF GPS when present; a
      // human-edited value survives only when this file has no GPS tag.
      lat: lat ?? prior?.lat ?? null,
      lon: lon ?? prior?.lon ?? null,
      // bilingual human text — prefer the per-language key, else carry the old
      // single-language value into the EN slot on the first upgrade run.
      country_code: prior?.country_code ?? "",
      place_en: prior?.place_en || prior?.place || "",
      place_zh: prior?.place_zh ?? "",
      placeLocal_en: prior?.placeLocal_en || prior?.placeLocal || "",
      placeLocal_zh: prior?.placeLocal_zh ?? "",
      title_en: prior?.title_en || prior?.title || "",
      title_zh: prior?.title_zh ?? "",
      // `alt` is single + language-neutral: keep the authored value, or fold
      // the retired bilingual/single forms in on the first run over an old file.
      alt: prior?.alt || prior?.alt_en || prior?.alt_zh || "",
      originalUrl: prior?.originalUrl ?? "",
      // `featured` (curated flag) is human-authored; `color` derives from it on
      // every run — featured → curated orange-red accent, else "" (default blue).
      featured: prior?.featured === true,
      color: prior?.featured === true ? CURATED_HEX : "",
      badge: prior?.badge ?? "",
      thumb: `/assets/gallery/thumb/${id}.webp`,
      large: `/assets/gallery/large/${id}.webp`,
      width: largeInfo.width,
      height: largeInfo.height,
    };
    // Retired key forms (single-language place/title/alt, bilingual alt_en/zh)
    // must not ride along in the merged row forever.
    delete row.place;
    delete row.placeLocal;
    delete row.title;
    delete row.alt_en;
    delete row.alt_zh;
    rows.push(row);
  }

  // Rows whose source no longer exists: keep them (user metadata is precious)
  // but flag loudly so nobody ships a 404 image silently.
  const seenSources = new Set(files);
  const orphans = previous.filter((r) => !seenSources.has(r.source));
  if (orphans.length) {
    console.warn(
      `[gallery] ${orphans.length} manifest row(s) have no source file (kept as-is):`,
    );
    orphans.slice(0, MAX_ORPHANS).forEach((o) => console.warn(`  - ${o.source}`));
  }

  rows.sort(
    (a, b) =>
      (b.date || "0").localeCompare(a.date || "0") ||
      a.id.localeCompare(b.id),
  );
  fs.writeFileSync(MANIFEST, `${JSON.stringify(rows, null, 2)}\n`);

  const bytes = rows.reduce(
    (acc, r) =>
      acc +
      fs.statSync(path.join(THUMB_DIR, path.basename(r.thumb))).size +
      fs.statSync(path.join(LARGE_DIR, path.basename(r.large))).size,
    0,
  );
  console.log(`[gallery] wrote ${rows.length} items → ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
}

try {
  await ensureDir(THUMB_DIR);
  await ensureDir(LARGE_DIR);
  await ensureDir(path.dirname(MANIFEST));
  await main();
} catch (err) {
  console.error("[gallery] failed:", err);
  process.exit(1);
}
