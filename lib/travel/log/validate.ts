import type { PilgrimageData } from "../pilgrimage";
import type { Attraction, TravelScene, TripInfo } from "../types";

export function loadPilgrimage(raw: unknown): PilgrimageData {
  const d = raw as PilgrimageData;
  const bad: string[] = [];
  if (!Array.isArray(d.stops) || !d.stops.length) bad.push("stops");
  if (!Array.isArray(d.route?.coordinates) || d.route.coordinates.length < 2)
    bad.push("route.coordinates");
  if (d.route?.coordinates?.some(c => !Array.isArray(c) || c.length !== 2 || !c.every(Number.isFinite)))
    bad.push("route.coordinates entries");
  if (d.route?.offsets?.length !== d.route?.coordinates?.length || !d.route?.offsets?.every(Number.isFinite))
    bad.push("route.offsets");
  if (d.stops?.some(s => !s.id || !s.src || !Number.isFinite(s.lat) || !Number.isFinite(s.lon) ||
    !Number.isInteger(s.routeIdx) || s.routeIdx < 0 || s.routeIdx >= (d.route?.coordinates?.length ?? 0)))
    bad.push("stops[] identity, coordinates or routeIdx");
  if (bad.length) throw new Error(`Malformed pilgrimage data: ${bad.join(", ")}`);
  return d;
}

export function loadJournal(tripRaw: unknown, scenesRaw: unknown, attractionsRaw: unknown) {
  const trip = tripRaw as TripInfo;
  const { scenes } = scenesRaw as { scenes: TravelScene[] };
  const { attractions = [] } = attractionsRaw as { attractions?: Attraction[] };
  if (!trip.tripId || !trip.days?.length || !scenes?.length ||
    scenes.some(s => !s.id || !Number.isFinite(Date.parse(s.startTime)) || !Number.isFinite(Date.parse(s.endTime))))
    throw new Error("Malformed journal itinerary or scenes");
  return { trip, scenes, attractions };
}
