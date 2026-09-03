import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileDown } from "lucide-react";
import { Prose } from "@/components/content/prose";
import type { Project, ProjectStatus } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { copy, formatMonth } from "@/lib/i18n";

/** Shared renderer for /project/[slug] and /project/zh/[slug]. */
export function ProjectDetail({ project, lang }: { project: Project; lang: Lang }) {
  const s = copy[lang];
  const { type, status, updatedAt, title, summary, links, pdf } = project.meta;
  const backHref = lang === "zh" ? "/project/zh" : "/project";
  const backLabel = s.project.allProjects;

  return (
    <div>
      <Link
        href={backHref}
        className="ui-text inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <header className="mt-6 border-b border-line pb-8">
        <p className="ui-text mb-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-brand">
          {s.project.type[type]}
        </p>
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <StatusBadge status={status} label={s.project.status[status]} />
          {updatedAt ? (
            <span className="ui-text text-sm text-muted">
              {s.project.updatedAt}{" "}
              <time dateTime={updatedAt} className="tabular-nums">
                {formatMonth(updatedAt, lang)}
              </time>
            </span>
          ) : null}
        </div>

        {summary || pdf || (links && links.length > 0) ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            {summary ? (
              <p className="max-w-[58ch] flex-1 basis-72 text-[1rem] leading-relaxed text-muted">
                {summary}
              </p>
            ) : null}
            <div className="flex flex-col gap-2.5">
              {pdf ? (
                <a
                  href={pdf}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ui-text inline-flex items-center gap-2 self-start rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong dark:text-[#0a1016]"
                >
                  <FileDown className="h-4 w-4" aria-hidden />
                  {s.project.openPdf}
                </a>
              ) : null}
              {links?.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ui-text inline-flex items-center gap-1.5 self-start text-sm text-muted transition-colors hover:text-brand"
                >
                  {link.label}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <div className="pt-8">
        <Prose source={project.body} />
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: ProjectStatus; label: string }) {
  const dot: Record<ProjectStatus, string> = {
    active: "bg-brand",
    completed: "bg-muted",
    paused: "bg-muted",
    archived: "bg-faint",
  };
  return (
    <span className="ui-text inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-muted">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {label}
    </span>
  );
}
