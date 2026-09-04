#!/usr/bin/env node
/**
 * npm run blog:media:sync — copy the legacy blog's media into the static tree.
 *
 * The rebuilt site renders the OLD SITE'S REAL post bodies (`_texts/*.md`),
 * which reference media by liquid token + path, e.g.
 *   ![炖汤]({{site.baseurl}}/assets/photos/cuisine/steak1.jpg)
 *   <video ...><source src="{{site.baseurl}}/assets/photos/...mp4"...></video>
 * At read time lib/legacy.ts collapses `{{site.baseurl}}` ('' in _config.yml)
 * to site-root `/assets/...`. This script makes those URLs resolve by copying
 * every referenced file from the repo-root legacy `assets/` tree (the source of
 * truth) into `public/`, mirroring the destination path verbatim.
 *
 * It ONLY copies — it never deletes anything under public/, so
 * `public/assets/photos/cal.png` (About_zh's image, excluded from the blog
 * scope here) is preserved. Idempotent overwrite: re-run whenever a future
 * legacy post references new media.
 *
 * Scope mirrors lib/legacy.ts's NOT_BLOG set so drafts/About_zh can't pull
 * missing-file noise into the run; the script fails loudly (non-zero exit) if
 * any referenced source file is missing on disk.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEXTS_DIR = path.join(root, "_texts");
const LEGACY_ASSETS = path.join(root, "assets"); // legacy source of truth
const PUBLIC = path.join(root, "public");

/** Files that are not blog posts on the rebuilt site — must match lib/legacy.ts. */
const NOT_BLOG = new Set([
  "About_zh.md", // → /about/zh
  "HighDim2024.md", // → /project long-running note
  "HMC.md", // unpublished draft
  "NTK.md", // unpublished draft
  "MahalanobisAndLeverage.md", // unpublished draft
]);

/**
 * Every media reference in a post body, as a path relative to repo root and
 * always starting `assets/…`. The `assets/…` substring is present verbatim no
 * matter which baseurl spelling precedes it, and the character class stops each
 * match at the closing quote/paren/whitespace.
 */
const MEDIA_RE = /(?:assets\/photos\/[A-Za-z0-9_.\/-]+|assets\/boxcox\.png)/g;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  if (!fs.existsSync(TEXTS_DIR)) {
    console.error(`[blog-media] _texts dir not found: ${TEXTS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(TEXTS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".md") && !NOT_BLOG.has(f))
    .sort();

  // Discover references across all post bodies; a Set dedupes (insertion order).
  const refs = new Set();
  for (const file of files) {
    const raw = fs.readFileSync(path.join(TEXTS_DIR, file), "utf8");
    for (const m of raw.matchAll(MEDIA_RE)) refs.add(m[0]);
  }
  const ordered = [...refs].sort();

  if (ordered.length === 0) {
    console.log("[blog-media] no media references found in blog posts");
    return;
  }

  console.log(`[blog-media] ${files.length} posts reference ${ordered.length} media file(s)`);
  const missing = [];
  const copied = [];
  for (const ref of ordered) {
    const src = path.join(LEGACY_ASSETS, ref.slice("assets/".length));
    const dest = path.join(PUBLIC, ref);
    if (!fs.existsSync(src)) {
      missing.push(ref);
      console.warn(`[blog-media] MISSING (skipped): ${ref}`);
      continue;
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    copied.push(ref);
  }

  // Post-copy verification — every promised dest must now exist.
  const absent = ordered.filter((ref) => !fs.existsSync(path.join(PUBLIC, ref)));
  if (absent.length) {
    absent.forEach((ref) => console.error(`[blog-media] ABSENT after copy: ${ref}`));
    process.exit(1);
  }

  const byTop = {};
  const bytes = copied.reduce((acc, ref) => {
    const dir = ref.includes("/photos/")
      ? ref.slice("assets/photos/".length, ref.indexOf("/", "assets/photos/".length))
      : "(root)";
    byTop[dir] = (byTop[dir] || 0) + 1;
    return acc + fs.statSync(path.join(PUBLIC, ref)).size;
  }, 0);

  console.log(
    `[blog-media] copied ${copied.length} → ${(bytes / 1024 / 1024).toFixed(1)} MB` +
      (missing.length ? `, ${missing.length} source(s) missing` : ", 0 missing"),
  );
  console.log(`[blog-media]   ${Object.entries(byTop).map(([d, n]) => `${d}: ${n}`).join(", ")}`);
  if (missing.length) process.exit(1);
}

try {
  await main();
} catch (err) {
  console.error("[blog-media] failed:", err);
  process.exit(1);
}
