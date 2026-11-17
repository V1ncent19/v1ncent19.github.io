import { GOTHIC_SILL_DEPTH, TREE_SEAT_BASE_RADIUS, WINDOW_SCALE, type sundialLayout } from "./sundial-layout";

type PolarPoint = readonly [radius: number, bearing: number];
type Arc = [radius: number, bearing: number, halfSpan: number, halfWidth: number];
type Radial = [bearing: number, inner: number, outer: number, halfWidth: number];
type PlanPoint = [x: number, z: number];
type Elbow = { center: PlanPoint; arc: Arc };
export type InlayTiming = [window: number, sharedWith: number, start: number, direction: number];
type Timed<T> = { shape: T; timing: InlayTiming };

export const INLAY_WIDTH_SCALE = .5;

function toPlan([radius, bearing]: PolarPoint): PlanPoint {
  return [radius * Math.sin(bearing), -radius * Math.cos(bearing)];
}

// A fillet is tangent to the original centered arc and the original radial line.
function roundElbow(previous: PolarPoint, point: PolarPoint, next: PolarPoint, width: number) {
  const [radius, bearing] = point;
  const arcFirst = previous[0] === radius;
  const arcNeighbor = arcFirst ? previous : next;
  const radialNeighbor = arcFirst ? next : previous;
  if (arcNeighbor[0] !== radius || radialNeighbor[1] !== bearing) return;
  const angularGap = arcNeighbor[1] - bearing;
  const radialGap = radialNeighbor[0] - radius;
  const fillet = Math.min(.17, Math.abs(radialGap) / 3, Math.abs(angularGap) * radius / 3);
  if (fillet <= width / 2) return;

  const centerRadius = radius + Math.sign(radialGap) * fillet;
  const axial = Math.sqrt(centerRadius ** 2 - fillet ** 2);
  const centerBearing = bearing + Math.sign(angularGap) * Math.atan2(fillet, axial);
  const center = toPlan([centerRadius, centerBearing]);
  const arcTouch: PolarPoint = [radius, centerBearing];
  const radialTouch: PolarPoint = [axial, bearing];
  const aroundCenter = (end: PolarPoint) => {
    const [x, z] = toPlan(end);
    return Math.atan2(x - center[0], center[1] - z);
  };
  const start = aroundCenter(radialTouch);
  const delta = aroundCenter(arcTouch) - start;
  const sweep = Math.atan2(Math.sin(delta), Math.cos(delta));
  const elbow: Elbow = { center, arc: [fillet, start + sweep / 2, Math.abs(sweep) / 2, width / 2] };
  return { incoming: arcFirst ? arcTouch : radialTouch, outgoing: arcFirst ? radialTouch : arcTouch,
    direction: Math.sign(arcFirst ? -sweep : sweep), elbow };
}

export function sundialInlay(layout: ReturnType<typeof sundialLayout>) {
  const arcs: Timed<Arc>[] = [];
  const radials: Timed<Radial>[] = [];
  const elbows: Timed<Elbow>[] = [];
  const junctions: PlanPoint[] = [];
  const lengths = layout.windows.map(() => 0);
  const occupied = new Map(layout.windows.map(({ id }, index) => [id, index]));
  const angle = (degrees: number) => degrees * Math.PI / 180;
  const startAt = (bearing: number): PolarPoint => [TREE_SEAT_BASE_RADIUS - .020, bearing];
  const windowEdge = (id: string) => {
    const slot = layout.slots.find((slot) => slot.id === id);
    if (!slot) throw new Error(`Unknown inlay slot: ${id}`);
    return {
      index: occupied.get(id) ?? -1,
      radius: slot.radius - GOTHIC_SILL_DEPTH * WINDOW_SCALE / 2 + .020,
      bearing: slot.angle,
    };
  };
  const stroke = (nominalWidth: number, index: number, points: PolarPoint[], start = 0, sharedWith = -1) => {
    const width = nominalWidth * INLAY_WIDTH_SCALE;
    const corners = points.map((point, i) => i > 0 && i < points.length - 1
      ? roundElbow(points[i - 1], point, points[i + 1], width) : undefined);
    let length = start;
    for (let i = 1; i < points.length; i++) {
      const [r0, a0] = corners[i - 1]?.outgoing ?? points[i - 1];
      const [r1, a1] = corners[i]?.incoming ?? points[i];
      if (r0 === r1 && a0 !== a1) {
        arcs.push({ shape: [r0, (a0 + a1) / 2, Math.abs(a1 - a0) / 2, width / 2],
          timing: [index, sharedWith, length, Math.sign(a1 - a0)] });
        length += r0 * Math.abs(a1 - a0);
      }
      if (a0 === a1 && r0 !== r1) {
        radials.push({ shape: [a0, Math.min(r0, r1), Math.max(r0, r1), width / 2],
          timing: [index, sharedWith, length, Math.sign(r1 - r0)] });
        length += Math.abs(r1 - r0);
      }
      const corner = corners[i];
      if (corner) {
        elbows.push({ shape: corner.elbow, timing: [index, sharedWith, length, corner.direction] });
        length += corner.elbow.arc[0] * corner.elbow.arc[2] * 2;
      }
    }
    return length;
  };
  type Destination = ReturnType<typeof windowEdge>;
  const finish = (width: number, end: Destination, points: PolarPoint[], bend?: number, start = 0) => {
    const [, bearing] = points[0];
    // Unwrap the northern branch across 0° so its arc follows the short side of the circle.
    const turn = end.bearing - bearing;
    const endBearing = Math.abs(turn) > Math.PI ? end.bearing - Math.sign(turn) * 2 * Math.PI : end.bearing;
    if (bend !== undefined) {
      if (points.at(-1)?.[0] !== bend) points.push([bend, bearing]);
      points.push([bend, endBearing]);
    }
    const length = stroke(width, end.index, [...points, [end.radius, endBearing]], start);
    if (end.index >= 0) lengths[end.index] = length;
  };
  const pair = (degrees: number, firstBend: number, first: string, secondBend: number, second: string) => {
    const bearing = angle(degrees);
    const fork: PolarPoint = [firstBend, bearing];
    const near = windowEdge(first);
    const far = windowEdge(second);
    // Only the trunk carries both slot owners. Empty destinations retain their brass with no active owner.
    const [owner = -1, sharedWith = -1] = [near.index, far.index].filter((index) => index >= 0);
    const trunk = stroke(.088, owner, [startAt(bearing), fork], 0, sharedWith);
    junctions.push(toPlan(fork));
    finish(.075, near, [fork], firstBend, trunk);
    finish(.078, far, [fork], secondBend, trunk);
  };

  pair(14, 5.82, "ring-1-07", 5.82, "ring-1-08");
  pair(145, 4.35, "ring-1-03", 6.18, "ring-1-02");
  pair(280, 4.65, "ring-1-05", 5.94, "ring-1-06");
  const france = windowEdge("ring-1-01");
  finish(.075, france, [startAt(france.bearing)]);
  finish(.072, windowEdge("ring-1-04"), [startAt(angle(236))], 6.48);
  return { arcs, radials, elbows, junctions, lengths };
}

export type SundialInlay = ReturnType<typeof sundialInlay>;
