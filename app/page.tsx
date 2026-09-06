import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  GraduationCap,
  MessageSquare,
  MessagesSquare,
  Scale,
  Sigma,
  User,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { NavId, NavItem } from "@/content/navigation";
import { homeCards } from "@/content/navigation";
import { getProfile, getProjects, projectSummary } from "@/lib/content";
import { getBlogPosts, type BlogCategory } from "@/lib/blog";
import { copy, formatMonth } from "@/lib/i18n";
import { EmailCopyButton } from "@/components/home/email-copy-button";
import { MathDivider } from "@/components/home/math-divider";
import { GatewayReveal } from "@/components/home/gateway-reveal";
import { GatewayLink } from "@/components/home/gateway-link";
import { SitePv } from "@/components/home/busuanzi";
import { SiteComments } from "@/components/home/giscus-count";
import { ConstructionBanner } from "@/components/home/construction-banner";

type SectionId = Exclude<NavId, "home">;

const sectionIcons: Record<SectionId, LucideIcon> = {
  about: User,
  cv: FileText,
  gallery: Camera,
  blog: BookOpen,
  project: FolderOpen,
  guestbook: MessagesSquare,
};

/** Short section descriptor shown under each gateway card title. */
const sectionBlurbs: Record<SectionId, { sub: string; desc: string }> = {
  about: {
    sub: "A short introduction",
    desc: "Who I am — studies, research taste, and what keeps this site ticking.",
  },
  cv: {
    sub: "Education · research · activities",
    desc: "The academic record so far, plus the formal CV as a downloadable PDF.",
  },
  gallery: {
    sub: "Travel & field notes",
    desc: "Selected travel photographs and visual notes from the road.",
  },
  blog: {
    sub: "Essays & recipes",
    desc: "Longer writing — statistics notes, cooking experiments, language.",
  },
  project: {
    sub: "Notes & small works",
    desc: "Long-running study notes, compilations and things that outgrew a post.",
  },
  guestbook: {
    sub: "Say hi · report a bug",
    desc: "One shared board for greetings, stray thoughts and bug reports — comments land in a single guestbook thread.",
  },
};

/**
 * Accent tone per gateway. Every class is a full literal so Tailwind's scanner
 * sees it; tones stay within the home token set (primary/secondary/warm).
 *
 * `fill` is the Stitch doc-card hover treatment (2026-09-04): while the card is
 * hovered, the icon chip and any inner action fill with the tone's solid
 * colour and its text flips to the matching `on-<tone>` (on-accent/on-tertiary
 * added to the palette for this). `waterHover` deepens the faint gateway
 * watermark from /10 to /30 so the decorative icon reads on hover.
 */
const tones = {
  brand: {
    fg: "text-brand",
    soft: "bg-brand-soft",
    water: "text-brand/10",
    wash: "from-brand-soft/70 via-transparent to-transparent",
    hover: "group-hover:text-brand",
    fill: "group-hover:bg-brand group-hover:text-on-brand",
    waterHover: "group-hover:text-brand/30",
    line: "bg-brand",
    arrow: "text-brand",
  },
  accent: {
    fg: "text-accent",
    soft: "bg-accent-soft",
    water: "text-accent/10",
    wash: "from-accent-soft/60 via-transparent to-transparent",
    hover: "group-hover:text-accent",
    fill: "group-hover:bg-accent group-hover:text-on-accent",
    waterHover: "group-hover:text-accent/30",
    line: "bg-accent",
    arrow: "text-accent",
  },
  tertiary: {
    fg: "text-tertiary",
    soft: "bg-tertiary-soft",
    water: "text-tertiary/10",
    wash: "from-tertiary-soft/60 via-transparent to-transparent",
    hover: "group-hover:text-tertiary",
    fill: "group-hover:bg-tertiary group-hover:text-on-tertiary",
    waterHover: "group-hover:text-tertiary/30",
    line: "bg-tertiary",
    arrow: "text-tertiary",
  },
} as const;
type ToneName = keyof typeof tones;
/** Cycle of card accents across the gateway grid (index → tone). */
const toneSeq: ToneName[] = ["brand", "accent", "brand", "tertiary", "accent"];

/**
 * Framing for each card's hover circle-reveal: `pos` is the object-position
 * slice and `fit` picks cover (fill the frame) vs contain (letterbox — used
 * for the extra-wide CV comic so it shows whole, with white bars above/below,
 * like a panorama print). Images live at /assets/navigation/web/ (compressed
 * copies; originals stay in /assets/navigation/).
 */
const PEEK_FRAME: Record<SectionId, { pos: string; fit: "cover" | "contain" }> =
  {
    about: { pos: "50% 20%", fit: "cover" },
    cv: { pos: "50% 50%", fit: "contain" },
    gallery: { pos: "50% 50%", fit: "cover" },
    blog: { pos: "50% 50%", fit: "cover" },
    project: { pos: "50% 10%", fit: "cover" },
    guestbook: { pos: "50% 50%", fit: "cover" },
  };

/* Feed chip tones — page-local (the Blog index keeps components/blog/post-tone.ts).
   Colour carries the post's category; the group-hover fill mirrors the DocRow
   icon-chip treatment (2026-09-04): soft tone → solid tone fill on hover. */
const POST_TONE: Record<BlogCategory, string> = {
  knowledge:
    "bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand",
  cuisine:
    "bg-tertiary-soft text-tertiary transition-colors group-hover:bg-tertiary group-hover:text-on-tertiary",
  documentation:
    "bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent",
};

/** "2024-09-20" → "Sept 20, 2024" */
function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Full date when a day is known, else "Sep 2024" (project updates). */
function feedDate(date: string): string {
  return date.split("-").length >= 3 ? formatDay(date) : formatMonth(date, "en");
}

/* ---------------------------------------------------------------------------
 * Recent Posts feed — latest five items across the Blog and Project indices.
 * Blog posts get their category colour and link to their own post pages
 * (/blog/<year>/<slug>); projects link to their own pages. Sorted
 * newest-first by the ISO date string.
 * ------------------------------------------------------------------------- */
interface FeedItem {
  key: string;
  href: string;
  date: string;
  title: string;
  summary: string;
  chip: { cls: string; label: string };
}

function recentPosts(limit = 5): FeedItem[] {
  const en = copy.en;
  const items: FeedItem[] = [];

  for (const p of getBlogPosts()) {
    items.push({
      key: `post-${p.slug}`,
      href: `/blog/${p.date.slice(0, 4)}/${p.slug}`,
      date: p.date,
      title: p.title,
      summary: p.excerpt,
      chip: { cls: POST_TONE[p.category], label: en.blog.category[p.category] },
    });
  }
  for (const pr of getProjects()) {
    const date = pr.meta.updatedAt ?? pr.meta.startedAt;
    if (!date) continue;
    items.push({
      key: `project-${pr.meta.slug}`,
      href: `/project/${pr.meta.slug}`,
      date,
      title: pr.meta.title,
      summary: projectSummary(pr, "en"),
      chip: {
        cls: "bg-surface-tint text-muted transition-colors group-hover:bg-brand group-hover:text-on-brand",
        label: en.project.type[pr.meta.type],
      },
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

/* ---------------------------------------------------------------------------
 * Section title — uniform `§` glyph + plain black heading site-wide.
 * ------------------------------------------------------------------------- */
function ModuleHeader({
  children,
  caption,
  aside,
}: {
  children: ReactNode;
  caption?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-line pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="font-serif text-xl italic font-normal leading-none text-brand"
          >
            §
          </span>
          {children}
        </h2>
        {aside}
      </div>
      {caption ? <p className="mt-1.5 text-sm text-muted">{caption}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const profile = getProfile();
  const feed = recentPosts();
  const statNote = getProjects().find((p) => p.meta.slug === "stat-summary-note");
  const highDim = getProjects().find(
    (p) => p.meta.slug === "high-dimensional-statistics-note-2024-2025",
  );
  const cvHref = profile.cv.en;
  const { sitePvBaseline } = profile.legacyStats;
  const license = profile.license ?? { label: "", href: "" };

  return (
    <div className="pb-16">
      {/* ---- Under-construction banner (dismissible, temp) ---- */}
      <ConstructionBanner lang="en" />

      {/* ---- Hero: intro text on the canvas (no card), portrait floated ---- */}
      <section className="shell pt-2 sm:pt-4">
        <div className="mx-auto max-w-5xl">
          {profile.avatar ? (
            <figure className="mb-6 w-full rounded-2xl border border-line bg-surface-tint p-3 sm:float-right sm:mb-4 sm:ml-8 sm:w-64 sm:p-4 md:w-72">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent"
                />
              </div>
            </figure>
          ) : null}

          <div className="text-[1.02rem] leading-relaxed text-ink sm:text-lg">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                aria-hidden
                className="font-serif text-xl italic leading-none text-brand"
              >
                §
              </span>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                hi, there.
              </h2>
            </div>

            <p className="mb-4">
              I am a{" "}
              <strong className="font-semibold text-brand">
                Ph.D. student in Statistics
              </strong>{" "}
              at the{" "}
              <a
                href="https://statistics.northwestern.edu/"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                Department of Statistics and Data Science
              </a>{" "}
              at Northwestern University. Prior to this, I received my B.S.
              degree in Mathematics and Physics from the{" "}
              <a
                href="https://www.phys.tsinghua.edu.cn/phyen/"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                Department of Physics
              </a>{" "}
              at Tsinghua University in 2023, together with a minor in
              Statistics.
            </p>

            <p className="mb-4">
              Both theoretical physics and high-dimensional statistics
              captivate me. Here I record long-running study notes and course
              digests — such as the{" "}
              <Link
                href="/project/stat-summary-note"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                Statistics summary notes
              </Link>{" "}
              and the{" "}
              <Link
                href="/project/high-dimensional-statistics-note-2024-2025"
                className="underline decoration-brand/40 underline-offset-4 transition-colors hover:decoration-brand"
              >
                high-dimensional statistics note
              </Link>{" "}
              — as well as essays and the occasional photograph.
            </p>

            <p className="mb-6 text-muted">
              This site mixes formats on purpose: blog posts for ideas that
              are still finding their shape, notes for the ones that survived
              contact with reality, and a gallery for everything else. Use
              the index below to jump straight in.
            </p>
          </div>

          {/* Action buttons (cleared below the float). First three default
              white; the trailing "More about me" is the brand-filled call to
              action. */}
          <div
            className="ui-text mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5"
            style={{ clear: "both" }}
          >
            {cvHref ? (
              <a
                href={cvHref}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-tint hover:text-ink hover:no-underline"
              >
                <Download className="h-[18px] w-[18px] text-brand" aria-hidden />
                <span>Download Curriculum Vitae</span>
                <span className="rounded bg-surface-sink px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  PDF
                </span>
              </a>
            ) : null}
            {profile.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-tint hover:text-ink hover:no-underline"
              >
                <GitBranch className="h-[18px] w-[18px] text-accent" aria-hidden />
                <span>{link.label} Profile</span>
              </a>
            ))}
            <EmailCopyButton email={profile.email} />
            <Link
              href="/about"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-on-brand shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-strong hover:no-underline"
            >
              <span>More about me</span>
              <ArrowRight
                className="h-4 w-4 text-on-brand transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Mathematical divider (hover easter egg → decodes into a
          greeting) ---- */}
      <MathDivider />

      {/* ---- Gateway grid: 1 featured (About) + 2×2 ---- */}
      <section className="shell mt-4">
        <div className="mx-auto max-w-5xl">
          <ModuleHeader
            aside={
              <span className="font-serif text-sm text-muted">
                {homeCards.length} places to start
              </span>
            }
          >
            Site Navigation
          </ModuleHeader>

          <GatewayReveal className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Featured: About (5 cols, matches the 2×2 height) */}
            <GatewayLink
              href={homeCards[0].href}
              style={{ "--gw-i": 0 } as CSSProperties}
              className="gw-item group block h-full no-underline hover:no-underline lg:col-span-5"
            >
              <GatewayCard item={homeCards[0]} index={0} featured />
            </GatewayLink>

            {/* Remaining four (7 cols → 2×2) */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7">
              {homeCards.slice(1).map((item, j) => (
                <GatewayLink
                  key={item.id}
                  href={item.href}
                  style={{ "--gw-i": j + 1 } as CSSProperties}
                  className="gw-item group block h-full no-underline hover:no-underline"
                >
                  <GatewayCard item={item} index={j + 1} />
                </GatewayLink>
              ))}
            </div>
          </GatewayReveal>
        </div>
      </section>

      {/* ---- Dual column: Recent Posts + Direct access / Site Statistics ---- */}
      <section className="shell mt-14">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ModuleHeader
                aside={
                  <Link
                    href="/blog"
                    className="ui-text group inline-flex items-center gap-1 text-xs font-semibold text-brand hover:no-underline"
                  >
                    View all posts
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                }
              >
                Recent Posts
              </ModuleHeader>
              <RecentPostList items={feed} />
            </div>

            <div className="lg:col-span-5">
              <ModuleHeader>Direct access</ModuleHeader>
              <ul className="space-y-3.5">
                {cvHref ? (
                  <DocRow
                    icon={GraduationCap}
                    tone="brand"
                    title="Curriculum Vitae (Academic)"
                    subtitle="Northwestern Statistics · Tsinghua University"
                    href={cvHref}
                    download
                    action="PDF"
                  />
                ) : null}
                {statNote ? (
                  <DocRow
                    icon={Sigma}
                    tone="accent"
                    title="Statistics Course Summary"
                    subtitle="Minor-course notes compiled in LaTeX · indexed PDF"
                    href={statNote.meta.pdf ?? statNote.meta.links?.[0]?.href ?? ""}
                    action="PDF"
                  />
                ) : null}
                {highDim ? (
                  <DocRow
                    icon={BookOpen}
                    tone="tertiary"
                    title="High Dimensional Statistics Note"
                    subtitle="Wainwright · Vershynin · Rigollet–Hütter · van Handel"
                    href={highDim.meta.pdf ?? `/project/${highDim.meta.slug}`}
                    action="Read"
                  />
                ) : null}
                {profile.links.map((link) => (
                  <DocRow
                    key={link.href}
                    icon={GitBranch}
                    tone="accent"
                    title={link.label}
                    subtitle="Source code, repositories, and small works"
                    href={link.href}
                    external
                    action="Visit"
                  />
                ))}
                {/* Guestbook card (2026-09-05): a home entry point alongside
                    the nav item — named after the board's dual purpose. */}
                <DocRow
                  icon={MessageSquare}
                  tone="brand"
                  title="Messages & Bug Reports"
                  subtitle="Say hi, leave a note, or report a bug"
                  href="/guestbook"
                  action="Visit"
                  nav
                />
              </ul>

              {/* Site metadata (2026-09-05, Task D #8) — compact row card in
                  place of the old three StatTiles. Page views are LIVE via
                  busuanzi 3.6.9 (official backend), offset by the legacy
                  baseline from content/profile.json; the comment count is
                  summed live from the repo's GitHub Discussions (same source
                  giscus renders); the license text is editable in
                  content/profile.json. */}
              <section className="mt-12">
                <ModuleHeader
                  caption="Page views (live via busuanzi + legacy baseline), comments (live from GitHub Discussions) and the site license."
                >
                  Site Metadata
                </ModuleHeader>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                  <MetaRow
                    icon={Eye}
                    label="Page views"
                    note="All-time — live count + legacy baseline"
                    value={<SitePv baseline={sitePvBaseline} />}
                  />
                  <MetaRow
                    icon={MessageSquare}
                    label="Comments"
                    note="giscus — summed across all site discussions"
                    value={<SiteComments />}
                  />
                  <MetaRow
                    icon={Scale}
                    label="License"
                    note="Content & code reuse terms"
                    value={license.label.trim() || "—"}
                    href={license.href || undefined}
                  />
                </ul>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

function GatewayCard({
  item,
  index,
  featured = false,
}: {
  item: NavItem;
  index: number;
  featured?: boolean;
}) {
  const id = item.id as SectionId;
  const Icon = sectionIcons[id];
  const tone = tones[toneSeq[index]];

  return (
    <div
      className={
        featured
          ? "gateway-card relative flex h-full min-h-[18rem] flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lift sm:p-8"
          : "gateway-card relative flex h-full min-h-[12.5rem] flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lift"
      }
    >
      {/* Tone hairline: rests faint & pulled back, sweeps across on hover */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-[2.5px] origin-left scale-x-[0.35] opacity-20 transition-all duration-500 ease-out group-hover:scale-x-100 group-hover:opacity-100 ${tone.line}`}
      />
      {/* Clipped decor layer: keeps the bleed of wash + reveal + watermark
          inside the rounded corners */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          className={`absolute inset-0 bg-gradient-to-br ${tone.wash}`}
        />
        {/* Circle reveal: the photo sits behind the card content and is
            uncovered by an expanding circle anchored at the watermark corner
            on hover-capable pointers / keyboard focus (CSS-gated). A
            surface-toned veil keeps the text readable over the photo. The
            image lazy-swaps from data-peek-src on first hover (GatewayReveal). */}
        <span className="gateway-orb">
          {/* eslint-disable-next-line @next/next/no-img-element -- hover-time data-src swap is incompatible with next/image; never part of LCP */}
          <img
            alt=""
            data-peek-src={`/assets/navigation/web/${id}.webp`}
            decoding="async"
            style={{
              objectPosition: PEEK_FRAME[id].pos,
              objectFit: PEEK_FRAME[id].fit,
              backgroundColor: PEEK_FRAME[id].fit === "contain" ? "#fff" : undefined,
            }}
          />
          <span className="gateway-orb-veil" />
        </span>
        <Icon
          className={`gateway-watermark pointer-events-none absolute -bottom-4 -right-4 ${featured ? "h-40 w-40" : "h-24 w-24"} transition-all duration-500 group-hover:-rotate-2 group-hover:scale-105 ${tone.water} ${tone.waterHover}`}
          strokeWidth={1}
        />
      </span>
      <div className="relative flex items-center gap-2">
        <span
          className={`ui-text inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${tone.soft} ${tone.fg} ${tone.fill}`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="ui-text text-xs tracking-wider text-muted">
          {sectionBlurbs[id].sub}
        </span>
      </div>
      <div className="relative mt-auto pt-6">
        {/* Title glass capsule: at rest the pill is fully transparent (its
            padding is offset by negative margins, so layout is identical to
            the bare title). On hover-capable pointers / keyboard focus it
            frosts over (surface glass + blur) and its tone tint fades in,
            keeping "Blog" readable above the revealed photo — same soft →
            solid colour story as the number chip. */}
        <span className={`gw-title-pill ${tone.fg}`}>
          <span aria-hidden className={`gw-title-pill-tint ${tone.soft}`} />
          <h3
            className={`tracking-tight transition-colors ${featured ? "text-2xl sm:text-3xl" : "text-xl"} ${tone.hover}`}
          >
            {item.label.en}
          </h3>
        </span>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">
          {sectionBlurbs[id].desc}
        </p>
        {/* Hover arrow: rests hidden, slides in with the card's tone */}
        <div aria-hidden className="relative mt-3 flex justify-end">
          <ArrowRight
            className={`-translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${tone.arrow} ${featured ? "h-[22px] w-[22px]" : "h-5 w-5"}`}
          />
        </div>
      </div>
      {/* Launch stamp: pop-in arrow that plays while GatewayLink holds the
          click for a beat — the "click registered, launching" ack before
          navigating (user request: arrow instead of the old checkmark). */}
      <span aria-hidden className="gateway-stamp">
        <span
          className={`gateway-stamp-chip ${tone.soft} ${tone.fg} ${featured ? "h-16 w-16" : "h-14 w-14"}`}
        >
          <ArrowRight
            className={featured ? "h-8 w-8" : "h-7 w-7"}
            strokeWidth={2.5}
          />
        </span>
      </span>
    </div>
  );
}

function RecentPostList({ items }: { items: FeedItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="group block rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift hover:no-underline"
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand shadow-[0_0_0_3px_var(--brand-soft)]"
              />
              <div className="min-w-0 flex-1">
                <div className="ui-text mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.chip.cls}`}
                  >
                    {item.chip.label}
                  </span>
                  <time
                    dateTime={item.date}
                    className="font-serif text-xs italic normal-case text-muted"
                  >
                    {feedDate(item.date)}
                  </time>
                </div>
                <h3 className="text-lg font-medium leading-snug tracking-tight text-ink transition-colors group-hover:text-brand sm:text-xl">
                  {item.title}
                </h3>
                {item.summary ? (
                  <p className="mt-1.5 line-clamp-2 text-[0.95rem] leading-relaxed text-muted">
                    {item.summary}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One row of the Site Metadata card: icon chip + small-caps label (+ optional
 * muted note) on the left, the value right-aligned. A linked value (license)
 * renders as a brand link. */
function MetaRow({
  icon: Icon,
  label,
  note,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  note?: string;
  /** Plain string, or a client component (e.g. the live SitePv counter). */
  value: ReactNode;
  href?: string;
}) {
  const valueNode = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group/value inline-flex max-w-[55%] items-center gap-1 text-right font-serif text-base font-bold tracking-tight text-brand hover:no-underline sm:text-lg"
    >
      <span className="truncate">{value}</span>
      <ArrowRight
        className="h-4 w-4 shrink-0 transition-transform group-hover/value:translate-x-0.5"
        aria-hidden
      />
    </a>
  ) : (
    <span className="font-serif text-lg font-bold tabular-nums tracking-tight text-ink">
      {value}
    </span>
  );

  return (
    <li className="flex items-center gap-3.5 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sink text-brand">
        <Icon className="h-[18px] w-[18px]" aria-hidden strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="ui-text block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        {note ? (
          <span className="ui-text block truncate text-[11px] text-faint">
            {note}
          </span>
        ) : null}
      </div>
      {valueNode}
    </li>
  );
}

interface DocRowProps {
  icon: LucideIcon;
  tone: ToneName;
  title: string;
  subtitle: string;
  href: string;
  action: string;
  download?: boolean;
  external?: boolean;
  /** Internal in-site navigation: the action chip shows an arrow instead of
   *  the download/external-link glyph (guestbook card). */
  nav?: boolean;
}

function DocRow({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
  action,
  download,
  external,
  nav,
}: DocRowProps) {
  const t = tones[tone];
  if (!href) return null;
  return (
    <li>
      <div className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${t.soft} ${t.fg} ${t.fill}`}
          >
            <Icon className="h-[22px] w-[22px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4
              className={`truncate text-lg font-medium tracking-tight text-ink transition-colors ${t.hover}`}
            >
              {title}
            </h4>
            <span className="block truncate text-sm text-muted">{subtitle}</span>
          </div>
        </div>
        <a
          href={href}
          download={download || undefined}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
          className={`ui-text inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-tint px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:no-underline ${t.fill}`}
        >
          {external ? (
            <ExternalLink className="h-4 w-4" aria-hidden />
          ) : nav ? (
            <ArrowRight className="h-4 w-4" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          {action}
        </a>
      </div>
    </li>
  );
}
