#!/usr/bin/env node
/**
 * pilgrimage-derive.mjs — turn the hand-made comparison composites into the
 * single committed WebP tier the site actually ships.
 *
 *   npm run pilgrimage:derive
 *   node scripts/pilgrimage-derive.mjs --force          # rebuild everything
 *   node scripts/pilgrimage-derive.mjs --limit 5        # smoke test
 *
 * MASTERS (git-ignored, never edited in place, never published)
 *   assets-src/photos/just-because/compare/{IMG_xxxx}.jpg
 *       the 36 hand-made magiconch composites (real shot ↔ anime still). Named
 *       after the ORIGINAL phone filename (IMG_2746.jpg) so they pair with
 *       photos.json via the id you already know.
 *
 * SOURCE OF TRUTH
 *   assets-src/travel-data/pilgrimage/photos.json (scripts/pilgrimage-photos.mjs)
 *   The composite filename maps to a photo id by lower-casing the stem and
 *   turning underscores into dashes: IMG_2746.jpg → img-2746. That id is then
 *   looked up against photos.json for the capture position/time.
 *
 * OUTPUTS (committed — these are what the site serves)
 *   public/assets/pilgrimage/just-because/compare/{id}.webp   2400 px long edge
 *
 * SCOPE CHANGE (2026-10-16, user decision)
 *   Only the comparison tier is produced now. The earlier shot/ + thumb/ tiers
 *   (one per RAW pilgrimage photo) were dropped: the user hand-picks which
 *   shots are worth publishing, and only the composite goes online. The anime/
 *   tier was dropped too — no fallback display is wanted.
 *
 * WHY RE-ENCODE INSTEAD OF COPYING
 *   public/ is copied verbatim into the static export, so anything under it is
 *   public and permanent. Re-encoding with sharp drops the EXIF block as a side
 *   effect (sharp only carries metadata over on an explicit withMetadata()),
 *   so the shipped tier carries no GPS, no capture time, no device serial while
 *   photos.json keeps the truth locally. It also shrinks the jpg composites.
 *   Origins are never modified.
 *
 * INCREMENTAL: a tier is rebuilt only when its master is newer (or --force).
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

const PHOTOS_ABS = path.resolve(
  root,
  arg("photos", "assets-src/travel-data/pilgrimage/photos.json"),
);
const OUT_ROOT = path.resolve(
  root,
  arg("out", "public/assets/pilgrimage/just-because"),
);
const COMPARE_SRC = path.resolve(
  root,
  arg("compare-dir", "assets-src/photos/just-because/compare"),
);

const COMPARE_LONG = 2400;
/** Composites are two frames side by side — keeping more detail pays off. */
const COMPARE_QUALITY = 82;
const IMAGE_RE = /\.(jpe?g|png|webp|tiff?)$/i;

const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

/** [width, height] long-edge box, no upscaling. */
const box = (n) => ({
  width: n,
  height: n,
  fit: "inside",
  withoutEnlargement: true,
});

/** Rebuild only if the master is newer than the tier (or --force). */
function stale(srcAbs, outAbs) {
  if (flag("force") || !fs.existsSync(outAbs)) return true;
  return fs.statSync(srcAbs).mtimeMs > fs.statSync(outAbs).mtimeMs;
}

async function render(srcAbs, outAbs, long, quality) {
  const info = await sharp(srcAbs)
    .autoOrient()
    .resize(box(long))
    .webp({ quality })
    .toFile(outAbs);
  return info;
}

/** Composite filename stem → photos.json id (IMG_2746 → img-2746). */
function stemToId(file) {
  return file.replace(/\.[^.]+$/, "").toLowerCase().replace(/_/g, "-");
}

async function main() {
  if (!fs.existsSync(PHOTOS_ABS)) {
    console.error(`[derive] photos.json not found: ${rel(PHOTOS_ABS)}`);
    console.error("  run: npm run pilgrimage:photos -- --dir <master dir>");
    process.exit(1);
  }
  const doc = JSON.parse(fs.readFileSync(PHOTOS_ABS, "utf8"));
  const photos = Array.isArray(doc.photos) ? doc.photos : [];
  const byId = new Map(photos.map((p) => [p.id, p]));

  const COMPARE_DIR = path.join(OUT_ROOT, "compare");
  fs.mkdirSync(COMPARE_DIR, { recursive: true });
  // Create the drop folder even when absent so there is always somewhere obvious
  // to put the magiconch exports.
  fs.mkdirSync(COMPARE_SRC, { recursive: true });

  const files = fs
    .readdirSync(COMPARE_SRC)
    .filter((f) => IMAGE_RE.test(f))
    .sort();

  if (!files.length) {
    console.log(
      `[derive] no composites in ${rel(COMPARE_SRC)} — drop the magiconch ` +
        "exports there named <photoId> (e.g. IMG_2746.jpg), then re-run.",
    );
    // Still create the output dir so the site build has something to point at.
    return;
  }

  const limit = Number(arg("limit", "0"));
  const list = limit > 0 ? files.slice(0, limit) : files;

  console.log(
    `[derive] ${list.length} composite(s) from ${rel(COMPARE_SRC)} → ${rel(COMPARE_DIR)}`,
  );

  let built = 0;
  let skipped = 0;
  let bytes = 0;
  let sampleItem = null;
  const orphans = [];

  for (const f of list) {
    const id = stemToId(f);
    if (!byId.has(id)) {
      // The file is not named after a known photo id — it cannot be tied back
      // to a position, so shipping it would produce a point with no coordinate.
      orphans.push({ f, id });
      continue;
    }
    const srcAbs = path.join(COMPARE_SRC, f);
    const outAbs = path.join(COMPARE_DIR, `${id}.webp`);
    if (stale(srcAbs, outAbs)) {
      const info = await render(srcAbs, outAbs, COMPARE_LONG, COMPARE_QUALITY);
      sampleItem = { src: srcAbs, out: outAbs, info };
      built++;
    } else {
      skipped++;
    }
    bytes += fs.statSync(outAbs).size;
  }

  console.log(
    `[derive]   compare: ${built} built · ${skipped} up to date · ${mb(bytes)} MB`,
  );

  if (orphans.length) {
    console.warn(
      `[derive]   ${orphans.length} composite(s) named after an unknown photo id — skipped ` +
        "(they cannot be mapped to a position):",
    );
    orphans.slice(0, 12).forEach(({ f, id }) => console.warn(`    - ${f}  (→ ${id})`));
    if (orphans.length > 12) console.warn(`    … and ${orphans.length - 12} more`);
  }

  /* ------------------------------------------------------- privacy assertion */

  if (sampleItem) {
    const meta = await sharp(sampleItem.out).metadata();
    const leaked = [];
    if (meta.exif) leaked.push("EXIF");
    if (meta.icc) leaked.push("ICC");
    if (meta.xmp) leaked.push("XMP");
    if (leaked.length) {
      console.error(
        `[derive] FAIL — published tier still carries ${leaked.join(" / ")} ` +
          `(${rel(sampleItem.out)}). Drop the withMetadata() call.`,
      );
      process.exit(1);
    }
    console.log(
      `[derive]   metadata check: ${path.basename(sampleItem.out)} → ` +
        `${meta.width}×${meta.height} ${meta.format}, no EXIF/ICC/XMP`,
    );
  }
}

try {
  await main();
} catch (err) {
  console.error(`[derive] failed: ${err.message}`);
  process.exit(1);
}
