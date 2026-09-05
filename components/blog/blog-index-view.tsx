"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ArrowDownWideNarrow, ArrowUpNarrowWide, BookOpen, Search } from "lucide-react";
import type { BlogPostCard, BlogCategory } from "@/lib/blog";
import type { Lang } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { POST_TONE } from "./post-tone";
import { LedText } from "./led-text";

const CAT_ORDER: BlogCategory[] = ["knowledge", "cuisine", "documentation"];

/** `id` of the category-chip strip — the `/blog#category` scroll target. */
const CATEGORY_ANCHOR_ID = "category";

/** Turn the current `#hash` into a category, or null when it is not one. */
function categoryFromHash(): BlogCategory | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.slice(1).trim().toLowerCase();
  return (CAT_ORDER as readonly string[]).includes(h)
    ? (h as BlogCategory)
    : null;
}

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
  const [activeCat, setActiveCat] = useState<"all" | BlogCategory>("all");
  /** Sort key + direction. Each key carries its natural default: newest-first
   *  for dates, A→Z for titles (codepoint order — deterministic on server and
   *  client, unlike localeCompare). */
  const [sortKey, setSortKey] = useState<"date" | "title">("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  // Deep-link support: opening /blog#cuisine (or the zh index) selects that
  // category on arrival and scrolls the chip strip into view. The bare
  // /blog#category case is handled natively by the browser via id="category".
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const cat = categoryFromHash();
      if (!cat) return;
      setActiveCat(cat);
      // Scroll on the next frame so the filtered list has re-rendered.
      requestAnimationFrame(() => {
        document
          .getElementById(CATEGORY_ANCHOR_ID)
          ?.scrollIntoView({ block: "start" });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function selectCategory(cat: "all" | BlogCategory) {
    setActiveCat(cat);
    // Mirror the choice into the hash (replace, not push) so a filtered view
    // is shareable without littering the browser history.
    const url = new URL(window.location.href);
    url.hash = cat === "all" ? "" : cat;
    history.replaceState(null, "", url);
  }

  const counts = useMemo(() => {
    const map = new Map<BlogCategory, number>();
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
        p.titleText.toLowerCase().includes(q) ||
        p.excerptText.toLowerCase().includes(q) ||
        p.category.includes(q)
      );
    });
    const flip = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "title") {
        const byTitle =
          a.titleText < b.titleText ? -1 : a.titleText > b.titleText ? 1 : 0;
        // Ties fall back to date within the same direction.
        return (
          byTitle * flip ||
          (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * flip
        );
      }
      return (
        (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * flip ||
        (a.titleText < b.titleText ? -1 : 1)
      );
    });
  }, [posts, query, activeCat, sortKey, dir]);

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

        {/* ---- Category chips (real counts) ----
            Stacked (wrapping) layout instead of a horizontal scroll strip:
            tags flow onto as many rows as needed and everything stays visible
            without dragging, on mobile included. */}
        <div
          id={CATEGORY_ANCHOR_ID}
          className="-mx-1 mt-5 flex flex-wrap items-center gap-2 px-1 py-1"
        >
          <Chip active={activeCat === "all"} onClick={() => selectCategory("all")}>
            <span>{s.blog.allLabel}</span>
            <Count active={activeCat === "all"}>{posts.length}</Count>
          </Chip>
          {CAT_ORDER.filter((cat) => (counts.get(cat) ?? 0) > 0).map((cat) => (
            <Chip key={cat} active={activeCat === cat} onClick={() => selectCategory(cat)}>
              <span>{s.blog.category[cat]}</span>
              <Count active={activeCat === cat}>{counts.get(cat)}</Count>
            </Chip>
          ))}
        </div>

        {/* ---- Results toolbar: real sort + count ---- */}
        <div className="ui-text mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-tint px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SortChip
              active={sortKey === "date"}
              onClick={() => {
                setSortKey("date");
                setDir("desc"); // date's natural default: newest first
              }}
            >
              {s.blog.sortDate}
            </SortChip>
            <SortChip
              active={sortKey === "title"}
              onClick={() => {
                setSortKey("title");
                setDir("asc"); // title's natural default: A→Z
              }}
            >
              {s.blog.sortTitle}
            </SortChip>
            {/* Direction toggle; label adapts to the active key. */}
            <button
              type="button"
              onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
              aria-label={sortKey === "date" ? s.blog.sortDate : s.blog.sortTitle}
              title={sortKey === "date" ? s.blog.sortDate : s.blog.sortTitle}
              className="ui-text inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted shadow-sm transition-colors hover:text-ink"
            >
              {dir === "desc" ? (
                <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ArrowUpNarrowWide className="h-3.5 w-3.5" aria-hidden />
              )}
              {sortKey === "title"
                ? dir === "asc"
                  ? "A→Z"
                  : "Z→A"
                : dir === "desc"
                  ? s.blog.newest
                  : s.blog.oldest}
            </button>
          </div>
          <span className="text-xs font-medium text-faint">
            {fmt(s.blog.resultsTemplate, { shown: filtered.length, total: posts.length })}
          </span>
        </div>

        {/* ---- Post list ---- */}
        {filtered.length > 0 ? (
          <div className="mt-7 flex flex-col gap-6">
            {filtered.map((post) => (
              <PostCard key={post.slug} post={post} lang={lang} query={query} />
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

function PostCard({
  post,
  lang,
  query,
}: {
  post: BlogPostCard;
  lang: Lang;
  query: string;
}) {
  const s = copy[lang];
  const tone = POST_TONE[post.category];
  const href = `/blog/${post.date.slice(0, 4)}/${post.slug}`;
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-line bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift hover:no-underline sm:p-6"
    >
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
        <LedText parts={post.titleParts} query={query} />
      </h2>
      <p className="mt-2 line-clamp-3 text-[0.97rem] leading-relaxed text-muted">
        <LedText parts={post.excerptParts} query={query} />
      </p>

      <div className="ui-text mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs">
        <span className="font-medium text-faint">{s.blog.lang[post.lang]}</span>
        <span className="flex items-center gap-3">
          <span aria-hidden className="font-mono font-medium text-faint">
            #{post.category}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand">
            {lang === "zh" ? "阅读" : "Read"}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </span>
      </div>
    </Link>
  );
}
