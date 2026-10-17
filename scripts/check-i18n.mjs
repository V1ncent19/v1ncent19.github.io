#!/usr/bin/env node
/**
 * check-i18n.mjs — fail the build when content/ uses a retired bilingual shape.
 *
 *   node scripts/check-i18n.mjs
 *   npm run check:i18n
 *
 * WHY THIS EXISTS
 *   Translatable text used to be written nine different ways — `{ en, zh }`
 *   nesting, `summaryZh` suffixes, `place_en` columns, and one field whose
 *   Chinese was the base and the English the optional extra. Two of those
 *   resolved in OPPOSITE directions, and every wrong key name was SILENT:
 *   `placeEn` instead of `place_en` is a valid JSON key that renders an empty
 *   string. `check-refs.mjs` only validates `/assets/` paths, and TypeScript
 *   never sees JSON content, so nothing caught it.
 *
 *   lib/localized.ts now states the rule; this script enforces it on the data.
 *
 * WHAT IT CHECKS
 *   1. RETIRED KEY FORMS — `foo_en` / `foo_zh` / `fooZh` / `fooEn` anywhere in
 *      content/. Use `foo: { en, zh }`.
 *   2. EMPTY LOCALIZED OBJECT — a `{ en, zh }` with both sides blank. That is
 *      always a leftover stub; delete the field or fill it.
 *   3. UNTRANSLATED SIDES — reported, not fatal. Print says how many rows are
 *      missing `zh` (normal for a while) or missing `en` (English is the base,
 *      so these want filling).
 *
 * WHAT IT DOES NOT CHECK
 *   - Whether a translation is any good.
 *   - Components that index `text[lang]` instead of calling `pick()`. That is
 *     a review rule (see the header of lib/localized.ts), not a data shape.
 *   - Language-neutral strings (a project title, a citation, a gallery `alt`).
 *     Those are allowed to be single — see rule 3 in lib/localized.ts.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");

/** `place_en`, `place_zh`, `titleZh`, `nameEn` — every retired spelling. */
const RETIRED_KEY = /^(?:[A-Za-z][A-Za-z0-9]*_(?:en|zh)|[A-Za-z][A-Za-z0-9]*(?:Zh|En))$/;

const errors = [];
const untranslated = new Map(); // "file → field" -> { en: n, zh: n }

function bump(key, side) {
  const row = untranslated.get(key) ?? { en: 0, zh: 0 };
  row[side] += 1;
  untranslated.set(key, row);
}

/** A side counts as present when it has a non-empty string, a non-empty array
 *  or a non-null scalar (`profile.cv` holds paths, one of which is null). */
function filled(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Walk a parsed value. `trail` is the dotted path used in messages, and the
 * field name is the last segment (indices are dropped so a 48-row gallery
 * reports one line, not 48).
 */
function walk(value, trail, file) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, trail, file);
    return;
  }
  if (!value || typeof value !== "object") return;

  const keys = Object.keys(value);
  const looksLocalized =
    keys.length > 0 && keys.every((k) => k === "en" || k === "zh");

  if (looksLocalized) {
    const hasEn = filled(value.en);
    const hasZh = filled(value.zh);
    if (!hasEn && !hasZh) {
      errors.push(`${file} → ${trail}: { en, zh } is empty on both sides`);
    } else {
      if (!hasZh) bump(`${file} → ${trail}`, "zh");
      if (!hasEn) bump(`${file} → ${trail}`, "en");
    }
    return;
  }

  for (const key of keys) {
    if (RETIRED_KEY.test(key)) {
      errors.push(
        `${file} → ${trail ? `${trail}.` : ""}${key}: retired bilingual key — ` +
          `use \`${key.replace(/(?:_(?:en|zh)|Zh|En)$/, "")}: { en, zh }\``,
      );
    }
    walk(value[key], trail ? `${trail}.${key}` : key, file);
  }
}

function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else yield full;
  }
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

for (const file of files(CONTENT_DIR)) {
  const ext = path.extname(file);
  const src = fs.readFileSync(file, "utf8");

  if (ext === ".json") {
    try {
      walk(JSON.parse(src), "", rel(file));
    } catch (err) {
      errors.push(`${rel(file)}: not valid JSON — ${err.message}`);
    }
  } else if (ext === ".md" || ext === ".mdx") {
    if (src.startsWith("---")) {
      const { data } = matter(src);
      walk(data, "", rel(file));
    }
  } else if (ext === ".ts" || ext === ".tsx") {
    /* Strip comments and string literals so only real property names remain
       (a doc comment mentioning `titleZh` must not fail the build, and neither
       must the word "en" inside a translation). */
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/`(?:[^`\\]|\\.)*`/g, "``");

    for (const match of code.matchAll(/(\w+)\s*\??\s*:/g)) {
      if (RETIRED_KEY.test(match[1])) {
        errors.push(
          `${rel(file)}: retired bilingual key \`${match[1]}\` — ` +
            `use \`${match[1].replace(/(?:_(?:en|zh)|Zh|En)$/, "")}: { en, zh }\``,
        );
      }
    }
  }
}

if (untranslated.size > 0) {
  const rows = [...untranslated.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  console.log("[i18n] translation coverage (missing side, by field):");
  for (const [key, count] of rows) {
    const parts = [];
    if (count.zh) parts.push(`${count.zh} without zh`);
    if (count.en) parts.push(`${count.en} without en`);
    console.log(`  ${key} — ${parts.join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error(`\n[i18n] ${errors.length} problem(s):`);
  for (const message of errors) console.error(`  ✗ ${message}`);
  console.error(
    "\nRule: translatable text is `{ en, zh }` — see lib/localized.ts.\n",
  );
  process.exit(1);
}

console.log("[i18n] ok — every localized field is `{ en, zh }`.");
