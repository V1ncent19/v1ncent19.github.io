#!/usr/bin/env node
/**
 * sync-trip-data.mjs — mirror trip JSON that must be fetch()ed into public/.
 *
 *   node scripts/sync-trip-data.mjs
 *   npm run sync:data
 *
 * WHY THIS EXISTS — AND HOW NARROW IT IS
 *   A trip page can render its data two ways:
 *
 *     import   build-time. No URL, no copy — the file lands in the JS bundle.
 *              Correct for anything a human writes, and for anything small the
 *              page needs on first paint.
 *     fetch    runtime. Needs a URL, and only public/ has URLs (next's static
 *              export copies public/ verbatim into out/ and nothing else).
 *              Correct when the file is too large to inline.
 *
 *   Hand-authored trip JSON lives in content/ and is imported. Large derived
 *   data lives in generated/; only the files listed in MIRRORED get a runtime
 *   copy under public/data/travel/<trip>/.
 *
 * WHY AN EXPLICIT LIST AND NOT A FOLDER
 *   An earlier version mirrored "whatever is in content/travel/<trip>/data/".
 *   That made the folder name carry a load-bearing semantic, and it put a
 *   one-file subfolder inside every trip that needed a single fetched file —
 *   the layout told you nothing you could not see from the file list.
 *
 *   Worse, the sibling "prune anything public/ has that content/ does not"
 *   pass was destructive by inference. It once emptied
 *   public/data/travel/ptes-2025/ because the content side had no counterparts
 *   yet. Both passes are now driven by names written down here, so a new file
 *   in the trip folder is inert until someone says what it is.
 *
 * Every public/data/travel JSON is a declared MIRRORED runtime copy. Other
 * files are stale and pruned; source snapshots now live under generated/.
 *
 * DIRECTION IS ONE-WAY: generated/ → public/. Editing the public/ copy directly
 *   gets you an overwrite on the next build; it is gitignored precisely so you
 *   are not tempted.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_TRAVEL = path.join(ROOT, "content", "travel");
const GENERATED_TRAVEL = path.join(ROOT, "generated", "travel");
const PUBLIC_TRAVEL = path.join(ROOT, "public", "data", "travel");

const CHECK_ONLY = process.argv.includes("--check");

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

/**
 * `<trip>/<file>` pairs to copy from generated/travel/<trip>/<file> to
 * public/data/travel/<trip>/<file>, byte for byte.
 *
 * PTES track.json is 1.6 MB and needs a runtime fetch; all other derived trip
 * JSON can be imported at build time from generated/.
 */
const MIRRORED = new Set(["ptes-2025/track.json"]);

/** JSON files directly inside a directory (flat by design, not recursive). */
function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => e.name)
    .sort();
}

/** `<trip>/<file>` keys actually present in content/travel/. */
function contentKeys() {
  const keys = new Set();
  if (!fs.existsSync(CONTENT_TRAVEL)) return keys;
  for (const e of fs.readdirSync(CONTENT_TRAVEL, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    for (const name of jsonFiles(path.join(CONTENT_TRAVEL, e.name))) {
      keys.add(`${e.name}/${name}`);
    }
  }
  return keys;
}

function sameBytes(a, b) {
  if (!fs.existsSync(b)) return false;
  if (fs.statSync(a).size !== fs.statSync(b).size) return false;
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

const copied = [];
const drifted = [];
const removed = [];
const missingSource = [];

const present = contentKeys();

/*
 * GUARDS FIRST. Both guards below describe situations where continuing would
 * destroy information, so they run before the copy and prune passes — not
 * after. That ordering is load-bearing:
 *
 *   The prune pass deletes "JSON under public/ that nothing declares". An
 *   imported content/ file with a public/ twin matches that description, so a
 *   guards-after-prune version would DELETE the twin and then report
 *   "0 shadows". A stray import twin is a mistake worth stopping for, but it
 *   is not this script's call to resolve — and in --check the passes record
 *   rather than act, so the two modes disagreed about the same tree. Checking
 *   first makes both modes agree.
 */

/* A MIRRORED entry with no generated/ source is a bug in this file, not drift. */
for (const key of MIRRORED) {
  if (!fs.existsSync(path.join(GENERATED_TRAVEL, key))) {
    missingSource.push(`${rel(path.join(GENERATED_TRAVEL, key))}  (declared in MIRRORED but not in generated/)`);
  }
}
if (missingSource.length) {
  console.error("\n✗  MIRRORED declares a file that does not exist in generated/:\n");
  for (const line of missingSource) console.error(`    ${line}`);
  console.error("\n   Fix the path in scripts/sync-trip-data.mjs.\n");
  process.exit(1);
}

/*
 * A content/ JSON that is NOT mirrored but has a public/ twin would ship twice,
 * and the copy you edit may not be the one served. Catch that here rather than
 * letting the prune pass quietly delete a hand-written file.
 */
const shadows = [];
for (const key of present) {
  if (MIRRORED.has(key)) continue;
  const dst = path.join(PUBLIC_TRAVEL, key);
  if (fs.existsSync(dst)) shadows.push(`${rel(dst)}  duplicates ${rel(path.join(CONTENT_TRAVEL, key))}`);
}
if (shadows.length) {
  console.error("\n✗  A content/ JSON is imported at build time but also exists under public/:\n");
  for (const line of shadows) console.error(`    ${line}`);
  console.error(
    "\n   Imported files need no URL, so they must live only in content/.\n" +
      "   Delete the public/ twin — or, if it really must be fetch()ed at\n" +
      "   runtime, add it to MIRRORED in scripts/sync-trip-data.mjs.\n",
  );
  process.exit(1);
}

/* Copy pass — driven entirely by MIRRORED. */
for (const key of [...MIRRORED].sort()) {
  const src = path.join(GENERATED_TRAVEL, key);
  const dst = path.join(PUBLIC_TRAVEL, key);

  /* Existence was already proven by the guard above. */
  if (sameBytes(src, dst)) continue;

  if (CHECK_ONLY) {
    drifted.push({ src: rel(src), dst: rel(dst), reason: fs.existsSync(dst) ? "differs" : "missing" });
    continue;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  copied.push(`${rel(src)} → ${rel(dst)}`);
}

/*
 * Prune pass — anything under public/data/travel/ that is not MIRRORED.
 * Reported, never inferred silently: a leftover here means a rename or a
 * deletion upstream, and out/ would keep serving the old bytes.
 */
for (const trip of fs.existsSync(PUBLIC_TRAVEL) ? fs.readdirSync(PUBLIC_TRAVEL) : []) {
  const dir = path.join(PUBLIC_TRAVEL, trip);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const name of jsonFiles(dir)) {
    const key = `${trip}/${name}`;
    if (MIRRORED.has(key)) continue;
    const dst = path.join(dir, name);
    if (CHECK_ONLY) {
      removed.push(rel(dst));
      continue;
    }
    fs.unlinkSync(dst);
    removed.push(rel(dst));
  }
}

/* Guards already ran above, before either pass — see the note there. */

if (CHECK_ONLY && (drifted.length || removed.length)) {
  console.error("\n✗ public/data/travel/ is out of sync with generated/travel/\n");
  if (drifted.length) {
    console.error("  generated/ changed but public/ was not regenerated:");
    for (const d of drifted) console.error(`    ${d.src}  (${d.reason} at ${d.dst})`);
  }
  if (removed.length) {
    console.error("  public/ has JSON that nothing declares:");
    for (const s of removed) console.error(`    ${s}`);
  }
  console.error("\n  Run `npm run sync:data` to regenerate. Edit generated/ source, not public/.\n");
  process.exit(1);
}

for (const line of copied) console.log(`  copy  ${line}`);
for (const line of removed) console.log(`  prune ${line}`);

console.log(
  `[sync] ${copied.length} copied, ${removed.length} pruned, ` +
    `${MIRRORED.size} mirrored file(s) declared.`,
);
