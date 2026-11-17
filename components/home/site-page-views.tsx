"use client";

import { useEffect, useState } from "react";

/** GoatCounter total cached for the lifetime of the current browser document. */
let sessionTotal: number | null = null;

function parseCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Public all-time page-view total shown on both home pages.
 *
 * GoatCounter owns views collected after the migration. The legacy baseline
 * remains in profile.json so the visible number preserves the old site's
 * history. A failed or blocked analytics request gracefully shows that
 * baseline instead of leaving the metadata row in a loading state.
 */
export function SitePageViews({
  baseline,
  goatCounterCode,
}: {
  baseline: number;
  goatCounterCode: string;
}) {
  const [total, setTotal] = useState<number | null>(sessionTotal);

  useEffect(() => {
    if (sessionTotal !== null || !goatCounterCode) return;

    const controller = new AbortController();
    const endpoint = `https://${goatCounterCode}.goatcounter.com/counter/TOTAL.json`;

    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`GoatCounter returned ${response.status}`);
        return response.json() as Promise<{ count?: unknown }>;
      })
      .then((payload) => {
        const count = parseCount(payload.count);
        if (count === null) return;
        sessionTotal = count;
        setTotal(count);
      })
      .catch(() => {
        // Analytics is decorative; the legacy baseline remains visible.
      });

    return () => controller.abort();
  }, [goatCounterCode]);

  const visibleTotal = baseline + (total ?? 0);

  return (
    <span id="goatcounter-site-pageviews">
      {visibleTotal > 0 ? visibleTotal.toLocaleString("en-US") : "Loading…"}
    </span>
  );
}
