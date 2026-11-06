import card from "@/content/travel/france-2024/card.json";
import story from "@/content/travel/france-2024/story.json";
import routes from "@/generated/travel/france-2024/routes.json";
import places from "@/generated/travel/france-2024/places.json";
import type { ReconstructedDefinition } from "../types";
import type { ReconstructedData } from "../../reconstructed";
import { placeForLabel } from "../../reconstructed";
import { franceCuisineReviews } from "./france-cuisine";

const mappedPlaces: ReconstructedData["places"] = places.places.map(place => {
  if (place.coordinates.length !== 2 || place.coordinates.some(value => !Number.isFinite(value))) {
    throw new Error(`France 2024 place ${place.id} has invalid coordinates`);
  }
  return { ...place, coordinates: [place.coordinates[0], place.coordinates[1]] as [number, number] };
});

// The reviewed ledger supplies visit order only. It is never sent to the map as a route.
const placeIdsByDay: ReconstructedData["placeIdsByDay"] = {};
for (const day of story.days) {
  const seen = new Set<string>();
  for (const leg of routes.legs) {
    if (leg.date !== day.date) continue;
    for (const label of [leg.from, ...leg.via.map(via => via.place), leg.to]) {
      const place = placeForLabel(mappedPlaces, label);
      if (place) seen.add(place.id);
    }
  }
  for (const block of day.blocks) if (block.focusPlaceId) seen.add(block.focusPlaceId);
  placeIdsByDay[day.id] = [...seen];
}

const data: ReconstructedData = {
  story: story as ReconstructedData["story"],
  places: mappedPlaces,
  placeIdsByDay,
  reviews: franceCuisineReviews,
};

if (data.story.days.length !== 12 || routes.legs.length !== 135 || !data.places.length ||
    Object.values(placeIdsByDay).some(ids => ids.some(id => !mappedPlaces.some(place => place.id === id))) ||
    data.reviews.some(review => review.placeId && !mappedPlaces.some(place => place.id === review.placeId))) {
  throw new Error("France 2024 draft content is incomplete");
}

export const france2024: ReconstructedDefinition = {
  kind: "reconstructed",
  id: card.id,
  card,
  wordmark: "EUROPE 2024",
  data,
};
