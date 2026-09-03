/**
 * Legacy `_texts` reader — build-time only, mirrors the loaders in
 * lib/content.ts. Backs the Blog index with the OLD SITE'S REAL posts
 * (title / date / category / first paragraph) until content migration moves
 * them into `content/blog`. Nothing here is fabricated; it only re-reads the
 * front-matter and prose the Jekyll site already published.
 *
 * Selection follows new/CONTENT_MIGRATION_AUDIT.md:
 *  - `About_zh` routes to /about/zh (a page, not a post).
 *  - `HighDim2024` routes to /project (a long-running note, not a post).
 *  - `HMC`, `NTK`, `MahalanobisAndLeverage` are HTML-commented drafts that the
 *    old site never published — excluded from v1.
 * Every remaining file is a real published post.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type LegacyCategory = "knowledge" | "cuisine" | "documentation";

/** Derived from the post's prose, honest about being an estimate. */
export type LegacyLang = "zh" | "en" | "mix";

export interface LegacyPost {
  /** Stable basename of the source file (`_texts/<slug>.md`). */
  slug: string;
  title: string;
  /** Normalised ISO date (`YYYY-MM-DD`). */
  date: string;
  category: LegacyCategory;
  /** Dominant script of the body (CJK vs Latin) — not a quality judgement. */
  lang: LegacyLang;
  /** Rough reading-time estimate in minutes. */
  minutes: number;
  /** First real paragraph of prose, cleaned, truncated for the card. */
  excerpt: string;
  /** Old published URL, kept for redirects later. */
  oldPath: string;
}

const textsDir = path.join(process.cwd(), "_texts");

/** Files that are not blog posts on the rebuilt site (see audit above). */
const NOT_BLOG = new Set<string>([
  "About_zh.md", // → /about/zh
  "HighDim2024.md", // → /project long-running note
  "HMC.md", // unpublished draft
  "NTK.md", // unpublished draft
  "MahalanobisAndLeverage.md", // unpublished draft
]);

const CATEGORIES: ReadonlySet<string> = new Set<LegacyCategory>([
  "knowledge",
  "cuisine",
  "documentation",
]);

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate(),
    ).padStart(2, "0")}`;
  }
  const parts = String(value).split(/[-/.]/).map((s) => s.trim());
  if (parts.length < 3) return null;
  const [y, m, d] = parts.map((s) => parseInt(s, 10));
  if (!y || !m || !d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const CJK_RE = /[㐀-䶿一-鿿぀-ヿ가-힣]/g;
const LATIN_RE = /[A-Za-z]{2,}/g;

function detectLang(body: string): LegacyLang {
  const cjk = (body.match(CJK_RE) ?? []).length;
  const latin = (body.match(LATIN_RE) ?? []).length;
  if (cjk === 0 && latin === 0) return "en";
  if (cjk > latin) return "zh";
  if (latin > cjk) return "en";
  return "mix";
}

/** CJK ≈300 chars/min, Latin ≈200 words/min — a rough, honest read time. */
function readingMinutes(body: string): number {
  const cjk = (body.match(CJK_RE) ?? []).length;
  const latinWords = (body.match(LATIN_RE) ?? []).length;
  const minutes = cjk / 300 + latinWords / 200;
  return Math.max(1, Math.round(minutes));
}

const SKIP_LINE = /^(#{1,6}\s|>\s?|\||[-*+]\s|\d+\.\s|```|!\[|\$\$|\s*<\/?|https?:\/\/|---)/;

function stripInline(md: string): string {
  return (
    md
      // images and links → keep the link label only
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // inline code / emphasis ticks
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      // html tags
      .replace(/<[^>]+>/g, "")
      // stray LaTeX backslash commands from mixed prose
      .replace(/\\[a-zA-Z]+/g, "")
      .replace(/[$\\{}()[\]]/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function firstParagraph(body: string): string {
  const paras: string[] = [];
  let current = "";
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (current) {
        paras.push(current);
        current = "";
      }
      continue;
    }
    if (SKIP_LINE.test(line)) continue;
    current += (current ? " " : "") + line;
  }
  if (current) paras.push(current);

  let text = "";
  for (const para of paras) {
    const cleaned = stripInline(para);
    if (cleaned.length >= 40) {
      text = cleaned;
      break;
    }
    if (!text) text = cleaned;
  }
  if (text.length <= 220) return text;
  const cut = text.slice(0, 220);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 120 ? cut.slice(0, lastSpace) : cut).replace(/\s+$/, "") + " …";
}

function readPost(file: string): LegacyPost | null {
  const raw = fs.readFileSync(path.join(textsDir, file), "utf8");
  const { data, content } = matter(raw);
  const title = typeof data.title === "string" ? data.title.trim() : file.replace(/\.md$/, "");
  const date = normalizeDate(data.date);
  const category = String(data.category ?? "").toLowerCase();
  if (!date) return null;
  if (!CATEGORIES.has(category)) return null;

  return {
    slug: file.replace(/\.md$/i, ""),
    title,
    date,
    category: category as LegacyCategory,
    lang: detectLang(content),
    minutes: readingMinutes(content),
    excerpt: firstParagraph(content),
    oldPath: `/texts/${file.replace(/\.md$/i, "")}/`,
  };
}

/** Published blog posts, newest first (each call re-reads disk — build-time). */
export function getLegacyPosts(): LegacyPost[] {
  const files = fs
    .readdirSync(textsDir)
    .filter((f) => f.toLowerCase().endsWith(".md") && !NOT_BLOG.has(f))
    .sort();
  const posts = files.map(readPost).filter((p): p is LegacyPost => p !== null);
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}
