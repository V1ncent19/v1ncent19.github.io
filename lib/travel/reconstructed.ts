export interface ReconstructedPlace {
  id: string;
  label: string;
  city: string;
  coordinates: [number, number];
  precision: string;
  coordinateBasis: string;
  sourceUrl: string;
  aliases: string[];
}

export interface ReconstructedBlock {
  id: string;
  title: string;
  text: string;
  sourceIds: string[];
  focusPlaceId: string | null;
}

export interface ReconstructedDay {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  city: string;
  weather?: string;
  note?: string;
  headerSourceIds?: string[];
  blocks: ReconstructedBlock[];
  events: { id: string; time: string | null; text: string; note: string | null }[];
}

export interface ReconstructedReview {
  id: string;
  title: string;
  score: number | null;
  text: string;
  visits: { date: string; meal: string; time: string | null; afterBlockId: string }[];
  placeId: string | null;
  sourceAnchor: string;
}

export interface ReconstructedData {
  story: {
    title: string;
    subtitle: string;
    intro: string;
    dateLabel: string;
    readingPolicy: string;
    days: ReconstructedDay[];
    afterword: ReconstructedBlock[];
  };
  places: ReconstructedPlace[];
  placeIdsByDay: Record<string, string[]>;
  reviews: ReconstructedReview[];
}

export function placeForLabel(places: ReconstructedPlace[], label: string): ReconstructedPlace | undefined {
  return places.find(place => place.label === label || place.aliases.includes(label));
}
