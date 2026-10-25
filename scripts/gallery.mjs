#!/usr/bin/env node
/**
 * npm run gallery:gen — local image pipeline for the Gallery.
 *
 * Reads full-resolution originals from
 * public/assets/photos/gallery/original (git-ignored local master, ~145 MB of
 * 14 MP JPEGs — the originals themselves are never edited in place), and:
 *   1. generates the two committed web tiers under
 *      public/assets/photos/gallery/thumb/<id>.webp  (~480px long edge) and
 *      public/assets/photos/gallery/large/<id>.webp  (~1680px long edge),
 *   2. maintains content/travel/gallery/items.json, the gallery manifest.
 *
 * SOURCE DIR MOVED 2026-10-25 (user changed the project's file organisation):
 * originals now live INSIDE the gallery asset tree at `.../gallery/original/`,
 * sitting next to the two generated tiers, instead of the repo-root
 * `GalleryPhoto/` that used to hold them. Consequences worth knowing:
 *   - `original/` is matched by .gitignore line 103 (the
 *     /public/assets/photos/[any]/original/ rule) and has ZERO tracked files —
 *     verify with `git check-ignore -v` before touching the path. It must stay
 *     ignored: committing it would mean a ~145 MB push (HTTP 408) AND a
 *     check:refs failure in CI, which is exactly what broke run #12.
 *   - The script never writes into SRC_DIR — it only reads. So using an
 *     in-tree directory as the source is safe; being under `public/` does NOT
 *     publish these files, because `.gitignore` keeps them out of the deploy.
 *
 * ORIGINALS ARE NOT PUBLISHED (decision 2026-10-18). There is no "original"
 * tier referenced by the manifest and no same-origin download button:
 * publishing the 145 MB tier was what broke the Pages deploy (run #12 —
 * content/ referenced the folder, .gitignore hid it, CI failed check:refs), and
 * a 145 MB push was what repeatedly broke the user's network. The originals
 * stay on disk as the ONLY master copy; the only way a row gets a download
 * button again is a hand-authored EXTERNAL `originalUrl` (http/https, e.g. a
 * cloud-drive/CDN link) — the merge keeps an external url and strips any
 * leftover in-repo path (see the originalUrl cleanup in the row loop).
 *
 * items.json is the source of truth for the HUMAN fields — the bilingual text
 * block (place / placeLocal / title as `*_en` + `*_zh`, plus a SINGLE
 * language-neutral `alt`), the curated `featured` flag, and the shared
 * `country_code`, `originalUrl` (external only), `badge`. The script never
 * overwrites those:
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
const ASSET_ROOT = path.join(root, "public", "assets", "photos", "gallery");
// 2026-10-25: originals moved into the gallery asset tree (see the header
// note). Overridable so a one-off run against an older layout still works
// without editing the file: `GALLERY_SRC=/path/to/originals npm run gallery:gen`.
const SRC_DIR = process.env.GALLERY_SRC
  ? path.resolve(process.env.GALLERY_SRC)
  : path.join(ASSET_ROOT, "original");
const MANIFEST = path.join(
  root,
  "content",
  "travel",
  "gallery",
  "items.json",
);
const THUMB_DIR = path.join(ASSET_ROOT, "thumb");
const LARGE_DIR = path.join(ASSET_ROOT, "large");

/* THUMB sizing is WIDTH-based, not long-edge based (2026-10-25).
 *
 * The masonry grid gives every tile the same CSS width (298 px at 1440 in the
 * default 3-column layout, MIN_TILE = 148 at the narrow end), so the axis that
 * has to be sharp is the HORIZONTAL one. The old rule resized with
 * `{ width: 480, height: 480, fit: "inside" }`, i.e. it constrained the LONG
 * edge — fine for landscape (long edge = width) but disastrous for portrait:
 * a 3:5 phone photo came out 247 px wide, and the grid then UPSCALED it to
 * 298 (596 on a 2x screen). Measured offender: `img-9834` at 247×480 natural
 * shown at 298 CSS px. That is the "portrait thumbs look blurry" report.
 *
 * Now: width = THUMB_W exactly (no enlargement), height capped at THUMB_MAX_H
 * so a freak panorama-tall source cannot produce a 3000 px-tall thumb. With
 * the cap inactive, `fit: "outside"` is what keeps `withoutEnlargement` from
 * shrinking small sources: sharp treats width+height with `inside` as "fit in
 * this box", but we want "make it this wide unless that makes it too tall".
 */
const THUMB_W = 640; // masonry grid: covers 2x DPR at every tile width
const THUMB_MAX_H = 1280; // ceiling for extreme portrait sources
/* The lightbox is a fixed-height stage (`contain`), so it has the mirror-image
 * constraint: the LONG edge is what the viewer sees, and 1680 is already
 * capped by the widest screens. Kept as-is. */
const LARGE_LONG = 1680;
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

/**
 * Ensure `dir` exists.
 */
async function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/* ------------------------------------------------------------------------ */

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

const asText = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Bilingual field → `{ en, zh }`, folding the retired flat forms on the way
 * through: `place: { en, zh }` (current) ← `place_en` / `place_zh` ← `place`
 * (the oldest single-language form). One run over an old manifest upgrades it.
 */
function loc(prior, field) {
  const nested = prior?.[field];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return { en: asText(nested.en), zh: asText(nested.zh) };
  }
  return {
    en: asText(prior?.[`${field}_en`]) || asText(nested),
    zh: asText(prior?.[`${field}_zh`]),
  };
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[gallery] source dir not found: ${SRC_DIR}`);
    console.error(
      "Put full-res originals in public/assets/photos/gallery/original/ " +
        "(git-ignored, next to thumb/ and large/), or point GALLERY_SRC at another dir.",
    );
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
    const thumbResized = sharp(srcAbs).autoOrient()
      // Width-first (see THUMB_W): every tile is the same width, so the
      // horizontal axis is the one that must not be upscaled.
      //
      // `fit: "outside"` — NOT "inside". Measured on sharp: for a 1000×1680
      // portrait, both give 640×1075 (correct), but for a freak 800×4000
      // source "inside" collapses back to 256×1280 (width-first defeated,
      // exactly the blur we are fixing) while "outside" gives 640×3200.
      .resize({ width: THUMB_W, fit: "outside", withoutEnlargement: true });
    // Only then clamp the height, as a SECOND step, so it can never cancel the
    // width guarantee for normal photos: an extreme panorama-tall frame trades
    // a little width for a sane file, everything else stays exactly THUMB_W.
    const thumbBuf = await thumbResized
      .resize({ height: THUMB_MAX_H, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    fs.writeFileSync(thumbOut, thumbBuf);

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
      country_code: prior?.country_code ?? "",
      // Bilingual human text is `{ en, zh }` (2026-10-17). `loc()` also folds
      // the retired flat forms (`place_en` / `place_zh`, and the even older
      // single `place`) so one run over an old manifest upgrades it in place.
      place: loc(prior, "place"),
      placeLocal: loc(prior, "placeLocal"),
      title: loc(prior, "title"),
      // `alt` is single + language-neutral: keep the authored value, or fold
      // the retired bilingual/single forms in on the first run over an old file.
      alt: prior?.alt || prior?.alt_en || prior?.alt_zh || "",
      // `featured` (curated flag) is human-authored; `color` derives from it on
      // every run — featured → curated orange-red accent, else "" (default blue).
      featured: prior?.featured === true,
      color: prior?.featured === true ? CURATED_HEX : "",
      badge: prior?.badge ?? "",
      thumb: `/assets/photos/gallery/thumb/${id}.webp`,
      large: `/assets/photos/gallery/large/${id}.webp`,
      width: largeInfo.width,
      height: largeInfo.height,
    };
    // Retired key forms (bilingual place/title columns, bilingual alt) must not
    // ride along in the merged row forever — `...prior` copied them over.
    for (const field of ["place", "placeLocal", "title"]) {
      delete row[`${field}_en`];
      delete row[`${field}_zh`];
      // "Empty on both sides" means "not written yet": drop the field entirely
      // rather than ship `{ en: "", zh: "" }`. The UI already falls back to
      // `place` when `title` is absent, so the rendered result is identical and
      // the manifest stays readable (`check:i18n` errors on empty stubs).
      const value = row[field];
      if (value && !value.en && !value.zh) delete row[field];
    }
    delete row.alt_en;
    delete row.alt_zh;
    // originalUrl: EXTERNAL download links only (decision 2026-10-18 — the
    // local original tier under public/ is not published any more). Legacy
    // local-path values from an old manifest are stripped here; a hand-authored
    // http/https url (cloud-drive/CDN link) survives the merge untouched.
    if (!/^https?:\/\//i.test(row.originalUrl ?? "")) delete row.originalUrl;
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
