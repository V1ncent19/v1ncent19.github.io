export const TERRAIN_INTRO_SCENE_ID = "journey-intro";
export const TERRAIN_COMPLETE_SCENE_ID = "journey-complete";

export type TerrainCameraKey = {
  /** Camera target in GeoJSON order. */
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

export interface TerrainRoute {
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  ascentM: number;
  maxAltitudeM: number;
  /** [longitude, latitude, altitude metres, seconds since start]. */
  points: [number, number, number, number][];
}

export interface TerrainPhoto {
  id: string;
  kind: "photo" | "video";
  src: string;
  /** Browser-friendly derivative; `src` remains the map/poster image. */
  videoSrc?: string;
  width: number;
  height: number;
  durationS?: number;
  shotAt: string;
  lat: number;
  lon: number;
  altitudeM: number;
  routeIndex: number;
}

export interface TerrainScenePhoto {
  id: string;
  caption: string;
}

export interface TerrainScene {
  id: string;
  eyebrow: string;
  title: string;
  time: string;
  /** Inclusive indices into TerrainRoute.points. */
  route: [number, number];
  camera: TerrainCameraKey;
  paragraphs: string[];
  photos: TerrainScenePhoto[];
}

export interface TerrainTravelData {
  title: string;
  subtitle: string;
  dateLabel: string;
  introduction: string;
  route: TerrainRoute;
  photos: TerrainPhoto[];
  scenes: TerrainScene[];
  places: { id: string; label: string; lon: number; lat: number; routeIndex?: number }[];
  attribution: { terrain: string; terrainHref: string; basemap: string };
}
