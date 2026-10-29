#!/usr/bin/env node
/**
 * Build the Acatenango/Fuego travel-log data from private GPS and photo masters.
 * Raw EXIF and the year-long GPS export never enter public/. Published photos
 * are re-encoded by sharp, and only the cropped route is written to content/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import exifr from "exifr";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GPS = path.join(ROOT, "assets-src", "travel-data", "2026.01.01-2026.12.31.csv");
const MASTERS = path.join(ROOT, "assets-src", "guatemala-masters");
const TRIP = path.join(ROOT, "content", "travel", "guatemala-2026");
const STORY = path.join(TRIP, "story.json");
const OUT = path.join(TRIP, "data.json");
const PHOTO_OUT = path.join(ROOT, "public", "assets", "photos", "travel", "guatemala-2026");

const START_ISO = "2026-05-31T06:00:00-06:00";
const END_ISO = "2026-06-01T13:05:00-06:00";
const START = Date.parse(START_ISO) / 1000;
const END = Date.parse(END_ISO) / 1000;

function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const keys = lines.shift().split(",");
  return lines.map(line => {
    const cols = line.split(",");
    return Object.fromEntries(keys.map((key, i) => [key, cols[i]]));
  });
}

function haversine(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function routeFromGps() {
  const raw = parseCsv(GPS).flatMap(row => {
    const t = Number(row.dataTime);
    const lon = Number(row.longitude);
    const lat = Number(row.latitude);
    const altitude = Number(row.altitude);
    const accuracy = Number(row.accuracy);
    if (t < START || t > END) return [];
    if (lon < -91 || lon > -90.6 || lat < 14.4 || lat > 14.8) return [];
    if (!Number.isFinite(altitude) || altitude < 1200 || altitude > 4500) return [];
    if (Number.isFinite(accuracy) && accuracy > 160) return [];
    return [{ t, lon, lat, altitude }];
  }).sort((a, b) => a.t - b.t);

  // The phone samples densely while stationary. Preserve turns and elevation
  // changes, but avoid shipping hundreds of near-identical camp fixes.
  const kept = [];
  for (const point of raw) {
    const prev = kept.at(-1);
    if (!prev || point.t - prev.t >= 30 || haversine(prev, point) >= 16 || Math.abs(point.altitude - prev.altitude) >= 7) {
      kept.push(point);
    }
  }
  if (raw.length && kept.at(-1)?.t !== raw.at(-1).t) kept.push(raw.at(-1));

  let distanceM = 0;
  let ascentM = 0;
  let lastAltitude = kept[0]?.altitude ?? 0;
  for (let i = 1; i < kept.length; i++) {
    distanceM += haversine(kept[i - 1], kept[i]);
    const gain = kept[i].altitude - lastAltitude;
    if (gain > 2 && gain < 80) ascentM += gain;
    lastAltitude = kept[i].altitude;
  }

  return {
    startedAt: START_ISO,
    endedAt: END_ISO,
    distanceKm: Number((distanceM / 1000).toFixed(1)),
    ascentM: Math.round(ascentM),
    maxAltitudeM: Math.round(Math.max(...kept.map(p => p.altitude))),
    points: kept.map(p => [
      Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6)),
      Math.round(p.altitude), Math.round(p.t - START),
    ]),
  };
}

function parseExifInstant(dateText, offset) {
  const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(dateText));
  if (!match) throw new Error(`Unrecognised EXIF date: ${dateText}`);
  const [, y, mo, d, h, mi, s] = match;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${offset || "-06:00"}`;
  return { iso, epoch: Date.parse(iso) / 1000 };
}

function nearestRouteIndex(route, epoch) {
  const target = epoch - START;
  let best = 0;
  let delta = Infinity;
  route.points.forEach((point, i) => {
    const d = Math.abs(point[3] - target);
    if (d < delta) { best = i; delta = d; }
  });
  return best;
}

async function buildPhotos(route) {
  fs.mkdirSync(PHOTO_OUT, { recursive: true });
  const files = fs.readdirSync(MASTERS).filter(name => /\.(jpe?g)$/i.test(name));
  const photos = [];
  for (const name of files) {
    const source = path.join(MASTERS, name);
    const tags = await exifr.parse(source, { reviveValues: false });
    if (!tags?.latitude || !tags?.longitude || !tags.DateTimeOriginal) {
      throw new Error(`${name} is missing GPS or DateTimeOriginal`);
    }
    const idMatch = /img[_-](\d+)/i.exec(name);
    if (!idMatch) throw new Error(`Cannot derive id from ${name}`);
    const id = `img-${idMatch[1]}`;
    const { iso, epoch } = parseExifInstant(tags.DateTimeOriginal, tags.OffsetTimeOriginal);
    const dest = path.join(PHOTO_OUT, `${id}.webp`);
    const sourceMtime = fs.statSync(source).mtimeMs;
    if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < sourceMtime) {
      await sharp(source).autoOrient().resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, effort: 5 }).toFile(dest);
    }
    const meta = await sharp(dest).metadata();
    if (meta.exif || meta.xmp) throw new Error(`${id}.webp retained metadata`);
    photos.push({
      id,
      src: `/assets/photos/travel/guatemala-2026/${id}.webp`,
      width: meta.width,
      height: meta.height,
      shotAt: iso,
      lat: Number(Number(tags.latitude).toFixed(7)),
      lon: Number(Number(tags.longitude).toFixed(7)),
      altitudeM: Math.round(Number(tags.GPSAltitude || 0)),
      routeIndex: nearestRouteIndex(route, epoch),
    });
  }
  photos.sort((a, b) => a.shotAt.localeCompare(b.shotAt));

  const placeholderEpoch = Date.parse("2026-05-31T07:00:00-06:00") / 1000;
  photos.unshift({
    id: "starbucks-placeholder",
    src: "/assets/photos/gallery/large/img-0563.webp",
    width: 1120,
    height: 1680,
    shotAt: "2026-05-31T07:00:00-06:00",
    lat: 14.5571111,
    lon: -90.7342389,
    altitudeM: 1530,
    routeIndex: nearestRouteIndex(route, placeholderEpoch),
  });
  return photos;
}

function indexAt(route, iso) {
  return nearestRouteIndex(route, Date.parse(iso) / 1000);
}

const route = routeFromGps();
const photos = await buildPhotos(route);
const trailStartPhoto = photos.find(photo => photo.id === "img-0758");
const campPhoto = photos.find(photo => photo.id === "img-0637");
if (!trailStartPhoto || !campPhoto) throw new Error("Trail-start or camp reference photo is missing");
const story = JSON.parse(fs.readFileSync(STORY, "utf8"));
const photoIds = new Set(photos.map(photo => photo.id));
for (const scene of story.scenes) {
  for (const photo of scene.photos) {
    if (!photoIds.has(photo.id)) throw new Error(`${scene.id} refers to missing photo ${photo.id}`);
  }
}

const data = {
  title: story.title,
  subtitle: story.subtitle,
  dateLabel: story.dateLabel,
  introduction: story.introduction,
  route,
  photos,
  scenes: story.scenes.map(scene => ({
    id: scene.id,
    eyebrow: scene.eyebrow,
    title: scene.title,
    time: scene.time,
    route: [indexAt(route, scene.startAt), indexAt(route, scene.endAt)],
    camera: scene.camera,
    paragraphs: scene.paragraphs,
    photos: scene.photos,
  })),
  places: [
    { id: "antigua", label: "Antigua", lon: -90.7342, lat: 14.5570 },
    { id: "acatenango", label: "Acatenango · 3976 m", lon: -90.8758, lat: 14.5008 },
    { id: "fuego", label: "Fuego · 3763 m", lon: -90.8806, lat: 14.4730 },
    { id: "agua", label: "Agua · 3760 m", lon: -90.7430, lat: 14.4650 },
    { id: "trail-start", label: `Trail start · ${trailStartPhoto.altitudeM} m`, lon: trailStartPhoto.lon, lat: trailStartPhoto.lat, routeIndex: trailStartPhoto.routeIndex },
    { id: "camp", label: `Camp · ${campPhoto.altitudeM} m`, lon: campPhoto.lon, lat: campPhoto.lat, routeIndex: campPhoto.routeIndex },
  ],
  attribution: {
    terrain: "Terrain Tiles · Mapzen / AWS Open Data",
    terrainHref: "https://registry.opendata.aws/terrain-tiles/",
    basemap: "MapLibre GL",
  },
};

fs.mkdirSync(TRIP, { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`[guatemala] ${route.points.length} route points, ${photos.length} photos, ${route.distanceKm} km`);
