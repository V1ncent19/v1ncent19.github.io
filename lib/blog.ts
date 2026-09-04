/**
 * Blog reader — build-time only, mirrors the loaders in lib/content.ts. Reads
 * the published posts in `content/blog/*.md` and backs the Blog index, the
 * home recent-posts feed, and the per-post pages. Each file carries its own
 * front-matter (title / date / category) plus a Markdown body; nothing here is
 * fabricated.
 *
 * `content/blog/_drafts/` holds unpublished drafts. The non-recursive readdir
 * below only sees top-level `*.md`, so drafts in that subdirectory never
 * publish.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlogCategory = "knowledge" | "cuisine" | "documentation";

/** Derived from the post's prose, honest about being an estimate. */
export type BlogLang = "zh" | "en" | "mix";

export interface BlogPost {
  /**
   * Canonical post slug — the kebab-cased basename used in the stable URL
   * `/blog/<year>/<slug>`. E.g. `content/blog/BestLinearEstimator.md` →
   * `best-linear-estimator`.
   */
  slug: string;
  title: string;
  /** Normalised ISO date (`YYYY-MM-DD`). */
  date: string;
  category: BlogCategory;
  /** Dominant script of the body (CJK vs Latin) — not a quality judgement. */
  lang: BlogLang;
  /** Rough reading-time estimate in minutes. */
  minutes: number;
  /** First real paragraph of prose, cleaned, truncated for the card. */
  excerpt: string;
  /** Full Markdown body, rendered on the post page. */
  body: string;
}

/**
 * Serialisable blog-card payload handed from the server pages to the client
 * Blog index. `titleParts` / `excerptParts` are hydrated with KaTeX html
 * (lib/lede-math.ts) so cards typeset inline math; `titleText` / `excerptText`
 * are the plain prose (math dropped) that search matches and highlights.
 */
export interface BlogPostCard {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: BlogCategory;
  lang: BlogLang;
  minutes: number;
  titleParts: LedPart[];
  excerptParts: LedPart[];
  titleText: string;
  excerptText: string;
}

const blogDir = path.join(process.cwd(), "content", "blog");

const CATEGORIES: ReadonlySet<string> = new Set<BlogCategory>([
  "knowledge",
  "cuisine",
  "documentation",
]);

/** Filenames whose naive camel-split would read wrong (acronym words). */
const SLUG_OVERRIDES: Readonly<Record<string, string>> = {
  LaTeX: "latex",
};

/**
 * Basename → stable lower-kebab slug for the URL. Splits camelCase/digit
 * boundaries and `_` separators only (acronym runs such as `RKHS` or `RPackage`
 * stay one token); every class-string-free pure string operation, so slugs are
 * deterministic across builds.
 */
function slugifyFilename(base: string): string {
  const override = SLUG_OVERRIDES[base];
  if (override) return override;
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s.]+/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function detectLang(body: string): BlogLang {
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

/* ---------------------------------------------------------------------------
 * Card ledes — readable prose + typeset inline math.
 *
 * Post bodies interleave prose with MathJax `$…$` (inline) and `$$…$$`
 * (display) math. The plain-text excerpt would strip backslash commands and
 * the `$ { } ( ) [ ]` characters but keeps `_ ^ = &`, so any paragraph glued to
 * a `\begin{align}` block (no blank line between them) would degrade into
 * "align N 0 =0, N t 0 , …" garbage on the cards. Instead we carve the body
 * into PROSE RUNS — a run ends at a blank line or any structural line
 * (heading / list / fence / `$$` / HTML) — keep the first readable run, and
 * split it into alternating text + inline-math segments. Cards can then
 * typeset the math with KaTeX while search & highlight operate on clean prose.
 * Display `$$` blocks are deliberately not part of a card lede (not a
 * sentence), and titles go through the same tokenizer so `$\bar{X}$` no longer
 * shows its source in a heading.
 *
 * LedPart.hmtl is filled in by lib/lede-math.ts (KaTeX) at build time; the
 * pure tokenizer here leaves it empty. `math` segments never carry markdown,
 * so rendering them needs no rehype-raw sanitizer.
 * ------------------------------------------------------------------------- */

export type LedPart =
  | { kind: "text"; value: string }
  | { kind: "math"; value: string; html: string };

export interface LedeSource {
  /** Text/math segments for the card (math html left empty). */
  parts: LedPart[];
  /** Readable text version (math dropped) for meta descriptions / home. */
  plain: string;
}

/** Inline `$…$` / `$$…$$` on one logical line (not own-line display blocks). */
const INLINE_MATH_RE = /(\${1,2})([^$]+?)\1/g;

/** Lines that end a prose run without joining it (also never part of a lede). */
const STRUCT_LINE_RE =
  /^(#{1,6}\s|>\s?|\||[-*+]\s|\d+\.\s|```|!\[|<|---|<!--)/;

/**
 * Split a body into runs of contiguous plain-text lines. Display math on its
 * own line (`$$…$$`) and `\begin{…}…\end{…}` environments are swallowed whole
 * — a paragraph is never allowed to "merge" across them (that is what would
 * smear `\begin{align}` bodies into the card excerpt).
 */
function proseRuns(body: string): string[] {
  const runs: string[] = [];
  let cur: string[] = [];
  let inDisplay = false; // inside own-line `$$` … `$$`
  let inEnv = false; // inside \begin{…} … \end{…} without `$$` wrapping
  const flush = (): void => {
    if (cur.length) {
      runs.push(cur.join("\n"));
      cur = [];
    }
  };
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^\$\$/.test(line)) {
      if (!inDisplay && !inEnv && cur.length) flush();
      inDisplay = !inDisplay;
      continue;
    }
    if (inDisplay) continue;
    if (/^\\begin\{[^}]*\}/.test(line)) {
      if (cur.length) flush();
      inEnv = true;
      continue;
    }
    if (/^\\end\{[^}]*\}/.test(line)) {
      if (cur.length) flush();
      inEnv = false;
      continue;
    }
    if (inEnv) continue;
    if (STRUCT_LINE_RE.test(line)) {
      flush();
      continue;
    }
    cur.push(rawLine.trim());
  }
  flush();
  return runs;
}

/**
 * Light inline-markdown cleanup for a TEXT segment (never runs on math, whose
 * `$…$` was already carved out, so backslash removal is safe here). Whitespace
 * is collapsed but NOT trimmed: the leading/trailing space around an inline
 * math token is what keeps glyphs separated from surrounding words.
 */
function cleanTextSeg(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, "$1$2")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\+/g, " ") // stray LaTeX line-break backslashes in prose
    .replace(/\s+/g, " ");
}

/** Split raw text into alternating cleaned-text / inline-math segments. */
function tokenizeInlineMath(raw: string): LedPart[] {
  const parts: LedPart[] = [];
  let last = 0;
  const re = new RegExp(INLINE_MATH_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const text = cleanTextSeg(raw.slice(last, m.index));
    if (text) parts.push({ kind: "text", value: text });
    const tex = m[2].trim();
    if (tex) parts.push({ kind: "math", value: tex, html: "" });
    last = m.index + m[0].length;
  }
  const tail = cleanTextSeg(raw.slice(last));
  if (tail) parts.push({ kind: "text", value: tail });

  if (!parts.length) {
    const v = cleanTextSeg(raw).trim();
    return v ? [{ kind: "text", value: v }] : [];
  }
  // Trim only the run's outer edges; interior spaces around math stay.
  const first = parts[0];
  if (first.kind === "text" && first.value) {
    parts[0] = { ...first, value: first.value.replace(/^\s+/, "") };
  }
  const lastPart = parts[parts.length - 1];
  if (lastPart.kind === "text" && lastPart.value) {
    parts[parts.length - 1] = {
      ...lastPart,
      value: lastPart.value.replace(/\s+$/, ""),
    };
  }
  return parts.filter((p) => p.value.length > 0);
}

/** Visible prose (text segments joined) — what search matches against. */
export function ledSearchText(parts: LedPart[]): string {
  return parts
    .filter((p) => p.kind === "text")
    .map((p) => p.value)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rough on-screen width: a math token is narrower than its TeX source. */
function segWidth(p: LedPart): number {
  return p.kind === "text" ? p.value.length : p.value.length * 0.6;
}

/** Trim a part list to the card budget, always keeping the first part. */
function capParts(parts: LedPart[], budget: number): { parts: LedPart[]; cut: boolean } {
  if (parts.reduce((a, p) => a + segWidth(p), 0) <= budget) {
    return { parts, cut: false };
  }
  const out: LedPart[] = [];
  let w = 0;
  for (let i = 0; i < parts.length; i++) {
    const pw = segWidth(parts[i]);
    if (w > 0 && w + pw > budget) break;
    out.push(parts[i]);
    w += pw;
  }
  const last = out[out.length - 1];
  if (last && last.kind === "text") {
    const allow = Math.max(24, Math.floor(budget - (w - last.value.length)));
    if (last.value.length > allow) {
      let s = last.value.slice(0, allow).replace(/\s+$/, "");
      const sp = s.lastIndexOf(" ");
      if (sp > 0) s = s.slice(0, sp);
      if (s) out[out.length - 1] = { kind: "text", value: s };
    }
  }
  return { parts: out, cut: true };
}

/**
 * Choose the lede run: the EARLIEST run with ≥ LEAD_MIN visible chars — a
 * genuine sentence, even a short lead like "For optimize problem in convex
 * set…" — before a later, longer paragraph. Only if nothing reaches the bar do
 * we fall back to the first run with any text (formula fragments and captions
 * stay under LEAD_MIN and are skipped).
 */
const LEAD_MIN = 16;

function chooseRun(runs: string[]): string | null {
  let fallback: string | null = null;
  for (const run of runs) {
    const parts = tokenizeInlineMath(run);
    const len = ledSearchText(parts).length;
    if (!fallback && len > 0) fallback = run;
    if (len >= LEAD_MIN) return run;
  }
  return fallback;
}

const EXCERPT_BUDGET = 200;

/** Card excerpt for a post body (parts + plain text version). */
export function excerptLed(body: string): LedeSource {
  const run = chooseRun(proseRuns(body));
  if (!run) return { parts: [], plain: "" };
  const { parts, cut } = capParts(tokenizeInlineMath(run), EXCERPT_BUDGET);
  const plain = ledSearchText(parts);
  return { parts, plain: cut && plain ? `${plain} …` : plain };
}

/** Title segments (same tokenizer — never truncated). */
export function titleLed(title: string): LedPart[] {
  const parts = tokenizeInlineMath(title);
  return parts.length ? parts : [{ kind: "text", value: title.trim() }];
}

function readPost(file: string): BlogPost | null {
  const raw = fs.readFileSync(path.join(blogDir, file), "utf8");
  const { data, content } = matter(raw);
  const body = content;
  const title = typeof data.title === "string" ? data.title.trim() : file.replace(/\.md$/, "");
  const date = normalizeDate(data.date);
  const category = String(data.category ?? "").toLowerCase();
  if (!date) return null;
  if (!CATEGORIES.has(category)) return null;

  const base = file.replace(/\.md$/i, "");
  return {
    slug: slugifyFilename(base),
    title,
    date,
    category: category as BlogCategory,
    lang: detectLang(body),
    minutes: readingMinutes(body),
    excerpt: excerptLed(body).plain,
    body,
  };
}

/** Canonical static path for a post: `/blog/<year>/<slug>` (trailingSlash). */
export function blogPostPath(post: Pick<BlogPost, "date" | "slug">): string {
  return `/blog/${post.date.slice(0, 4)}/${post.slug}`;
}

/** Published blog posts, newest first (each call re-reads disk — build-time). */
export function getBlogPosts(): BlogPost[] {
  const files = fs
    .readdirSync(blogDir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort();
  const posts = files.map(readPost).filter((p): p is BlogPost => p !== null);
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Two files must never collapse onto one exported route — the static export
  // would silently overwrite a page. Guard loudly instead.
  const seen = new Map<string, string>();
  for (const post of posts) {
    const key = `${post.date.slice(0, 4)}/${post.slug}`;
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw new Error(
        `[lib/blog] duplicate blog path /blog/${key}/ — "${previous}" and ` +
          `"${post.title}" map to the same slug. Rename one source file.`,
      );
    }
    seen.set(key, post.title);
  }
  return posts;
}

/** Look up one post by its URL year + kebab slug (404 → `undefined`). */
export function getBlogPost(year: string, slug: string): BlogPost | undefined {
  return getBlogPosts().find(
    (p) => p.date.slice(0, 4) === year && p.slug === slug,
  );
}
