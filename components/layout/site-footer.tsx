import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface-tint">
      <div className="shell flex flex-col gap-2 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between ui-text">
        <p>
          © {year} {site.givenName} &ldquo;{site.handle}&rdquo; {site.familyName}
        </p>
        <p className="font-serif italic">{site.tagline}</p>
        <Link
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline hover:no-underline hover:text-ink"
        >
          GitHub
        </Link>
      </div>
    </footer>
  );
}
