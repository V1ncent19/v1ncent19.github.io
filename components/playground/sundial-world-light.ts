import { Body, GeoVector, MakeTime, RotateVector, Rotation_EQJ_EQD, SiderealTime } from "astronomy-engine";

export interface LightLocation { longitude: number; latitude: number }
export interface SundialClock { time: number; runningSince: number | null }
type Vector = [number, number, number];

export const SUNDIAL_EXPOSURE = .90;
const playbackRate = 252; // Simulated seconds per real second.
const openingSunHeight = 11;

const radians = Math.PI / 180;
const earthRadius = 6378.137;
const eccentricitySquared = .00669437999014;
const astronomicalUnit = 149_597_870.7;

export function sundialTimeAt(clock: SundialClock, now: number) {
  return clock.runningSince === null ? clock.time : clock.time + Math.max(0, now - clock.runningSince) * playbackRate;
}

export function resumeSundialClock(clock: SundialClock, now: number): SundialClock {
  return clock.runningSince === null ? { ...clock, runningSince: now } : clock;
}

export function equatorialSunrise({ midnight }: WorldLightSnapshot): LightLocation {
  // At the equator sin(altitude) = cos(declination) * cos(hour angle).
  // Use the negative hour angle to open on the morning side of the Earth.
  const hourAngle = Math.acos(Math.sin(openingSunHeight * radians) / Math.cos(midnight[1] * radians)) / radians;
  const longitude = ((midnight[0] - hourAngle) % 360 + 360) % 360 - 180;
  return { longitude, latitude: 0 };
}

export function worldLightSnapshot(date: Date) {
  const time = MakeTime(date);
  const equatorOfDate = Rotation_EQJ_EQD(time);
  const greenwich = SiderealTime(time) * 15 * radians;
  const cos = Math.cos(greenwich), sin = Math.sin(greenwich);
  function earthFixed(body: Body): Vector {
    const { x, y, z } = RotateVector(equatorOfDate, GeoVector(body, time, true));
    return [(cos * x + sin * y) * astronomicalUnit, (cos * y - sin * x) * astronomicalUnit, z * astronomicalUnit];
  }
  const sun = earthFixed(Body.Sun);
  const moon = earthFixed(Body.Moon);
  const midnight: [number, number] = [Math.atan2(-sun[1], -sun[0]) / radians,
    Math.atan2(-sun[2], Math.hypot(sun[0], sun[1])) / radians];
  return {
    date, midnight,
    at: (location: LightLocation) => ({ sun: localDirection(location, sun), moon: localDirection(location, moon) }),
  };
}

export type WorldLightSnapshot = ReturnType<typeof worldLightSnapshot>;

function localDirection({ longitude, latitude }: LightLocation, body: Vector): Vector {
  const lon = longitude * radians;
  const lat = latitude * radians;
  const sinLon = Math.sin(lon), cosLon = Math.cos(lon);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
  const radius = earthRadius / Math.sqrt(1 - eccentricitySquared * sinLat * sinLat);
  const stationX = radius * cosLat * cosLon;
  const stationY = radius * cosLat * sinLon;
  const stationZ = radius * (1 - eccentricitySquared) * sinLat;

  const x = body[0] - stationX, y = body[1] - stationY, z = body[2] - stationZ;
  const meridian = cosLon * x + sinLon * y;
  const east = -sinLon * x + cosLon * y;
  const up = cosLat * meridian + sinLat * z;
  const north = -sinLat * meridian + cosLat * z;
  const length = Math.hypot(east, up, north);
  return [east / length, up / length, -north / length];
}

export function lightElevation(up: number) {
  return Math.asin(Math.max(-1, Math.min(1, up))) / radians;
}
