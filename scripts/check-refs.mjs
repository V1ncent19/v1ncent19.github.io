#!/usr/bin/env node
/**
 * check-refs.mjs — fail the build when content/ points at a file that is not in
 * public/.
 *
 *   node scripts/check-refs.mjs
 *   npm run check:refs
 *
 * WHY THIS EXISTS
 *   Content files reference images/videos/PDFs as *strings* ("/assets/…"), not
 *   imports. Nothing type-checks a string, so renaming or moving an asset — or
 *   mistyping a folder — silently produces a blank <img> that only the visitor
 *   sees. There is no compile error, no console warning, and the page still
 *   builds.
 *
 *   This script closes that gap: every referenced path is resolved against
 *   public/, and a miss fails `npm run build` with the file and line that holds
 *   the bad ref.
 *
 * WHAT IT SCANS
 *   content/**.{json,ts,tsx,md,mdx} — the hand-maintained tree. Four forms are
 *   matched because the site uses all four:
 *     " /assets/x.webp "            JSON / TS string literals
 *     ![alt](/assets/x.webp)        markdown image
 *     <img src="/assets/x.webp">    raw HTML in markdown
 *     <a href="/assets/x.pdf">      raw HTML links (CV download)
 *
 * WHAT IT DOES NOT SCAN
 *   - components/ and app/, which reference /assets by construction and are
 *     covered by the paths they receive from content
 *   - assets-src/, which never ships (its contents have no public/ twin)
 *   - External URLs (http, https, //, data:, mailto:)
 *   - "#anchor" links and query strings (`?v=2` is stripped before resolving)
 *
 * ESCAPE HATCH
 *   A path that is deliberately absent at build time can be marked with a
 *   trailing `#refs-ok` in a comment on the same line, or listed in
 *   ALLOW_MISSING below. Keep that list empty unless there is a real reason.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const PUBLIC_DIR = path.join(ROOT, "public");

/** Paths allowed to be missing. Every entry needs a comment saying why. */
const ALLOW_MISSING = new Set([]);

const SCAN_EXT = new Set([".json", ".ts", ".tsx", ".md", ".mdx"]);
const ASSET_EXT = "webp|jpg|jpeg|png|svg|pdf|mp4|gif|avif|mov|webm";
const PATH_BODY = `[A-Za-z0-9_\\-./]+?\\.(?:${ASSET_EXT})`;

/* Four reference shapes. Each captures the path in group 1. */
const PATTERNS = [
  /* 1. a quoted site-rooted path: JSON values, TS string literals */
  new RegExp(`["'\`](\\/${PATH_BODY})["'\`]`, "gi"),
  /* 2. markdown image / link target: ![alt](/assets/x.webp) */
  new RegExp(`!?\\[[^\\]]*\\]\\((\\/${PATH_BODY})\\)`, "gi"),
  /* 3. raw HTML in markdown: src="/…" or href="/…" */
  new RegExp(`(?:src|href)=["'](\\/${PATH_BODY})["']`, "gi"),
  /* 4. bare path in a CSS-ish context: url(/assets/x.png) */
  new RegExp(`url\\(\\s*["']?(\\/${PATH_BODY})["']?\\s*\\)`, "gi"),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      /* Generated dirs are not hand-maintained and can be large. */
      if (e.name === "node_modules") continue;
      walk(p, out);
    } else if (SCAN_EXT.has(path.extname(e.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

/** Files under public/ that actually exist, as a Set of site-rooted paths. */
function publicFiles() {
  const set = new Set();
  (function rec(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) rec(p);
      else set.add("/" + path.relative(PUBLIC_DIR, p).replace(/\\/g, "/"));
    }
  })(PUBLIC_DIR);
  return set;
}

const files = walk(CONTENT_DIR);
const exists = publicFiles();

const missing = [];
let checked = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");

  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text))) {
      /* Strip a query/hash tail before resolving — "/x.webp?v=2" is valid. */
      const raw = m[1];
      const clean = raw.split(/[?#]/)[0];

      /* Line number of this match, for the error message. */
      const upTo = text.slice(0, m.index);
      const lineNo = upTo.split("\n").length;
      const lineText = lines[lineNo - 1] ?? "";

      /* Escape hatches: inline marker, or the allow-list. */
      if (lineText.includes("#refs-ok")) continue;
      if (ALLOW_MISSING.has(clean)) continue;

      checked++;
      if (!exists.has(clean)) {
        missing.push({ file: rel, line: lineNo, ref: clean });
      }
    }
  }
}

if (missing.length) {
  const unique = new Map();
  for (const m of missing) {
    const k = `${m.ref}\u0000${m.file}`;
    if (!unique.has(k)) unique.set(k, m);
  }
  console.error(`\n✗ ${unique.size} broken asset reference(s) found.\n`);
  console.error("  These paths are written in content/ but do not exist in public/.");
  console.error("  A visitor would see a blank image; the build would otherwise pass.\n");
  for (const m of unique.values()) {
    console.error(`  ${m.file}:${m.line}`);
    console.error(`      ${m.ref}`);
  }
  console.error(
    "\n  Fix: either add the file under public/<same path>, correct the string,\n" +
      "  or (if it is deliberately absent) append `#refs-ok` to that line.\n",
  );
  process.exit(1);
}

/* A file under public/ that nothing references is not an error — the site has
   intentionally un-linked assets (fonts, world outline, badges) — so this only
   reports a count for the reader who wonders whether the scan ran. */
console.log(
  `[refs] ${checked} reference(s) across ${files.length} content file(s) — all resolve in public/.`,
);
