"use client";

import { useEffect, useRef, useState } from "react";

/**
 * busuanzi page-view counter (2026-09-06, official 3.x backend).
 *
 * Why a direct fetch instead of the official <script> tag: the script is
 * one-shot per document (`window.busuanziRequestSent` guard) and only fills
 * spans present at execution time. In an SPA, a visitor who lands on any
 * other page and client-navigates to Home afterwards would never see a
 * value — the span would sit on its placeholder forever. So SitePv calls
 * the very same official endpoint the script uses (cdn.busuanzi.cc/api.php,
 * same POST body) on every Home mount; a fresh Home view counts as a view,
 * which matches what the script would have done anyway.
 *
 * The displayed value is the live count OFFSET BY the legacy baseline from
 * content/profile.json (`legacyStats.sitePvBaseline`) — busuanzi restarted
 * from zero on the new domain, the baseline keeps the old site's history.
 *
 * `sessionPv` caches the last value at module scope so remounts within one
 * browsing session don't re-count.
 */

const API = "https://cdn.busuanzi.cc/api.php";

/** Last busuanzi value seen in this browsing session (client-only module state). */
let sessionPv: number | null = null;

export function SitePv({ baseline }: { baseline: number }) {
  const [pv, setPv] = useState<number | null>(sessionPv);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const host = window.location.hostname;
    // Skip on dev origins so local sessions never inflate the real count.
    if (host === "localhost" || host === "127.0.0.1") return;
    if (sessionPv !== null) return;

    fetch(API, {
      method: "POST",
      body: JSON.stringify({
        url: window.location.href,
        referrer: document.referrer,
      }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (!alive.current) return;
        const raw = Number(r?.busuanzi_site_pv);
        if (Number.isFinite(raw)) {
          sessionPv = raw;
          setPv(raw);
        }
      })
      .catch(() => {
        /* counter is decorative — stay on the placeholder silently */
      });
    return () => {
      alive.current = false;
    };
  }, []);

  return (
    <span id="busuanzi_site_pv">
      {pv !== null
        ? (pv + baseline).toLocaleString("en-US")
        : baseline > 0
          ? baseline.toLocaleString("en-US")
          : "Loading…"}
    </span>
  );
}
