import type { TripCard } from "../trips";
import type { Attraction, TravelScene, TripInfo } from "../types";
import type { PilgrimageData } from "../pilgrimage";
import type { TerrainTravelData } from "../terrain";
import type { ReconstructedData } from "../reconstructed";

/** Serializable page definitions: no component imports or browser state here. */
interface LogBase {
  id: string;
  card: TripCard;
  wordmark: string;
  /** Keep an article's established browser title when it differs from its card. */
  pageTitles?: { en: string; zh: string };
  legacySplitKey?: string;
}

export interface JournalDefinition extends LogBase {
  kind: "journal";
  trip: TripInfo;
  scenes: TravelScene[];
  attractions: Attraction[];
  trackUrl: string;
}

export interface PilgrimageDefinition extends LogBase {
  kind: "pilgrimage";
  data: PilgrimageData;
}

export interface TerrainDefinition extends LogBase {
  kind: "terrain";
  data: TerrainTravelData;
}

export interface ReconstructedDefinition extends LogBase {
  kind: "reconstructed";
  data: ReconstructedData;
}

export type TravelLogDefinition = JournalDefinition | PilgrimageDefinition | TerrainDefinition | ReconstructedDefinition;
export type LogKind = TravelLogDefinition["kind"];
export type LogLang = "en" | "zh";

/** Navigation can group many narrative sections into one chapter (e.g. a day). */
export interface LogChapter {
  id: string;
  label: string;
  shortLabel?: string;
  detail?: string;
  meta?: string;
  sectionId: string;
}
