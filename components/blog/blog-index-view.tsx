"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Search } from "lucide-react";
import type { LegacyCategory, LegacyLang } from "@/lib/legacy";
import type { Lang } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

/** A serialisable post card handed over from the server page. */
export interface BlogPostCard {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: LegacyCategory;
  lang: LegacyLang;
  minutes: number;
  excerpt: string;
}

const CAT_ORDER: LegacyCategory[] = ["knowledge", "cuisine", "documentation"];

/** Per-category tones — every class is a full literal so Tailwind sees it. */
const TONES: Record<LegacyCategory, { chip: string; dot: string; value: string }> = {
  knowledge: {
    chip: "bg-brand-soft text-brand",
    dot: "bg-brand",
    value: "text-brand",
  },
  cuisine: {
    chip: "bg-tertiary-soft text-tertiary",
    dot: "bg-tertiary",
    value: "text-tertiary",
  },
  documentation: {
    chip: "bg-accent-soft text-accent",
    dot: "bg-accent",
    value: "text-accent",
  },
};

const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic date strings (no locale API → identical on server & client). */
function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return lang === "zh"
    ? `${y}年${m}月${d}日`
    : `${EN_MONTHS[m - 1]} ${d}, ${y}`;
}

function formatMonth(iso: string, lang: Lang): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return lang === "zh" ? `${y}年${m}月` : `${EN_MONTHS[m - 1]} ${y}`;
}

function fmt(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

export function BlogIndexView({
  posts,
  lang,
}: {
  posts: BlogPostCard[];
  lang: Lang;
}) {
  const s = copy[lang];
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<"all" | LegacyCategory>("all");
  const [oldestFirst, setOldestFirst] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<LegacyCategory, number>();
    for (const cat of CAT_ORDER) map.set(cat, 0);
    for (const p of posts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = posts.filter((p) => {
      if (activeCat !== "all" && p.category !== activeCat) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.includes(q)
      );
    });
    return [...list].sort((a, b) =>
      oldestFirst ? (a.date < b.date ? -1 : 1) : a.date > b.date ? -1 : 1,
    );
  }, [posts, query, activeCat, oldestFirst]);

  const themeCount = [...counts.values()].filter((n) => n > 0).length;
  const latest = posts[0];

  return (
    <section className="shell pb-20">
      <div className="mx-auto max-w-5xl">
        {/* ---- Page header (unified § title + grey lead) ---- */}
        <header className="pt-2 sm:pt-4">
          <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
            <span
              aria-hidden
              className="font-serif text-xl italic font-normal leading-none text-brand"
            >
              §
            </span>
            {s.blog.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-muted">
            {s.blog.lead}
          </p>

          {/* Stat cards */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat value={String(posts.length)} tone="text-brand" label={s.blog.statPosts} />
            <Stat value={String(themeCount)} tone="text-accent" label={s.blog.statCategories} />
            {latest ? (
              <Stat value={formatMonth(latest.date, lang)} tone="text-tertiary" label={s.blog.statLatest} />
            ) : null}
          </div>
        </header>

        {/* ---- Search ---- */}
        <div className="mt-8 flex w-full items-center rounded-xl border border-line bg-surface shadow-sm transition hover:shadow-card">
          <Search className="ml-4 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.blog.search}
            aria-label={s.blog.search}
            className="ui-text w-full bg-transparent px-3.5 py-3.5 text-sm text-ink placeholder:text-faint focus:outline-none"
          />
        </div>

        {/* ---- Category chips (real counts) ---- */}
        <div className="no-scrollbar -mx-1 mt-5 flex items-center gap-2 overflow-x-auto px-1 pb-2">
          <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
            <span>{s.blog.allLabel}</span>
            <Count active={activeCat === "all"}>{posts.length}</Count>
          </Chip>
          {CAT_ORDER.filter((cat) => (counts.get(cat) ?? 0) > 0).map((cat) => (
            <Chip key={cat} active={activeCat === cat} onClick={() => setActiveCat(cat)}>
              <span>{s.blog.category[cat]}</span>
              <Count active={activeCat === cat}>{counts.get(cat)}</Count>
            </Chip>
          ))}
        </div>

        {/* ---- Results toolbar: real sort + count ---- */}
        <div className="ui-text mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-tint px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SortChip
              active={!oldestFirst}
              onClick={() => setOldestFirst(false)}
            >
              {s.blog.newest}
            </SortChip>
            <SortChip active={oldestFirst} onClick={() => setOldestFirst(true)}>
              {s.blog.oldest}
            </SortChip>
          </div>
          <span className="text-xs font-medium text-faint">
            {fmt(s.blog.resultsTemplate, { shown: filtered.length, total: posts.length })}
          </span>
        </div>

        {/* ---- Post list ---- */}
        {filtered.length > 0 ? (
          <div className="mt-7 flex flex-col gap-6">
            {filtered.map((post) => (
              <PostCard key={post.slug} post={post} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="mt-7 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
            <BookOpen className="h-9 w-9 text-brand/40" strokeWidth={1.5} aria-hidden />
            <p className="text-[1.02rem] text-muted">{s.blog.empty}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <span className="font-serif block text-3xl font-bold tracking-tight">
        {value}
      </span>
      <span className={`ui-text block text-[11px] font-semibold uppercase tracking-[0.14em] ${tone}`}>
        {label}
      </span>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "ui-text inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:no-underline",
        active
          ? "bg-brand text-on-brand"
          : "bg-surface text-muted shadow-sm hover:bg-surface-tint hover:text-ink",
        !active && "border border-line",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Count({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={[
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        active ? "bg-on-brand/20 text-on-brand" : "bg-surface-sink text-muted",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function SortChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "ui-text rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors hover:no-underline",
        active
          ? "bg-surface-sink text-brand"
          : "text-muted hover:bg-surface hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PostCard({ post, lang }: { post: BlogPostCard; lang: Lang }) {
  const s = copy[lang];
  const tone = TONES[post.category];
  return (
    <article className="group rounded-xl border border-line bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="ui-text flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone.chip}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {s.blog.category[post.category]}
          </span>
          <span className="text-xs text-faint">·</span>
          <span className="text-xs font-medium text-muted">
            ≈ {post.minutes} {s.blog.minRead}
          </span>
        </div>
        <time dateTime={post.date} className="ui-text text-xs font-medium tracking-wide text-faint">
          {formatDate(post.date, lang)}
        </time>
      </div>

      <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand sm:text-2xl">
        {post.title}
      </h2>
      <p className="mt-2 line-clamp-3 text-[0.97rem] leading-relaxed text-muted">
        {post.excerpt}
      </p>

      <div className="ui-text mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs">
        <span className="font-medium text-faint">{s.blog.lang[post.lang]}</span>
        <span aria-hidden className="font-mono font-medium text-faint">
          #{post.category}
        </span>
      </div>
    </article>
  );
}
