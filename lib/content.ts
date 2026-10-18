/**
 * Build-time content layer. Everything under /content is read from disk at
 * export time (this repo is fully static, `output: "export"`), so these
 * loaders double as a schema: malformed front-matter fails the build loudly
 * instead of shipping a half-empty page.
 *
 * These modules touch `node:fs` and must only be imported from server
 * components / page files — never from a client component.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { pick, type Lang, type Localized } from "@/lib/localized";

const contentRoot = path.join(process.cwd(), "content");

/* ---------------------------------------------------------------------------
 * Profile
 * ------------------------------------------------------------------------- */

export interface ProfileLink {
  label: string;
  href: string;
}

export interface Profile {
  handle: string;
  givenName: string;
  familyName: string;
  tagline: string;
  role: { en: string; zh: string };
  /** Current institution, printed after the role on the CV identity card. */
  affiliation: string;
  /** Where I am from (city/province/country) — shown as-is in both languages. */
  location: string;
  avatar: string;
  cv: { en: string | null; zh: string | null };
  email: string;
  /** Optional LinkedIn profile URL — currently shown only on the CV contact
   *  card (home intentionally lists GitHub-only links). */
  linkedin?: string;
  links: ProfileLink[];
  /** PV/UV baselines to be filled in at final migration (legacy busuanzi). */
  legacyStats: { sitePvBaseline: number; siteUvBaseline: number };
  /** Site content license, shown on the home metadata card. `href` optional
   * (a bare label like "CC BY-NC-SA 4.0" is common). Optional so older
   * profile.json files without it keep type-checking. */
  license?: { label: string; href: string };
}

const profilePath = path.join(contentRoot, "site", "profile.json");

export function getProfile(): Profile {
  const raw = fs.readFileSync(profilePath, "utf8");
  return JSON.parse(raw) as Profile;
}

/* ---------------------------------------------------------------------------
 * About (markdown, one file per language)
 * ------------------------------------------------------------------------- */

/** One language. Alias of `Lang` so the content layer and the UI layer cannot
 *  drift into two different "en" | "zh" unions. */
export type ContentLang = Lang;

export function getAbout(lang: ContentLang): string {
  const file = path.join(contentRoot, "about", `${lang}.md`);
  return fs.readFileSync(file, "utf8");
}

/**
 * About markdown split at the FIRST `## ` heading (2026-09-07 merge): the
 * pre-heading part is the page intro (greeting + CV pointer) and renders
 * above the General Information block; everything from the first heading on
 * (Hobbies …) renders below it. Keeps one source file while letting the
 * structured 基本信息 section sit between the two prose halves.
 */
export function getAboutParts(lang: ContentLang): {
  intro: string;
  body: string;
} {
  const md = getAbout(lang);
  const idx = md.search(/^## /m);
  if (idx === -1) return { intro: md, body: "" };
  return { intro: md.slice(0, idx), body: md.slice(idx) };
}

/* ---------------------------------------------------------------------------
 * Project index (markdown + front-matter, one file per project)
 * ------------------------------------------------------------------------- */

export type ProjectType = "note" | "tool" | "paper" | "demo";
export type ProjectStatus = "active" | "completed" | "paused" | "archived";

export interface ProjectFrontmatter {
  title: string;
  slug: string;
  type: ProjectType;
  status: ProjectStatus;
  startedAt?: string;
  updatedAt?: string;
  featured?: boolean;
  tags?: string[];
  links?: ProfileLink[];
  /** Optional PDF asset that summarises / constitutes the project. */
  pdf?: string;
  /**
   * Card / page summary as `{ en, zh }` (2026-10-17: was `summary` +
   * `summaryZh`). Read it through `projectSummary()`, never directly — that is
   * where the fallback lives.
   *
   * `title` stays a plain string on purpose: a project name is a proper noun
   * ("Tsinghua Feiyue Handbook"), i.e. language-neutral under rule 3 of
   * lib/localized.ts. If a project ever needs a real Chinese name, give it the
   * same `{ en, zh }` treatment rather than a `titleZh` suffix.
   */
  summary?: Localized;
}

export interface Project {
  meta: ProjectFrontmatter;
  /** Markdown body of the project page. */
  body: string;
}

const PROJECT_TYPES: ReadonlySet<string> = new Set<ProjectType>([
  "note",
  "tool",
  "paper",
  "demo",
]);
const PROJECT_STATUSES: ReadonlySet<string> = new Set<ProjectStatus>([
  "active",
  "completed",
  "paused",
  "archived",
]);

const projectDir = path.join(contentRoot, "project");

/**
 * Validate a `{ en, zh }` value. A bare string or a `*Zh` sibling is a build
 * error rather than a silent in-memory migration — accepting both shapes is
 * exactly how this repo accumulated nine of them.
 */
function readLocalized(
  value: unknown,
  field: string,
  where: string,
): Localized | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    throw new Error(
      `[${where}] \`${field}\` must be an object { en, zh }; a bare string is ` +
        `the retired single-language form.`,
    );
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`[${where}] \`${field}\` must be an object { en, zh }.`);
  }
  const o = value as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => k !== "en" && k !== "zh");
  if (extra.length > 0) {
    throw new Error(
      `[${where}] \`${field}\` has unknown key(s) ${extra.join(", ")} — only ` +
        `"en" and "zh" are allowed.`,
    );
  }
  const out: Localized = {};
  if (typeof o.en === "string" && o.en.trim()) out.en = o.en.trim();
  if (typeof o.zh === "string" && o.zh.trim()) out.zh = o.zh.trim();
  if (!out.en && !out.zh) {
    throw new Error(
      `[${where}] \`${field}\` is empty — fill "en" (the base) or "zh".`,
    );
  }
  return out;
}

/** Reject a retired `*Zh` / `*En` / `*_zh` key with a message that says the fix. */
function rejectLegacyKeys(
  raw: Record<string, unknown>,
  where: string,
  retired: string[],
): void {
  for (const key of retired) {
    if (raw[key] !== undefined) {
      throw new Error(
        `[${where}] \`${key}\` is retired — nest it instead: ` +
          `\`${key.replace(/(Zh|En|_[a-z]{2})$/, "")}: { en: …, zh: … }\`.`,
      );
    }
  }
}

function readProjectFile(file: string): Project {
  const raw = fs.readFileSync(path.join(projectDir, file), "utf8");
  const { data, content } = matter(raw);
  const meta = data as Partial<ProjectFrontmatter>;
  const where = `content/project/${file}`;

  rejectLegacyKeys(data as Record<string, unknown>, where, ["summaryZh"]);

  const errors: string[] = [];
  const require = (key: keyof ProjectFrontmatter) => {
    if (meta[key] === undefined || meta[key] === "" || meta[key] === null) {
      errors.push(`missing required front-matter field \`${key}\``);
    }
  };
  require("title");
  require("slug");
  require("type");
  require("status");

  if (meta.type !== undefined && !PROJECT_TYPES.has(meta.type as string)) {
    errors.push(`\`type\` must be one of ${[...PROJECT_TYPES].join(" / ")}`);
  }
  if (meta.status !== undefined && !PROJECT_STATUSES.has(meta.status as string)) {
    errors.push(
      `\`status\` must be one of ${[...PROJECT_STATUSES].join(" / ")}`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `[${where}] invalid front-matter:\n  - ${errors.join("\n  - ")}`,
    );
  }

  return {
    meta: {
      title: meta.title!,
      slug: meta.slug!,
      type: meta.type as ProjectType,
      status: meta.status as ProjectStatus,
      startedAt: meta.startedAt,
      updatedAt: meta.updatedAt,
      featured: meta.featured ?? false,
      tags: meta.tags ?? [],
      links: meta.links ?? [],
      pdf: meta.pdf,
      summary: readLocalized(meta.summary, "summary", where),
    },
    body: content,
  };
}

function byPriority(a: Project, b: Project): number {
  const featured = Number(b.meta.featured) - Number(a.meta.featured);
  if (featured !== 0) return featured;
  // Most recently updated first; unset dates sort last.
  const au = a.meta.updatedAt ? Date.parse(a.meta.updatedAt) : -Infinity;
  const bu = b.meta.updatedAt ? Date.parse(b.meta.updatedAt) : -Infinity;
  return bu - au;
}

/** All projects, read fresh each call (cheap, build-time only). */
export function getProjects(): Project[] {
  const files = fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  return files.map(readProjectFile).sort(byPriority);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getProjects().find((p) => p.meta.slug === slug);
}

export function projectSummary(project: Project, lang: ContentLang): string {
  return pick(project.meta.summary, lang);
}

/**
 * Marker that splits a project body into its English and Chinese halves.
 *
 * One md file, two bodies, separated by an HTML comment — invisible when the
 * file is read as markdown on GitHub, impossible to confuse with prose, and
 * still a single file to open and edit. Above the marker is English, below it
 * Chinese.
 *
 * NO marker (the common case) means "one body for both languages": either the
 * text is language-neutral, or the author deliberately interleaves the two
 * (content/project/stat-summary-note.md is like that — the note is written in
 * both languages, paragraph by paragraph, for both audiences). Splitting such
 * a file would mean rewriting it, which is an editorial decision, not a
 * formatting one.
 */
const ZH_BODY_MARKER = /^<!--\s*zh\s*-->\s*$/m;

export function projectBody(project: Project, lang: ContentLang): string {
  const body = project.body;
  const match = ZH_BODY_MARKER.exec(body);
  if (!match) return body.trim();

  const en = body.slice(0, match.index).trim();
  const zh = body.slice(match.index + match[0].length).trim();
  const wanted = lang === "zh" ? zh : en;
  return wanted || en || zh;
}

/* ---------------------------------------------------------------------------
 * Gallery manifest (content/travel/gallery/items.json, generated by `gallery:gen`)
 * ------------------------------------------------------------------------- */

/**
 * One gallery item. HUMAN fields are yours to fill in items.json; `npm run
 * gallery:gen` preserves whatever you write and only refreshes id / source /
 * date / lat / lon / dimensions / asset URLs. Deleting a row removes a photo.
 *
 * Bilingual text is `{ en, zh }` everywhere (2026-10-17: the flat
 * `place_en` / `place_zh` columns are retired — read through `pick()`):
 *   - `place`      — country + city (e.g. "Kaohsiung, Taiwan" / 高雄); the
 *     accent big title on the hover card and the resting-bar place.
 *   - `placeLocal` — the specific spot / scenic name ("Shoushan Lookout" /
 *     壽山觀景臺); the small grey line on the hover card.
 *   - `title`      — main heading of the opened (lightbox) card. Sparse on
 *     purpose: most photos have none and fall back to `place`.
 * `alt` is deliberately SINGLE: one language-neutral caption, shown in both
 * languages, never translated (rule 3 of lib/localized.ts).
 *
 * Theme colour is CONTROLLED by `featured` — the curated collection (精选集):
 * `gallery:gen` derives `color` from it (featured → the curated orange-red
 * accent, otherwise "" → the default-blue site brand), and the UI follows the
 * same rule live, so flipping `featured` recolours the photo immediately.
 *
 * Other shared fields: `country_code` (ISO 3166-1 alpha-2, e.g. "TW"), `badge`
 * (travel-stamp preset key, "" → generic placeholder stamp), `originalUrl`
 * (EXTERNAL full-res link only — see the field doc below; the local originals
 * are not published).
 */
export interface GalleryItem {
  /** Stable key derived from the original filename; also the asset basename. */
  id: string;
  /** Source filename — the join key between the manifest row and the photo.
   *  The files themselves are NOT in the repo (see `originalUrl`). */
  source: string;
  /** Real capture date, YYYY-MM-DD (EXIF DateTimeOriginal); "" when unknown. */
  date: string;
  /** Country + city (hover big title / resting place). */
  place: Localized;
  /** The specific spot / scenic name (hover small line). */
  placeLocal: Localized;
  /** Heading of the opened card — sparse; falls back to `place`. */
  title: Localized;
  /** Single, language-neutral caption shown in the opened card (never split). */
  alt: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "TW"); "" while unknown. */
  country_code: string;
  /** EXTERNAL (http/https) link to the full-resolution original, e.g. a
   * cloud-drive / CDN share. "" when the photo has none — which is the norm:
   * the local 142 MB original tier is NOT published (2026-10-18), so only a
   * hand-authored external url ever brings back the lightbox download button. */
  originalUrl: string;
  /** Curated-collection flag (精选集). Controls the theme accent (see header):
   * featured → curated orange-red, else the default-blue site brand. */
  featured: boolean;
  /** Decimal-degree latitude (EXIF GPS, script-extracted); null when unknown. */
  lat: number | null;
  /** Decimal-degree longitude (EXIF GPS, script-extracted); null when unknown. */
  lon: number | null;
  /** Theme accent hex like "#c8441f"; "" → site brand fallback. Derived from
   * `featured` by `gallery:gen` each run (kept in the manifest for inspection). */
  color: string;
  /** Travel-stamp badge preset key; "" → generic placeholder stamp. */
  badge: string;
  thumb: string;
  large: string;
  /** Oriented on-screen dimensions of the `large` tier, px. */
  width: number;
  height: number;
}

const galleryPath = path.join(
  contentRoot,
  "travel",
  "gallery",
  "items.json",
);

function parseGalleryRow(row: unknown, i: number): GalleryItem {
  const o = row as Record<string, unknown>;
  const err = (msg: string) =>
    new Error(`[content/travel/gallery/items.json] row ${i}: ${msg}`);
  const str = (k: string, dflt = "") =>
    typeof o[k] === "string" ? (o[k] as string) : dflt;
  const num = (k: string): number => {
    const v = o[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw err(`\`${k}\` must be a finite number`);
    }
    return v;
  };
  // Optional numeric — GPS coordinates may be absent (null / not a number).
  const maybeNum = (k: string): number | null => {
    const v = o[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const id = str("id");
  if (!id) throw err("missing `id`");
  const thumb = str("thumb");
  if (!thumb) throw err("missing `thumb`");
  const large = str("large");
  if (!large) throw err("missing `large`");

  /* `place` / `placeLocal` / `title` are `{ en, zh }`. An empty side is fine
     (falls back through `pick()`), but a flat `*_en` column is a hard error. */
  const loc = (k: "place" | "placeLocal" | "title"): Localized => {
    for (const retired of [`${k}_en`, `${k}_zh`]) {
      if (o[retired] !== undefined) {
        throw err(
          `\`${retired}\` is retired — use \`${k}: { "en": …, "zh": … }\``,
        );
      }
    }
    const v = o[k];
    if (v === undefined || v === null) return {};
    if (typeof v !== "object" || Array.isArray(v)) {
      throw err(`\`${k}\` must be an object { en, zh }`);
    }
    const rec = v as Record<string, unknown>;
    const out: Localized = {};
    if (typeof rec.en === "string" && rec.en.trim()) out.en = rec.en.trim();
    if (typeof rec.zh === "string" && rec.zh.trim()) out.zh = rec.zh.trim();
    return out;
  };

  return {
    id,
    source: str("source"),
    date: str("date"),
    place: loc("place"),
    placeLocal: loc("placeLocal"),
    title: loc("title"),
    alt: str("alt"),
    country_code: str("country_code"),
    originalUrl: str("originalUrl"),
    featured: o.featured === true,
    lat: maybeNum("lat"),
    lon: maybeNum("lon"),
    color: str("color"),
    badge: str("badge"),
    thumb,
    large,
    width: num("width"),
    height: num("height"),
  };
}

/** All gallery rows in manifest order. Throws loudly on malformed JSON. */
export function getGalleryItems(): GalleryItem[] {
  const raw = fs.readFileSync(galleryPath, "utf8");
  const rows = JSON.parse(raw) as unknown;
  if (!Array.isArray(rows)) {
    throw new Error("[content/travel/gallery/items.json] expected an array of rows");
  }
  return rows.map(parseGalleryRow);
}

/* ---------------------------------------------------------------------------
 * About records: travel checklist + personality timeline (content/about/*.json)
 * Loaded on the server page and passed down as props into the client
 * FactsBoard (client components must never import this module — node:fs).
 * ------------------------------------------------------------------------- */

/** One place on the About travel checklist. `name` and `note` are `{ en, zh }`
 * (2026-10-17: `name` used to be the Chinese base with an optional `nameEn` —
 * the only field in the repo whose fallback ran the other way). lat/lon are
 * optional WGS84 decimal degrees — BOTH must be present for the place to get
 * a marker dot on the globe; absent coords simply omit the dot (never a faked
 * location at 0,0). */
export interface TravelPlace {
  name: Localized;
  /** Visit year (visited rows only), e.g. 2025. */
  year?: number;
  note?: Localized;
  lat: number | null;
  lon: number | null;
}

export interface TravelData {
  visited: TravelPlace[];
  wishlist: TravelPlace[];
}

const travelPath = path.join(contentRoot, "about", "travel.json");

export function getTravel(): TravelData {
  const raw = JSON.parse(fs.readFileSync(travelPath, "utf8")) as Record<
    string,
    unknown
  >;
  const parsePlaces = (key: "visited" | "wishlist"): TravelPlace[] => {
    const rows = raw[key];
    if (rows === undefined) return [];
    if (!Array.isArray(rows)) {
      throw new Error(`[content/about/travel.json] \`${key}\` must be an array`);
    }
    return rows.map((row, i) => {
      const o = row as Record<string, unknown>;
      const where = `content/about/travel.json ${key}[${i}]`;
      rejectLegacyKeys(o, where, ["nameEn"]);
      if (typeof o.name === "string") {
        throw new Error(
          `[${where}] \`name\` must be { "en": …, "zh": … }; a bare string is ` +
            `the retired Chinese-base form.`,
        );
      }
      const name = readLocalized(o.name, "name", where);
      if (!name) {
        throw new Error(`[${where}] missing \`name\``);
      }
      return {
        name,
        year:
          typeof o.year === "number" && Number.isFinite(o.year)
            ? o.year
            : undefined,
        note: readLocalized(o.note, "note", where),
        lat: typeof o.lat === "number" && Number.isFinite(o.lat) ? o.lat : null,
        lon: typeof o.lon === "number" && Number.isFinite(o.lon) ? o.lon : null,
      };
    });
  };
  return { visited: parsePlaces("visited"), wishlist: parsePlaces("wishlist") };
}

/** One node on the About personality timeline (e.g. ISTJ 2022/Oct → INTJ). */
export interface PersonalityNode {
  date: string;
  type: string;
  /** Optional external link attached to the type label. */
  href?: string;
  note?: string;
}

export interface PersonalityData {
  nodes: PersonalityNode[];
}

const personalityPath = path.join(contentRoot, "about", "personality.json");

export function getPersonality(): PersonalityData {
  const raw = JSON.parse(fs.readFileSync(personalityPath, "utf8")) as Record<
    string,
    unknown
  >;
  const rows = raw.nodes;
  if (!Array.isArray(rows)) {
    throw new Error(
      "[content/about/personality.json] `nodes` must be an array",
    );
  }
  const nodes = rows.map((row, i) => {
    const o = row as Record<string, unknown>;
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const type = typeof o.type === "string" ? o.type.trim() : "";
    if (!date || !type) {
      throw new Error(
        `[content/about/personality.json] nodes[${i}]: \`date\` and \`type\` are required`,
      );
    }
    return {
      date,
      type,
      href:
        typeof o.href === "string" && o.href.trim() ? o.href.trim() : undefined,
      note:
        typeof o.note === "string" && o.note.trim()
          ? o.note.trim()
          : undefined,
    };
  });
  return { nodes };
}
