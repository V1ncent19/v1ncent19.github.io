"use client";

import { useEffect, useRef } from "react";

/**
 * busuanzi page-view counter (2026-09-05, official 3.6.9 CDN).
 *
 * `BusuanziScript` injects the official deferred script once per document
 * (skipped on localhost so dev sessions never inflate the real count).
 * `SitePv` renders the span the script fills (`#busuanzi_site_pv`) and, via a
 * MutationObserver, re-displays the value OFFSET BY the legacy baseline from
 * content/profile.json (`legacyStats.sitePvBaseline`) — busuanzi starts from
 * zero on the new domain, the baseline keeps the old site's history.
 *
 * `sessionPv` caches the last value at module scope: on client-side
 * navigation back to the home page the script has already run, so the span
 * would stay on its placeholder forever — we just re-render the cached
 * number instead (no double counting).
 */

/** Last busuanzi value seen in this browsing session (client-only module state). */
let sessionPv: number | null = null;

export function BusuanziScript() {
  useEffect(() => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    if (document.getElementById("busuanzi-script")) return;
    const s = document.createElement("script");
    s.id = "busuanzi-script";
    s.src = "//cdn.busuanzi.cc/busuanzi/3.6.9/busuanzi.min.js";
    s.defer = true;
    document.body.appendChild(s);
  }, []);
  return null;
}

export function SitePv({ baseline }: { baseline: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) => n.toLocaleString("en-US");
    const apply = (n: number) => {
      el.textContent = fmt(n + baseline);
    };

    // Session cache: script already ran earlier — show the known value.
    if (sessionPv !== null) {
      apply(sessionPv);
      return;
    }

    // First mount: wait for busuanzi to overwrite the span, then offset it.
    const mo = new MutationObserver(() => {
      const raw = parseInt(el.textContent?.replace(/[^\d]/g, "") ?? "", 10);
      if (Number.isFinite(raw)) {
        mo.disconnect();
        sessionPv = raw;
        apply(raw);
      }
    });
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [baseline]);

  return (
    <span ref={ref} id="busuanzi_site_pv">
      {baseline > 0 ? baseline.toLocaleString("en-US") : "Loading…"}
    </span>
  );
}
