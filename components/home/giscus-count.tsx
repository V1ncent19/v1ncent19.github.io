"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live site-wide comment count (2026-09-06).
 *
 * The home page no longer embeds giscus itself, so there is no widget to
 * report a count via emitMetadata. Instead this component sums the comment
 * totals of every discussion in the site repo through the public GitHub
 * REST API — the same source of truth giscus renders from (repo /
 * Announcements category). No token required; api.github.com sends CORS
 * headers, so a static-exported page can call it from the browser.
 *
 * Failure mode is deliberately silent: the counter is decorative, so on any
 * network/API error the row shows "—" instead of an alarming state.
 *
 * A module-level cache (5 min TTL) keeps client-side re-mounts of Home from
 * re-hitting the API and eating into the 60 req/h unauthenticated quota.
 */

/** Must match the repo configured in components/blog/giscus-comments.tsx. */
const REPO = "v1ncent19/v1ncent19.github.io";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { value: number; at: number } | null = null;

export function SiteComments() {
  const [count, setCount] = useState<number | null>(cached ? cached.value : null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    fetch(`https://api.github.com/repos/${REPO}/discussions?per_page=100`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(
        (items: Array<{ comments?: number }>) => {
          if (!alive.current) return;
          const total = (items ?? []).reduce(
            (sum, d) => sum + (typeof d.comments === "number" ? d.comments : 0),
            0,
          );
          cached = { value: total, at: Date.now() };
          setCount(total);
        },
      )
      .catch(() => {
        /* decorative — keep whatever is on screen */
      });
    return () => {
      alive.current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return <span title="All comments across the site's giscus discussions">{count === null ? "—" : count.toLocaleString("en-US")}</span>;
}
