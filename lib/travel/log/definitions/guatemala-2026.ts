import card from "@/content/travel/guatemala-2026/card.json";
import story from "@/content/travel/guatemala-2026/story.json";
import mapData from "@/generated/travel/guatemala-2026/data.json";
import { loadTerrain } from "../validate";
import type { TerrainDefinition } from "../types";

const routeStart = Date.parse(mapData.route.startedAt) / 1000;
const photoIds = new Set(mapData.photos.map((photo) => photo.id));
function routeIndexAt(iso: string): number {
  const target = Date.parse(iso) / 1000 - routeStart;
  if (!Number.isFinite(target)) throw new Error(`Invalid Guatemala scene time: ${iso}`);
  let nearest = 0;
  let distance = Infinity;
  mapData.route.points.forEach((point, index) => {
    const nextDistance = Math.abs(point[3] - target);
    if (nextDistance < distance) {
      nearest = index;
      distance = nextDistance;
    }
  });
  return nearest;
}

const data = loadTerrain({
  ...mapData,
  title: story.title,
  subtitle: story.subtitle,
  dateLabel: story.dateLabel,
  introduction: story.introduction,
  scenes: story.scenes.map((scene) => {
    for (const photo of scene.photos) {
      if (!photoIds.has(photo.id)) throw new Error(`Guatemala scene ${scene.id} refers to missing photo ${photo.id}`);
    }
    return {
      id: scene.id,
      ...("eyebrow" in scene && scene.eyebrow ? { eyebrow: scene.eyebrow } : {}),
      title: scene.title,
      time: scene.time,
      route: [routeIndexAt(scene.startAt), routeIndexAt(scene.endAt)],
      camera: scene.camera,
      paragraphs: scene.paragraphs,
      photos: scene.photos,
    };
  }),
});

export const guatemala2026: TerrainDefinition = {
  kind: "terrain",
  id: card.id,
  card,
  wordmark: "Acatenango 2026",
  pageTitles: {
    en: "Hiking toward Fuego",
    zh: "向 Fuego 进发",
  },
  data,
};
