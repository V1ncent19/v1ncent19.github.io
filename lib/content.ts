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
  avatar: string;
  cv: { en: string | null; zh: string | null };
  email: string;
  links: ProfileLink[];
  /** PV/UV baselines to be filled in at final migration (legacy busuanzi). */
  legacyStats: { sitePvBaseline: number; siteUvBaseline: number };
}

const profilePath = path.join(contentRoot, "profile.json");

export function getProfile(): Profile {
  const raw = fs.readFileSync(profilePath, "utf8");
  return JSON.parse(raw) as Profile;
}

/* ---------------------------------------------------------------------------
 * About (markdown, one file per language)
 * ------------------------------------------------------------------------- */

export type ContentLang = "en" | "zh";

export function getAbout(lang: ContentLang): string {
  const file = path.join(contentRoot, "about", `${lang}.md`);
  return fs.readFileSync(file, "utf8");
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
  /** Card / page summary; English preferred, Chinese via `summaryZh`. */
  summary?: string;
  summaryZh?: string;
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

function readProjectFile(file: string): Project {
  const raw = fs.readFileSync(path.join(projectDir, file), "utf8");
  const { data, content } = matter(raw);
  const meta = data as Partial<ProjectFrontmatter>;

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
      `[content/project/${file}] invalid front-matter:\n  - ${errors.join(
        "\n  - ",
      )}`,
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
      summary: meta.summary,
      summaryZh: meta.summaryZh,
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
  const { summary, summaryZh } = project.meta;
  if (lang === "zh") return summaryZh || summary || "";
  return summary || summaryZh || "";
}

/* ---------------------------------------------------------------------------
 * Gallery manifest (content/gallery/items.json, generated by `gallery:gen`)
 * ------------------------------------------------------------------------- */

/**
 * One gallery item. HUMAN fields — the bilingual text block (place / placeLocal
 * / title / alt, each as `*_en` + `*_zh`), plus `country_code`, `originalUrl`,
 * `color`, `badge` — are yours to fill in items.json; `npm run gallery:gen`
 * preserves whatever you write there and only refreshes id / source / date /
 * lat / lon / dimensions / asset URLs. Deleting a row removes a photo.
 *
 * Bilingual content model (both languages carry all four text fields):
 *   - `place_*`   — country + city (e.g. "Kaohsiung, Taiwan"); shown as the
 *     accent big title on the hover card and as the resting-bar place.
 *   - `placeLocal_*` — the specific spot / scenic name (e.g. "Shoushan
 *     Lookout" / 柴山); shown as the small grey line on the hover card.
 *   - `title_*`   — main heading of the opened (lightbox) card.
 *   - `alt_*`     — body copy / description inside the opened card.
 * The EN page reads the `*_en` set, the ZH page the `*_zh` set (each falls
 * back to the other language while empty).
 *
 * Shared fields: `country_code` (ISO 3166-1 alpha-2, e.g. "TW"), `color`
 * (per-item theme accent hex, "" → site brand), `badge` (travel-stamp preset
 * key, "" → generic placeholder stamp), `originalUrl` (optional full-res link).
 */
export interface GalleryItem {
  /** Stable key derived from the original filename; also the asset basename. */
  id: string;
  /** Original filename in the git-ignored GalleryPhoto/ directory. */
  source: string;
  /** Real capture date, YYYY-MM-DD (EXIF DateTimeOriginal); "" when unknown. */
  date: string;
  /** EN: country + city (hover big title / resting place). */
  place_en: string;
  /** ZH: 国家、城市（如 台灣高雄）。 */
  place_zh: string;
  /** EN: specific spot / scenic name (hover small line). */
  placeLocal_en: string;
  /** ZH: 具体景点名（如 柴山）。 */
  placeLocal_zh: string;
  /** EN: heading of the opened card. */
  title_en: string;
  /** ZH: 打开卡片的大标题。 */
  title_zh: string;
  /** EN: description / body copy of the opened card. */
  alt_en: string;
  /** ZH: 打开卡片的内容介绍。 */
  alt_zh: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "TW"); "" while unknown. */
  country_code: string;
  /** Optional external link to the full-resolution original (shared drive). */
  originalUrl: string;
  /** Decimal-degree latitude (EXIF GPS, script-extracted); null when unknown. */
  lat: number | null;
  /** Decimal-degree longitude (EXIF GPS, script-extracted); null when unknown. */
  lon: number | null;
  /** Theme accent hex like "#a4633a"; "" → site brand fallback. */
  color: string;
  /** Travel-stamp badge preset key; "" → generic placeholder stamp. */
  badge: string;
  thumb: string;
  large: string;
  /** Oriented on-screen dimensions of the `large` tier, px. */
  width: number;
  height: number;
}

const galleryPath = path.join(contentRoot, "gallery", "items.json");

function parseGalleryRow(row: unknown, i: number): GalleryItem {
  const o = row as Record<string, unknown>;
  const err = (msg: string) =>
    new Error(`[content/gallery/items.json] row ${i}: ${msg}`);
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

  return {
    id,
    source: str("source"),
    date: str("date"),
    place_en: str("place_en"),
    place_zh: str("place_zh"),
    placeLocal_en: str("placeLocal_en"),
    placeLocal_zh: str("placeLocal_zh"),
    title_en: str("title_en"),
    title_zh: str("title_zh"),
    alt_en: str("alt_en"),
    alt_zh: str("alt_zh"),
    country_code: str("country_code"),
    originalUrl: str("originalUrl"),
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
    throw new Error("[content/gallery/items.json] expected an array of rows");
  }
  return rows.map(parseGalleryRow);
}
