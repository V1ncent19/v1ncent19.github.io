"use client";

/**
 * Travel hub header hover bridge (v12.1, 2026-09-28 user request — the
 * globe↔list hover correspondence went missing, "补回来").
 *
 * The hub header renders the globe (HubGlobe) and the checklist legend
 * (TravelBoard in hideGlobe mode) as siblings in a server page, each holding
 * its OWN hover state — so hovering a row never lit its globe dot and vice
 * versa. This client wrapper owns the single join id (`v{i}`/`w{i}` keys,
 * shared with collectGlobePoints) and hands it to both sides, restoring the
 * About page's bidirectional sync:
 *   - hover a checklist row  → its globe dot highlights (and its label shows)
 *   - hover a globe dot      → the matching row highlights
 * The server page passes the title + blurb as children; layout (the
 * items-start top-anchored grid, 2026-09-26) is unchanged.
 */

import { useState, type ReactNode } from "react";
import type { TravelData } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { HubGlobe } from "@/components/travel/hub-globe";
import { TravelBoard } from "@/components/about/travel-board";

export function HubHoverLink({
  lang,
  travel,
  children,
}: {
  lang: Lang;
  travel: TravelData;
  /** Server-rendered title + lead blurb; the legend board mounts below. */
  children: ReactNode;
}) {
  const [hotId, setHotId] = useState<string | null>(null);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        {children}
        <div className="mt-5 text-[14px]">
          <TravelBoard
            lang={lang}
            data={travel}
            hideGlobe
            hotId={hotId}
            onHoverChange={setHotId}
          />
        </div>
      </div>
      {/* Globe: v9 (2026-09-28) +15% again (26.5rem) and pulled left so it
          reads centred inside the header's whitespace band. Still top-anchored
          (user pick: checklists expanding must not move it). */}
      <div className="mx-auto w-[min(70%,19.2rem)] lg:mx-0 lg:mr-6 lg:w-[26.5rem]">
        <HubGlobe lang={lang} data={travel} hotId={hotId} onHover={setHotId} />
      </div>
    </div>
  );
}
