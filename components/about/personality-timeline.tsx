/**
 * About "personality timeline" — vertical timeline rendered inside the sealed
 * "myself" envelope of the facts board (client tree, data passed as props
 * from the server page; never import lib/content here).
 *
 * Nodes render in chronological order; `date` is a free-form label
 * (e.g. "2022/Oct") parsed leniently for sorting only — unparseable dates
 * keep their manifest order (stable sort). A node's type becomes a link when
 * `href` is present. The connector line between dots is drawn per-<li> so any
 * node count collapses correctly.
 */

import type { PersonalityData } from "@/lib/content";
import { copy, type Lang } from "@/lib/i18n";

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Chronological sort key for labels like "2022/Oct", "2024-10", "2025/3". */
function dateKey(date: string): number | null {
  const m = date.match(/(\d{4})\s*[/\-.]\s*([A-Za-z]+|\d{1,2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const raw = m[2].toLowerCase();
  const month = /^\d+$/.test(raw) ? Number(raw) : (MONTHS[raw] ?? NaN);
  if (!Number.isFinite(month) || month < 1 || month > 12) return year * 12;
  return year * 12 + month;
}

export function PersonalityTimeline({
  lang,
  data,
}: {
  lang: Lang;
  data: PersonalityData;
}) {
  const s = copy[lang].about;
  const nodes = data.nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => {
      const ka = dateKey(a.node.date);
      const kb = dateKey(b.node.date);
      if (ka !== null && kb !== null && ka !== kb) return ka - kb;
      return a.index - b.index;
    })
    .map(({ node }) => node);

  if (nodes.length === 0) {
    return <p className="mt-3 text-sm text-muted">{s.timelineEmpty}</p>;
  }

  return (
    <ol className="mt-3">
      {nodes.map((n, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < nodes.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[5px] top-4 h-[calc(100%-1.25rem)] w-px bg-line"
            />
          ) : null}
          <span
            aria-hidden
            className="mt-[0.45em] h-2.5 w-2.5 flex-none rounded-full bg-brand"
          />
          <div className="min-w-0">
            <p className="text-[15px] leading-relaxed text-ink">
              <span className="text-muted tabular-nums">{n.date}</span>
              <span aria-hidden className="mx-1.5 text-muted">·</span>
              {n.href ? (
                <a
                  href={n.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand underline decoration-brand/45 underline-offset-2 transition-colors hover:text-brand-strong hover:decoration-brand-strong"
                >
                  {n.type}
                </a>
              ) : (
                <span className="font-medium">{n.type}</span>
              )}
            </p>
            {n.note ? (
              <p className="text-sm leading-relaxed text-muted">{n.note}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
