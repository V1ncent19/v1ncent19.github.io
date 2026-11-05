/**
 * The ONE bilingual text primitive (2026-10-17 consolidation).
 *
 * Before this file the site had nine different ways of writing "the same field
 * in two languages" — two markdown files, `{ en, zh }` nesting, `summaryZh`
 * suffixes, `place_en` columns, and one field whose Chinese was the base and
 * the English the optional extra. Two of those resolved in OPPOSITE directions,
 * so the same missing translation behaved differently on different pages.
 *
 * The rules now, and nothing else:
 *
 *   1. A translatable STRING field is `{ en, zh }` — an object, never a key
 *      suffix. `summaryZh` / `nameEn` / `place_en` are build errors.
 *   2. `en` is the base. A missing `zh` falls back to English. A Chinese-only
 *      row (rare, legacy) falls back the other way — still through `pick()`,
 *      so there is exactly ONE resolver in the codebase.
 *   3. A language-NEUTRAL field stays a plain `string`: proper names (a
 *      project's title, a paper's citation), file-format acronyms inside the
 *      chrome, coordinates, and gallery `alt` captions.
 *   4. Anything not covered by (1) or (3) is a design bug, not a third option.
 *
 * Consumers must call `pick()` rather than indexing `text[lang]` — indexing
 * skips the fallback and is how blank fields ship unnoticed.
 */

export type Lang = "en" | "zh";

/** A translatable string. At least one side should be non-empty; `pick()`
 *  returns "" when both are missing (`check:i18n` lists those rows). */
export interface Localized {
  en?: string;
  zh?: string;
}

/** Both sides required — for UI-critical text where a fallback would be a
 *  visible bug (nav labels, hub-card titles, the site role). */
export interface Bilingual {
  en: string;
  zh: string;
}

/** A translatable list (CV bullet lines). Same fallback rule as `Localized`,
 *  but an EMPTY array counts as missing: `zh: []` means "not translated yet",
 *  not "this entry has no bullets". */
export interface LocalizedList {
  en?: string[];
  zh?: string[];
}

function other(lang: Lang): Lang {
  return lang === "en" ? "zh" : "en";
}

/**
 * Resolve a localized field for one language.
 *
 * A plain `string` passes straight through — that is the language-neutral
 * case (rule 3 above), not an accident, so `pick()` never has to be wrapped
 * in `typeof` checks at call sites that may receive either shape.
 */
export function pick(
  text: Localized | string | undefined | null,
  lang: Lang,
): string {
  if (typeof text === "string") return text.trim();
  if (!text) return "";
  return text[lang]?.trim() || text[other(lang)]?.trim() || "";
}

/** Resolve a localized list. A plain `string[]` passes through unchanged. */
export function pickList(
  list: LocalizedList | string[] | undefined | null,
  lang: Lang,
): string[] {
  if (Array.isArray(list)) return list;
  if (!list) return [];
  const here = list[lang];
  if (here && here.length > 0) return here;
  return list[other(lang)] ?? [];
}
