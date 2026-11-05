import Link from "next/link";
import { ArrowUpRight, PackageOpen } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/content";
import { projectSummary } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { copy, formatMonth } from "@/lib/i18n";

/** Grid of project cards used by both /project and /project/zh indexes. */
export function ProjectGrid({
  projects,
  lang,
  basePath,
}: {
  projects: Project[];
  lang: Lang;
  /** e.g. "/project" or "/project/zh" — cards link under this prefix. */
  basePath: string;
}) {
  const s = copy[lang];

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong py-20 text-center">
        <PackageOpen className="h-8 w-8 text-faint" aria-hidden />
        <p className="text-sm text-muted">No projects yet.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {projects.map((project) => {
        const { type, status, updatedAt, title } = project.meta;
        const href = `${basePath}/${project.meta.slug}`;
        return (
          <li key={project.meta.slug}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-6 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
            >
              <div className="ui-text flex items-center justify-between gap-3 text-[0.78rem]">
                <span className="uppercase tracking-[0.14em] text-brand">
                  {s.project.type[type]}
                </span>
                {updatedAt ? (
                  <span className="tabular-nums text-faint">
                    {formatMonth(updatedAt, lang)}
                  </span>
                ) : null}
              </div>

              <h2 className="text-[1.2rem] font-semibold leading-snug tracking-tight transition-colors group-hover:text-brand">
                {title}
              </h2>

              <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-muted">
                {projectSummary(project, lang)}
              </p>

              <div className="mt-auto flex items-center justify-between pt-3">
                <StatusChip status={status} label={s.project.status[status]} />
                <ArrowUpRight
                  className="h-4 w-4 text-faint transition-colors group-hover:text-brand"
                  aria-hidden
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function StatusChip({ status, label }: { status: ProjectStatus; label: string }) {
  const tones: Record<ProjectStatus, string> = {
    active: "bg-brand-soft text-brand",
    completed: "bg-surface-tint text-muted",
    paused: "bg-surface-tint text-muted",
    archived: "bg-transparent text-faint",
  };
  const dot: Record<ProjectStatus, string> = {
    active: "bg-brand",
    completed: "bg-muted",
    paused: "border border-line-strong",
    archived: "bg-faint",
  };
  return (
    <span
      className={`ui-text inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium ${tones[status]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {label}
    </span>
  );
}
