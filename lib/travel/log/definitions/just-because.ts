import card from "@/content/travel/just-because/card.json";
import raw from "@/content/travel/just-because/page.json";
import { loadPilgrimage } from "../validate";
import type { PilgrimageDefinition } from "../types";

export const justBecause: PilgrimageDefinition = {
  kind: "pilgrimage", id: card.id, card, wordmark: "Just Because!",
  legacySplitKey: "pj-map-split",
  pageTitles: { en: "Just Because! — 圣地巡礼", zh: "『Just Because!』圣地巡礼 — 藤泽 · 镰仓" },
  data: loadPilgrimage(raw),
};
