import card from "@/content/travel/guatemala-2026/card.json";
import data from "@/content/travel/guatemala-2026/data.json";
import { loadTerrain } from "../validate";
import type { TerrainDefinition } from "../types";

export const guatemala2026: TerrainDefinition = {
  kind: "terrain",
  id: card.id,
  card,
  wordmark: "Acatenango 2026",
  pageTitles: {
    en: "Acatenango 2026 — While Fuego Was Awake",
    zh: "在火山醒着的时候 — Acatenango × Fuego",
  },
  data: loadTerrain(data),
};
