import * as THREE from "three";

const turn = 2 * Math.PI;
const segments = 192;
const treeSeatRadius = 1.42;
const innerTrackRadius = 3.18;
const jointHalfWidth = .004;
const jointBed = -.054;
export const slabFinish = { standard: 0, honed: 1, bevel: 2, cut: 3 } as const;

function polar(angle: number, radius: number) {
  return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
}

function commonDivisor(a: number, b: number) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function stoneOutline(inner: number, outer: number, start: number, end: number, steps: number, inset: number) {
  const arc = (radius: number) => {
    const trim = Math.asin(inset / radius);
    return Array.from({ length: steps + 1 }, (_, step) =>
      polar(THREE.MathUtils.lerp(start + trim, end - trim, step / steps), radius));
  };
  return [...arc(outer - inset), ...arc(inner + inset).reverse()];
}

export function makeSundialFloor(radius: number) {
  const positions: number[] = [];
  const finishes: number[] = [];
  const vertex = (point: THREE.Vector2, height: number, seed: number, recessed: number, finish: number) => {
    positions.push(point.x, height, -point.y);
    finishes.push(seed, recessed, finish);
  };

  const origin = new THREE.Vector2();
  const disk = (edge: number, height: number, seed: number, recessed: number, finish: number) => {
    for (let i = 0; i < segments; i++) {
      vertex(origin, height, seed, recessed, finish);
      vertex(polar(i * turn / segments, edge), height, seed, recessed, finish);
      vertex(polar((i + 1) * turn / segments, edge), height, seed, recessed, finish);
    }
  };
  disk(radius, jointBed, 0, .44, slabFinish.standard);
  disk(treeSeatRadius - jointHalfWidth, -.005, 43, 0, slabFinish.honed);

  // The outer course levels out at the stone shoulder before the brass rim.
  const pavingRadius = radius - .765;
  const outerCourses = Math.max(1, Math.round((pavingRadius - innerTrackRadius) / 2.15));
  const boundaries = [treeSeatRadius, innerTrackRadius, ...Array.from({ length: outerCourses }, (_, i) =>
    THREE.MathUtils.lerp(innerTrackRadius, pavingRadius, (i + 1) / outerCourses)), radius];

  let phase = turn / 32;
  let previousCount = 0;
  for (let ring = 0; ring < boundaries.length - 1; ring++) {
    const inner = boundaries[ring];
    const outer = boundaries[ring + 1];
    const middle = (inner + outer) / 2;
    const coping = ring === boundaries.length - 2;
    const count = Math.max(8, 4 * Math.round(turn * middle / (coping ? 15.6 : 10.6)));
    const steps = Math.ceil(segments / count);
    const span = turn / count;
    // Offset by half the angular interval common to both courses. Even when
    // stone counts differ, no radial joint continues into the next ring.
    if (previousCount > 0) phase += .5 * turn * commonDivisor(count, previousCount) / (count * previousCount);
    previousCount = count;
    for (let stone = 0; stone < count; stone++) {
      const start = phase + stone * span;
      const end = start + span;
      const seed = 601 + ring * 131 + stone;
      const pairedIndex = stone % (count / 2) + 47 * ring + 24;
      const variation = Math.sin(pairedIndex * 1.74);
      const height = -.011 + (coping ? .010 : .019) * variation;
      const bottom = stoneOutline(inner, outer, start, end, steps, jointHalfWidth);
      const top = stoneOutline(inner, outer, start, end, steps, jointHalfWidth + .014 + .003 * variation);
      const radial = polar((start + end) / 2, 1);
      const center = radial.clone().multiplyScalar(middle);
      const radialGrade = (coping ? .003 : .009) * Math.sin(pairedIndex * 2.28);
      const tangentGrade = (coping ? .0025 : .006) * Math.cos(pairedIndex * 1.41);
      const surfaceHeight = (point: THREE.Vector2) => {
        const radialOffset = point.dot(radial) - middle;
        const tangentOffset = point.y * radial.x - point.x * radial.y;
        const surface = Math.max(jointBed + .012, height + radialGrade * radialOffset + tangentGrade * tangentOffset);
        // Ease the outer edge back to the old height where the paving meets the bevel.
        return coping ? THREE.MathUtils.lerp(surface, -.005, THREE.MathUtils.smoothstep(point.length(), radius - .39, radius - .012)) : surface;
      };
      const centerHeight = surfaceHeight(center);
      const topHeights = top.map(surfaceHeight);
      // The shallow bevel meets the steeper cut without shifting either paving contour.
      const edges = [
        { points: top, heights: topHeights, depth: 0, finish: slabFinish.bevel },
        {
          points: top.map((point, i) => point.clone().lerp(bottom[i], .79)),
          heights: topHeights.map((y) => THREE.MathUtils.lerp(y, jointBed, .32)),
          depth: .10, finish: slabFinish.cut,
        },
        { points: bottom, heights: bottom.map(() => jointBed), depth: .32, finish: slabFinish.standard },
      ];

      for (let i = 0; i < top.length; i++) {
        const next = (i + 1) % top.length;
        vertex(center, centerHeight, seed, 0, slabFinish.honed);
        vertex(top[i], topHeights[i], seed, 0, slabFinish.honed);
        vertex(top[next], topHeights[next], seed, 0, slabFinish.honed);
        for (let j = 0; j < edges.length - 1; j++) {
          const a = edges[j], b = edges[j + 1];
          vertex(a.points[i], a.heights[i], seed, a.depth, a.finish);
          vertex(b.points[i], b.heights[i], seed, b.depth, a.finish);
          vertex(b.points[next], b.heights[next], seed, b.depth, a.finish);
          vertex(a.points[i], a.heights[i], seed, a.depth, a.finish);
          vertex(b.points[next], b.heights[next], seed, b.depth, a.finish);
          vertex(a.points[next], a.heights[next], seed, a.depth, a.finish);
        }
      }
    }
  }

  const floor = new THREE.BufferGeometry();
  floor.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  floor.setAttribute("slabFinish", new THREE.Float32BufferAttribute(finishes, 3));
  floor.computeVertexNormals();
  return floor;
}

export function sundialFloorSurface(floor: THREE.BufferGeometry) {
  const positions = floor.getAttribute("position");
  const normals = floor.getAttribute("normal");
  const finishes = floor.getAttribute("slabFinish");
  const cells = new Map<string, number[]>();
  const jointCells = new Map<string, number[]>();
  // Index the actual slab triangles by horizontal cell so each landing checks only nearby faces.
  const cellSize = .85;
  const jointReach = .42;
  const cellAt = (coordinate: number) => Math.floor(coordinate / cellSize);
  const index = (grid: Map<string, number[]>, face: number, xs: number[], zs: number[]) => {
    for (let x = cellAt(Math.min(...xs)); x <= cellAt(Math.max(...xs)); x++) {
      for (let z = cellAt(Math.min(...zs)); z <= cellAt(Math.max(...zs)); z++) {
        const key = `${x},${z}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(face);
        else grid.set(key, [face]);
      }
    }
  };
  for (let i = 0; i < positions.count; i += 3) {
    if (normals.getY(i) < .01 || Math.max(positions.getY(i), positions.getY(i + 1), positions.getY(i + 2)) < jointBed + .001) continue;
    const xs = [positions.getX(i), positions.getX(i + 1), positions.getX(i + 2)];
    const zs = [positions.getZ(i), positions.getZ(i + 1), positions.getZ(i + 2)];
    index(cells, i, xs, zs);
    // On each slab face, the edge opposite the fan center is the joint shoulder.
    if (finishes.getY(i) + finishes.getY(i + 1) + finishes.getY(i + 2) === 0) {
      index(jointCells, i,
        [Math.min(xs[1], xs[2]) - jointReach, Math.max(xs[1], xs[2]) + jointReach],
        [Math.min(zs[1], zs[2]) - jointReach, Math.max(zs[1], zs[2]) + jointReach]);
    }
  }
  const sample = (x: number, z: number) => {
    let height = jointBed, slopeX = 0, slopeZ = 0;
    for (const i of cells.get(`${cellAt(x)},${cellAt(z)}`) ?? []) {
      const ax = positions.getX(i), az = positions.getZ(i), ay = positions.getY(i);
      const bx = positions.getX(i + 1) - ax, bz = positions.getZ(i + 1) - az;
      const cx = positions.getX(i + 2) - ax, cz = positions.getZ(i + 2) - az;
      const area = bx * cz - bz * cx;
      if (Math.abs(area) < 1e-8) continue;
      const u = ((x - ax) * cz - (z - az) * cx) / area;
      const v = (bx * (z - az) - bz * (x - ax)) / area;
      if (u < -.0001 || v < -.0001 || u + v > 1.0001) continue;
      const surface = ay + u * (positions.getY(i + 1) - ay) + v * (positions.getY(i + 2) - ay);
      if (surface <= height) continue;
      height = surface;
      slopeX = -normals.getX(i) / normals.getY(i);
      slopeZ = -normals.getZ(i) / normals.getY(i);
    }
    return { height, slopeX, slopeZ };
  };
  const nearJoint = (x: number, z: number, inset: number) => {
    let bestDistance = jointReach ** 2;
    let point: { x: number; z: number } | undefined;
    for (const i of jointCells.get(`${cellAt(x)},${cellAt(z)}`) ?? []) {
      const ax = positions.getX(i + 1), az = positions.getZ(i + 1);
      const dx = positions.getX(i + 2) - ax, dz = positions.getZ(i + 2) - az;
      const lengthSquared = dx * dx + dz * dz;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / lengthSquared, 0, 1);
      const px = ax + dx * t, pz = az + dz * t;
      const distance = (px - x) ** 2 + (pz - z) ** 2;
      if (distance >= bestDistance) continue;
      // Move a little into the stone so a petal can bridge the recess without sinking into it.
      const toCenterX = positions.getX(i) - px, toCenterZ = positions.getZ(i) - pz;
      const step = inset / Math.hypot(toCenterX, toCenterZ);
      point = { x: px + step * toCenterX, z: pz + step * toCenterZ };
      bestDistance = distance;
    }
    return point;
  };
  return { sample, nearJoint };
}
