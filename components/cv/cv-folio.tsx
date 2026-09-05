import type { ReactNode } from "react";
import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Mail,
  MapPin,
  Smile,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cvSections, publications } from "@/content/cv/entries";
import { navItems } from "@/content/navigation";
import { getProfile, getProjects, projectSummary } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { copy } from "@/lib/i18n";

/**
 * CV page body, mirroring the Stitch "CV — experience unified" content area in
 * the home palette. Everything factual comes from content/cv/entries.ts, the
 * profile, or honours that the old public pages already list (Zijing volunteer,
 * MCM, Ma Yuehan Cup) — nothing new is claimed. The downloadable PDF remains
 * the authoritative, complete record.
 */

interface Honor {
  title: string;
  sub: string;
  year: string;
  dot: string;
}

const HONORS: Honor[] = [
  {
    title: "Five-star Zijing Volunteer",
    sub: "五星级紫荆志愿者 · Tsinghua University Volunteer Association",
    year: "2023",
    dot: "bg-tertiary",
  },
  {
    title: "Honorable Mention — MCM/ICM",
    sub: "Mathematical Contest in Modeling (COMAP), track A",
    year: "2022",
    dot: "bg-brand",
  },
  {
    title: "Ma Yuehan Cup — Shooting",
    sub: "第64届马约翰杯 · 10 m air rifle 4th & air gun 5th",
    year: "2021",
    dot: "bg-accent",
  },
];

const INTERESTS = [
  "Robust statistics",
  "Heavy-tailed minimax theory",
  "High-dimensional statistical inference",
  "Distribution-free & conformal inference",
  "Statistical learning theory",
];

function pdfSizeLabel(href: string | null): string | null {
  if (!href) return null;
  try {
    const file = path.join(process.cwd(), "public", href);
    const kb = Math.round(fs.statSync(file).size / 1024);
    return kb > 0 ? `${kb} KB` : null;
  } catch {
    return null;
  }
}

export function CvFolio({ lang }: { lang: Lang }) {
  const s = copy[lang];
  const profile = getProfile();
  const fullName = `${profile.givenName} ${profile.familyName}`;
  const cvHref = profile.cv[lang] ?? profile.cv.en ?? null;
  const pdfSize = pdfSizeLabel(cvHref);

  const statNote = getProjects().find((p) => p.meta.slug === "stat-summary-note");
  const highDim = getProjects().find(
    (p) => p.meta.slug === "high-dimensional-statistics-note-2024-2025",
  );
  const readLabel = lang === "zh" ? "阅读" : "Read";
  const aboutSummary =
    navItems.find((n) => n.id === "about")?.summary[lang] ?? "";

  return (
    <div className="pb-20">
      {/* ---- Header + action cluster (cv mock, unified) ---- */}
      <header className="shell">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-6 py-2 lg:flex-row lg:items-end sm:pt-4">
          <div className="max-w-2xl">
            <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
              <span
                aria-hidden
                className="font-serif text-xl italic font-normal leading-none text-brand"
              >
                §
              </span>
              {s.cv.title}
            </h1>
            <p className="mt-3 max-w-xl font-serif italic leading-relaxed text-muted">
              {s.cv.lead}
            </p>
          </div>

          {cvHref ? (
            <a
              href={cvHref}
              download
              className="group inline-flex shrink-0 items-center gap-3 self-start rounded-xl border border-line bg-surface p-3 pr-5 shadow-sm transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift hover:no-underline lg:self-end"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-on-brand transition group-hover:bg-brand-strong">
                <Download className="h-5 w-5" aria-hidden />
              </span>
              <span className="flex flex-col text-left">
                <span className="ui-text text-sm font-semibold text-ink group-hover:text-brand">
                  {s.cv.download}
                </span>
                {pdfSize ? (
                  <span className="ui-text text-[11px] font-medium text-faint">
                    PDF · {pdfSize}
                  </span>
                ) : null}
              </span>
            </a>
          ) : null}
        </div>
      </header>

      {/* ---- Bento grid ---- */}
      <div className="shell mt-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* ------------ LEFT (identity / contact / interests) ------------ */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            {/* Identity card */}
            <Card>
              <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <SectionDot tone="bg-brand" />
                  <span className="ui-text text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                    {s.cvFolio.profile}
                  </span>
                </div>
                <span className="ui-text font-mono text-[11px] text-faint">
                  @{profile.handle}
                </span>
              </div>

              <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                {fullName}
              </h2>
              <p className="mt-1.5 text-[1.05rem] font-medium text-brand">
                {profile.role[lang]}
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                <FactRow icon={Sparkles} label={s.cvFolio.now}>
                  {profile.role[lang]} — Northwestern University
                </FactRow>
                <FactRow icon={MapPin} label={s.cvFolio.from}>
                  Shenzhen, Guangdong, China
                </FactRow>
                <FactRow icon={GraduationCap} label="Route">
                  SZSHS · 2013 → Tsinghua · 2019 → Northwestern · 2023
                </FactRow>
              </ul>

              <div className="mt-6 border-t border-line pt-5">
                <p className="ui-text mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                  {s.cvFolio.contact}
                </p>
                <ul className="ui-text space-y-2 text-sm">
                  <li>
                    <a
                      href={`mailto:${profile.email}`}
                      className="inline-flex items-center gap-2 text-ink no-underline hover:text-brand"
                    >
                      <Mail className="h-4 w-4 text-brand" aria-hidden />
                      {profile.email}
                    </a>
                  </li>
                  {profile.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 text-ink no-underline hover:text-brand"
                      >
                        <ExternalLink className="h-4 w-4 text-accent" aria-hidden />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Interests */}
            <Card>
              <h3 className="mb-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
                <FlaskConical className="h-5 w-5 text-brand" aria-hidden />
                {s.cvFolio.interests}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-muted">
                {s.cvFolio.interestsLead}
              </p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INTERESTS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 rounded-lg bg-surface-tint px-3 py-2.5 text-[0.95rem] text-ink"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Cross-link to the matching-language About page */}
            <Link
              href={lang === "zh" ? "/about/zh" : "/about"}
              className="group block rounded-xl border border-line bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift hover:no-underline sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Smile className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-brand">
                    {s.about.title}
                  </h3>
                </div>
                <ArrowUpRight
                  className="h-4 w-4 text-faint transition group-hover:text-brand"
                  aria-hidden
                />
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                {aboutSummary}
              </p>
            </Link>
          </div>

          {/* ------------ RIGHT (record modules) ------------ */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Education */}
            <ModuleCard
              icon={GraduationCap}
              tone="bg-accent-soft text-accent"
              title={s.cvSection.education}
              sectionNo="01"
            >
              {cvSections
                .find((sec) => sec.id === "education")
                ?.entries.map((entry) => <TimelineEntry key={entry.title} entry={entry} />) ??
                null}
            </ModuleCard>

            {/* Research experience */}
            <ModuleCard
              icon={FlaskConical}
              tone="bg-brand-soft text-brand"
              title={s.cvSection.research}
              sectionNo="02"
            >
              <ul className="space-y-4">
                {cvSections
                  .find((sec) => sec.id === "research")
                  ?.entries.map((entry, i) => (
                    <RecordEntry key={`${entry.title}-${i}`} entry={entry} />
                  ))}
              </ul>
            </ModuleCard>

            {/* Publications */}
            <ModuleCard
              icon={FileText}
              tone="bg-accent-soft text-accent"
              title={s.cvFolio.publications}
              sectionNo="03"
            >
              <ol className="space-y-3">
                {publications.map((pub, i) => (
                  <li key={pub.title} className="rounded-xl bg-surface-tint/70 px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="ui-text mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface font-mono text-[11px] font-semibold text-muted"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-[0.95rem] font-medium leading-snug text-ink">
                          {pub.href ? (
                            <a
                              href={pub.href}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="underline decoration-line-strong underline-offset-2 transition hover:text-brand hover:no-underline"
                            >
                              {pub.title}
                            </a>
                          ) : (
                            pub.title
                          )}
                        </h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted">
                          {pub.authors} · {pub.venue} · {pub.year}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </ModuleCard>

            {/* Honors & awards */}
            <ModuleCard
              icon={Award}
              tone="bg-tertiary-soft text-tertiary"
              title={s.cvFolio.honors}
              sectionNo="04"
            >
              <ul className="divide-y divide-line">
                {HONORS.map((h) => (
                  <li
                    key={h.title}
                    className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${h.dot}`}
                      />
                      <div>
                        <h4 className="text-lg font-semibold tracking-tight">{h.title}</h4>
                        <p className="mt-0.5 text-sm italic text-muted">{h.sub}</p>
                      </div>
                    </div>
                    <span className="ui-text shrink-0 rounded bg-surface-tint px-2 py-0.5 text-xs font-semibold text-muted">
                      {h.year}
                    </span>
                  </li>
                ))}
              </ul>
            </ModuleCard>

            {/* Notes & works */}
            {(statNote || highDim) ? (
              <ModuleCard
                icon={FolderOpen}
                tone="bg-accent-soft text-accent"
                title={s.cvFolio.artifacts}
                sectionNo="05"
              >
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[statNote, highDim].filter(Boolean).map((p) => {
                    const note = p!;
                    // Always navigate to the project page (2026-09-05 user
                    // request) — the PDF stays reachable from there; no direct
                    // download from the CV anymore.
                    const href =
                      lang === "zh"
                        ? `/zh/project/${note.meta.slug}`
                        : `/project/${note.meta.slug}`;
                    return (
                      <li key={note.meta.slug}>
                        <Link
                          href={href}
                          className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-line bg-surface-tint p-4 transition hover:-translate-y-0.5 hover:border-line-strong hover:no-underline"
                        >
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="ui-text rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                                {s.project.type[note.meta.type]}
                              </span>
                              <ArrowUpRight
                                className="h-4 w-4 text-faint transition group-hover:text-brand"
                                aria-hidden
                              />
                            </div>
                            <h4 className="text-lg font-semibold leading-snug tracking-tight text-ink group-hover:text-brand">
                              {note.meta.title}
                            </h4>
                            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted">
                              {projectSummary(note, lang)}
                            </p>
                          </div>
                          <span className="ui-text flex items-center gap-1.5 text-xs font-semibold text-brand">
                            <BookOpen className="h-3.5 w-3.5" aria-hidden />
                            {readLabel}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </ModuleCard>
            ) : null}
          </div>
        </div>

        {/* ---- Colophon strip ---- */}
        <div className="mx-auto mt-8 max-w-5xl">
          <p className="ui-text flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-tint px-5 py-4 text-center text-xs leading-relaxed text-muted">
            <span className="font-serif text-base italic text-brand">§</span>
            {s.cvFolio.edition}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Small building blocks (full-literal class strings only)
 * ------------------------------------------------------------------------- */

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}

function SectionDot({ tone }: { tone: string }) {
  return <span aria-hidden className={`h-2 w-2 rounded-full ${tone}`} />;
}

function FactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="ui-text mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-tint text-brand">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span>
        <span className="ui-text block text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          {label}
        </span>
        <span className="block leading-relaxed text-ink">{children}</span>
      </span>
    </li>
  );
}

function ModuleCard({
  icon: Icon,
  tone,
  title,
  sectionNo,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  sectionNo: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <h3 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h3>
        </div>
        <span className="ui-text font-mono text-[11px] text-faint">SECT · {sectionNo}</span>
      </header>
      {children}
    </section>
  );
}

function TimelineEntry({
  entry,
}: {
  entry: (typeof cvSections)[number]["entries"][number];
}) {
  const now = entry.period?.includes("—");
  return (
    <div className="relative flex gap-4 pb-6 pl-1 last:pb-0 sm:gap-5">
      {/* timeline rail */}
      <span aria-hidden className="absolute left-[13px] top-8 bottom-0 w-px bg-line" />
      <span className="relative z-10 mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface shadow-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${now ? "bg-brand" : "bg-line-strong"}`}
        />
      </span>
      <div className="min-w-0 flex-1 rounded-xl bg-surface-tint/70 px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`ui-text rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
              now ? "bg-brand text-on-brand" : "bg-surface text-muted"
            }`}
          >
            {entry.period}
          </span>
        </div>
        <h4 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          {entry.title}
        </h4>
        {entry.institution ? (
          entry.institutionHref ? (
            <a
              href={entry.institutionHref}
              target="_blank"
              rel="noreferrer noopener"
              className="ui-text mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-brand"
            >
              {entry.institution}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <p className="ui-text mt-0.5 text-sm font-medium text-accent">
              {entry.institution}
            </p>
          )
        ) : null}
        {entry.lines.length ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{entry.lines[0]}</p>
        ) : null}
      </div>
    </div>
  );
}

function RecordEntry({
  entry,
}: {
  entry: (typeof cvSections)[number]["entries"][number];
}) {
  return (
    <li className="rounded-xl bg-surface-tint/70 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-lg font-semibold leading-snug tracking-tight text-ink">
          {entry.title}
        </h4>
        {entry.period ? (
          <span className="ui-text rounded bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
            {entry.period}
          </span>
        ) : null}
      </div>
      {entry.institution ? (
        <p className="mt-1 text-sm font-medium text-brand">
          {entry.institutionHref ? (
            <a
              href={entry.institutionHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 hover:no-underline"
            >
              {entry.institution}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            entry.institution
          )}
        </p>
      ) : null}
      {entry.lines.length ? (
        <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-muted">
          {entry.lines.map((line) => (
            <li key={line}>— {line}</li>
          ))}
        </ul>
      ) : null}
      {entry.links?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {entry.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="ui-text inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-brand transition hover:border-line-strong hover:no-underline"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
