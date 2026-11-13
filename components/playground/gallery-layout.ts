import { windows } from "@/assets-src/playground/window-gallery.mjs";

type PlanPoint = readonly [number, number];

export const cameraBearing = 30;
export const sunBearing = 315;
export const sunElevation = 32;

// The courtyard uses +X for east and -Z for north.
export function compassDirection(bearing: number) {
  const radians = bearing * Math.PI / 180;
  return { x: Math.sin(radians), z: -Math.cos(radians) };
}

export const sunRay = {
  ...compassDirection(sunBearing),
  y: Math.tan(sunElevation * Math.PI / 180),
};

export const terrace = { level: 1.72 };
export const stair = { right: -1.75, head: -.38, foot: 3.12, count: 8 };
export const upperArcadeZ = -6.76;
export const upperGarden = { x: .28, z: -2.72, width: 4.15, depth: 1.82 };
export const lowerGarden = { x: 5.5, z: 9.65, width: 3.65, depth: 1.75 };
export const balconyRim: readonly PlanPoint[] = [
  [-2.86, upperArcadeZ], [-3.16, -8.52], [-2.23, -9.34],
  [2.04, -9.34], [3.14, -8.57], [2.91, upperArcadeZ],
];

export const retainingRim: readonly PlanPoint[] = [
  [8.12, -.82], [7.18, .20], [4.12, 1.02], [1.19, 1.35], [.35, 1.62],
  [stair.right, 1.62], [stair.right, stair.head], [-5.52, stair.head], [-6.26, -2.16],
];

export const terraceRim: readonly PlanPoint[] = [
  [-6.62, -4.15], ...balconyRim, [6.62, -4.15], [7.95, -2.54], ...retainingRim,
];

function inPlan(x: number, z: number, corners: readonly PlanPoint[]) {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const [aX, aZ] = corners[i], [bX, bZ] = corners[j];
    if ((aZ > z) !== (bZ > z) && x < aX + (bX - aX) * (z - aZ) / (bZ - aZ)) inside = !inside;
  }
  return inside;
}

export function isUpperTerrace(x: number, z: number) {
  return inPlan(x, z, terraceRim);
}

const streamProfile = [
  { x: -7.82, z: -8.3, y: 1.61, width: .9 },
  { x: -6.73, z: -2.35, y: 1.59, width: 1.02 },
  { x: -6.13, z: .22, y: 1.57, width: 1.1 },
  { x: -6.00, z: .66, y: .67, width: 1.19 },
  { x: -5.78, z: 2.03, y: .64, width: 1.28 },
  { x: -5.66, z: 2.53, y: -.235, width: 1.42 },
  { x: -5.43, z: 4.4, y: -.254, width: 1.4 },
  { x: -5.11, z: 6.9, y: -.271, width: 1.56 },
  { x: -3.11, z: 10.2, y: -.295, width: 1.62 },
  { x: -1.53, z: 13.3, y: -.32, width: 1.7 },
  { x: -2.12, z: 18.85, y: -.34, width: 1.86 },
  { x: -3.45, z: 24.0, y: -.37, width: 1.85 },
];

export const streamStart = streamProfile[0].z;
export const streamEnd = streamProfile[streamProfile.length - 1].z;
export const falls = [streamProfile[3].z, streamProfile[5].z];

export function streamAt(z: number) {
  const index = streamProfile.findIndex((point) => z <= point.z);
  if (index <= 0) return index === 0 ? streamProfile[0] : streamProfile[streamProfile.length - 1];
  const a = streamProfile[index - 1], b = streamProfile[index];
  const t = (z - a.z) / (b.z - a.z);
  const curve = t * t * (3 - 2 * t);
  return {
    x: a.x + (b.x - a.x) * curve,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * curve,
    z,
  };
}

export function nearStream(x: number, z: number, margin: number) {
  if (z < streamStart || z > streamEnd) return false;
  const water = streamAt(z);
  return Math.abs(x - water.x) < water.width / 2 + margin;
}

export function stairLeftAt(z: number) {
  const water = streamAt(z);
  return water.x + water.width / 2 + .2;
}

const positions: Record<string, { x: number; y: number; z: number; degrees: number }> = {
  france: { x: -8.4, y: 0, z: falls[1], degrees: 34 },
  ptes: { x: -4.62, y: terrace.level, z: -5.55, degrees: 34 },
  guatemala: { x: 4.65, y: terrace.level, z: -5.58, degrees: -32 },
  anitabi: { x: 8.65, y: 0, z: 4.55, degrees: -33 },
};

// The walls, panes and stone shader all use the same world transforms.
export const windowPlanes = windows.map(({ id }) => {
  const placement = positions[id];
  if (!placement) throw new Error(`Missing garden position for ${id}`);
  const { x, y, z, degrees } = placement;
  const yaw = degrees * Math.PI / 180;
  return { id, x, y, z, yaw, cos: Math.cos(yaw), sin: Math.sin(yaw) };
});

export const anitabiWall = windowPlanes.find(({ id }) => id === "anitabi")!;
export const anitabiRecess: readonly PlanPoint[] = [[-4.9, -.45], [-4.55, -2.18], [-3.48, -2.75], [-1.85, -2.62], [-1.4, -.48]];

export function onAnitabiWall(x: number, z: number): PlanPoint {
  return [anitabiWall.x + x * anitabiWall.cos + z * anitabiWall.sin,
    anitabiWall.z - x * anitabiWall.sin + z * anitabiWall.cos];
}

export function isAnitabiRecess(x: number, z: number) {
  const dx = x - anitabiWall.x, dz = z - anitabiWall.z;
  return inPlan(dx * anitabiWall.cos - dz * anitabiWall.sin, dx * anitabiWall.sin + dz * anitabiWall.cos, anitabiRecess);
}

export const panBounds = { minX: -9, maxX: 9, minZ: -7, maxZ: 7 };

export function seeded(index: number) {
  const x = Math.sin(index * 127.1 + 18.73) * 43758.5453;
  return x - Math.floor(x);
}
