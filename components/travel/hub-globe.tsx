"use client";

/**
 * Travel hub header globe (2026-09-25): the About page's TravelGlobe rendered
 * standalone beside the hub's page title — same points data (via
 * collectGlobePoints), same drag/hover/tooltip behaviour.
 *
 * v12.1 (2026-09-28 user request — "地球仪与列表之间没有hover时的对应动效了，
 * 补回来"): optionally CONTROLLED. The hub renders this globe and the
 * checklist legend (TravelBoard hideGlobe) as siblings; with `onHover`
 * supplied, both share the page's single hover id and the rows and the globe
 * dots light each other up — the same bidirectional sync the About page
 * always had (shared `v{i}`/`w{i}` join keys).
 */

import { useState } from "react";
import type { TravelData } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { collectGlobePoints, } from "@/components/about/travel-board";
import { TravelGlobe } from "@/components/about/travel-globe";

export function HubGlobe({
  lang,
  data,
  hotId,
  onHover,
}: {
  lang: Lang;
  data: TravelData;
  /** Current join id when controlled (see above); ignored otherwise. */
  hotId?: string | null;
  /** Provide to make the page own the hover state. */
  onHover?: (id: string | null) => void;
}) {
  const [localHot, setLocalHot] = useState<string | null>(null);
  const points = collectGlobePoints(data, lang);
  if (points.length === 0) return null;
  const hot = onHover ? hotId ?? null : localHot;
  return <TravelGlobe points={points} hotId={hot} onHover={onHover ?? setLocalHot} />;
}
