"use client";

import { memo, useMemo, type RefObject } from "react";
import type { TripInfo, TravelScene } from "@/lib/travel/types";
import type { LogChapter, LogLang } from "@/lib/travel/log/types";
import ChapterNavigation from "./log/ChapterNavigation";

/** Journal adapter: days remain the navigation groups, scenes remain reading units. */
function TravelNav({ trip, scenes, activeSceneId, scopeRef, lang }: {
  trip: TripInfo; scenes: TravelScene[]; activeSceneId: string;
  scopeRef: RefObject<HTMLDivElement | null>; lang: LogLang;
}) {
  const chapters = useMemo<LogChapter[]>(() => {
    const first = new Map<number, TravelScene>();
    for (const scene of scenes) {
      if (scene.dayNo !== undefined && scene.dayNo >= 0 && !first.has(scene.dayNo)) first.set(scene.dayNo, scene);
    }
    return [...first.entries()].sort(([a], [b]) => a - b).map(([no, scene]) => {
      const day = trip.days.find(day => day.date === scene.day);
      const detail = scene.dayTitle || scene.title || day?.label || "";
      return { id: String(no), sectionId: scene.id, label: `Day ${no} · ${detail}`,
        shortLabel: `Day ${no}`, detail, meta: `${((day?.distanceM ?? 0) / 1000).toFixed(0)} km` };
    });
  }, [trip, scenes]);
  const activeDay = scenes.find(scene => scene.id === activeSceneId)?.dayNo;
  return <ChapterNavigation chapters={chapters} activeId={activeDay === undefined ? null : String(activeDay)} scopeRef={scopeRef} kind="journal" lang={lang} title={trip.title} />;
}
export default memo(TravelNav);
