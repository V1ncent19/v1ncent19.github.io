import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Grey explanatory line kept below the title (unchanged from before). */
  lead?: string;
  /** Action area rendered under the lead (buttons, meta chips, …). */
  children?: ReactNode;
}

/**
 * Shared serif page heading used by top-level content pages. Section titles are
 * unified across the site as `§` (serif, italic, brand) + a plain black heading
 * (user direction 2026-09-04); the lead line below stays grey.
 */
export function PageHeader({ title, lead, children }: PageHeaderProps) {
  return (
    <header className="pb-10 pt-2 sm:pt-4">
      <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
        <span aria-hidden className="font-serif text-xl italic font-normal leading-none text-brand">
          §
        </span>
        <span>{title}</span>
      </h1>
      {lead ? (
        <p className="mt-4 max-w-[62ch] text-[1.05rem] leading-relaxed text-muted">
          {lead}
        </p>
      ) : null}
      {children ? <div className="mt-7">{children}</div> : null}
    </header>
  );
}
