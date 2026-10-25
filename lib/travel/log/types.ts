import type { TripCard } from "../trips";
import type { Attraction, TravelScene, TripInfo } from "../types";
import type { PilgrimageData } from "../pilgrimage";

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

export type TravelLogDefinition = JournalDefinition | PilgrimageDefinition;
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
