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
    en: "A Hiking toward Fuego",
    zh: "向 Fuego 进发",
  },
  data: loadTerrain(data),
};
