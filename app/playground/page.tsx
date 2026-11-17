import type { Metadata } from "next";
import PlaygroundExperience from "@/components/playground/PlaygroundExperience";
import { sundialLayout, type TravelWindow } from "@/components/playground/sundial-layout";
import { windows } from "@/assets-src/playground/window-gallery.mjs";
import manifest from "@/content/playground/travelogues.json";
import intro from "@/content/playground/intro.json";
import { pick } from "@/lib/localized";
import { tripCards } from "@/lib/travel/trips";
import "./playground.css";

export const metadata: Metadata = {
  title: intro.name,
  description: intro.description.en,
};

export default function PlaygroundPage() {
  const seen = new Set<string>();
  const entries: TravelWindow[] = manifest.travelogues.map((entry) => {
    const trip = tripCards.find(({ id }) => id === entry.tripId);
    const atlasIndex = windows.findIndex(({ id }) => id === entry.assetId);
    if (!trip || atlasIndex < 0 || seen.has(entry.id)) throw new Error(`Invalid Playground entry: ${entry.id}`);
    seen.add(entry.id);
    return {
      ...entry, atlasIndex,
      title: pick(trip.title, "en"), summary: pick(entry.summary ?? trip.blurb, "en"), href: `/travel/zh/${trip.id}/`,
    };
  });
  sundialLayout(entries);
  return <PlaygroundExperience entries={entries} />;
}
