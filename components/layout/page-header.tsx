import type { ReactNode } from "react";
import { SectionMark } from "@/components/layout/section-mark";

interface PageHeaderProps {
  title: string;
  /**
   * id for the clickable copy-link §. When provided the decorative § becomes
   * a SectionMark anchor (click copies `origin + path + #markId`); otherwise
   * the § stays purely decorative as before.
   */
  markId?: string;
  /** Grey explanatory line kept below the title (unchanged from before). */
  lead?: string;
  /** Action area rendered under the lead (buttons, meta chips, …). */
  children?: ReactNode;
}

/**
 * Shared serif page heading used by top-level content pages. Section titles are
 * unified across the site as `§` (serif, italic, brand) + a plain black heading
 * (user direction 2026-09-04); the lead line below stays grey. Pages pass
 * `markId` to make the § a copy-link anchor like every other section marker.
 */
export function PageHeader({ title, markId, lead, children }: PageHeaderProps) {
  return (
    <header className="pb-10 pt-2 sm:pt-4">
      <h1 className="flex items-center gap-3 text-balance text-4xl tracking-tight sm:text-5xl">
        {markId ? (
          <SectionMark id={markId} size="1.5rem" />
        ) : (
          <span aria-hidden className="font-serif text-xl italic font-normal leading-none text-brand">
            §
          </span>
        )}
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
