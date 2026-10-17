import type { ReactNode } from "react";

/**
 * Inline link with the site's cyan underline treatment.
 *
 * Lifted out of `components/about/facts-board.tsx` (2026-10-17) when the
 * sealed-facts text moved to `content/about/facts.tsx`: the content file needs
 * *some* link primitive, and content/ should not own presentation. Internal
 * hrefs (`/blog/…`) stay in the same tab; anything else gets target/rel.
 */
export function InlineLink({
  href,
  title,
  children,
}: {
  href: string;
  title?: string;
  children: ReactNode;
}) {
  const ext = href.startsWith("http");
  return (
    <a
      href={href}
      title={title}
      {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-brand underline decoration-brand/45 underline-offset-2 transition-colors hover:text-brand-strong hover:decoration-brand-strong"
    >
      {children}
    </a>
  );
}
