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
