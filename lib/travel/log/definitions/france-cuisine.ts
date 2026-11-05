import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReconstructedReview } from "../../reconstructed";

type Visit = ReconstructedReview["visits"][number];
const visit = (date: string, meal: string, time: string | null, afterBlockId: string): Visit => ({ date, meal, time, afterBlockId });
// Times follow the reviewed timetable; the three undated hours below are author-confirmed meal periods.
// The March 15 lunch is placed after Versailles as an editorial approximation, not a verified stop order.
const META: Record<string, { visits: Visit[]; placeId: string | null }> = {
  "Bouillon Julien": { visits: [visit("2024-03-17", "晚餐", "22:30", "s3045-05")], placeId: null },
  "Les Rupins": { visits: [visit("2024-03-14", "晚餐", null, "s3040-01")], placeId: null },
  "Bouillon République": { visits: [visit("2024-03-15", "午餐", null, "s3040-03")], placeId: null },
  "Le Florentin": { visits: [visit("2024-03-15", "晚餐", "22:00", "s3041-05")], placeId: "le-florentin" },
  "Le Bois": { visits: [visit("2024-03-16", "午餐", "12:30", "s3042-02")], placeId: "le-bois" },
  "Chez Gladines": { visits: [visit("2024-03-16", "晚餐", "20:30", "s3043-02")], placeId: "chez-gladines" },
  "Pierre Herme": { visits: [visit("2024-03-17", "下午茶", null, "s3044-04")], placeId: "pierre-herme-opera" },
  "Pedra Alta": { visits: [visit("2024-03-18", "午餐", "13:30", "s3046-01")], placeId: "pedra-alta-marbeuf" },
  "Chez Loulou": { visits: [visit("2024-03-18", "晚餐", "21:30", "s3047-02")], placeId: null },
  "Augustiner am Heumarkt": { visits: [visit("2024-03-19", "午餐", "12:00", "s3047-03")], placeId: "augustiner-heumarkt" },
  "Café Sonneveld": { visits: [visit("2024-03-20", "晚餐", "20:30", "s3050-06")], placeId: null },
  "The Pantry": { visits: [visit("2024-03-21", "午餐", "11:00", "j21-h")], placeId: "the-pantry" },
  "Café du Marché": { visits: [visit("2024-03-21", "晚餐", "22:30", "s3041-07"), visit("2024-03-23", "晚餐", "17:00", "s3053-01")], placeId: null },
  "La Jacobine": { visits: [visit("2024-03-22", "午餐", "12:00", "s3052-01")], placeId: "la-jacobine" },
  "Le Roussillon": { visits: [visit("2024-03-22", "晚餐", "21:30", "s3052-01")], placeId: null },
  "L’eclair": { visits: [visit("2024-03-24", "晚餐", "22:00", "s3053-05")], placeId: null },
};

const source = readFileSync(join(process.cwd(), "content/blog/Fr2024Cuisine.md"), "utf8");
const sections = source.split(/^###\s+/m).slice(1);
export const franceCuisineReviews: ReconstructedReview[] = sections.map((section, index) => {
  const newline = section.indexOf("\n");
  const heading = section.slice(0, newline).trim();
  const titleWithScore = heading.match(/^\*\*(.+?)\*\*/)?.[1];
  if (!titleWithScore) throw new Error(`France cuisine heading ${index + 1} is invalid`);
  const scoreMatch = titleWithScore.match(/\s+(\d+)\s*分$/);
  const title = titleWithScore.replace(/\s+\d+\s*分$/, "").trim();
  const meta = META[title];
  if (!meta) throw new Error(`France cuisine review ${title} has no date/position mapping`);
  return {
    id: `cuisine-${index + 1}`,
    title,
    score: scoreMatch ? Number(scoreMatch[1]) : null,
    text: section.slice(newline + 1).trim(),
    visits: meta.visits,
    placeId: meta.placeId,
    sourceAnchor: heading.replace(/\*/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-").slice(0, 80).replace(/-+$/, ""),
  };
});
if (franceCuisineReviews.length !== Object.keys(META).length) {
  throw new Error("France cuisine article and review mappings disagree");
}
