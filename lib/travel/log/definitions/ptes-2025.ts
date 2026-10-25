import card from "@/content/travel/ptes-2025/card.json";
import trip from "@/content/travel/ptes-2025/trip.json";
import scenes from "@/content/travel/ptes-2025/scenes.json";
import attractions from "@/content/travel/ptes-2025/attractions.json";
import { loadJournal } from "../validate";
import type { JournalDefinition } from "../types";

export const ptes2025: JournalDefinition = {
  kind: "journal", id: card.id, card, wordmark: "Iberia 2025",
  legacySplitKey: "tl-map-split",
  pageTitles: { en: "Iberia 2025 — Christmas", zh: "伊比利亚 2025 — 葡萄牙 · 西班牙 · 圣诞" },
  ...loadJournal(trip, scenes, attractions),
  trackUrl: `/data/travel/${card.id}/track.json`,
};
