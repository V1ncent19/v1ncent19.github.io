import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { panel, panelHalfWidth } from "@/assets-src/playground/louvre-panel.mjs";
import { GOTHIC_SILL_DEPTH } from "./sundial-layout";

const bottom = panel.glassBottom * panel.heightScale;
const height = (panel.glassTop - panel.glassBottom) * panel.heightScale;
const archSamples = 80;
export const traceryRoundelCenter = 7.415;
export const gothicSilhouette = { halfWidth: 1.621, spring: 4.82, crown: 8.22 };
const { crown: frameCrown, spring } = gothicSilhouette;
const frontFace = .125;
const backFace = -.21;

// Polish, cavity occlusion and grain strength, in that order.
type StoneFinish = [number, number, number];

function stoneFinish(geometry: THREE.BufferGeometry, sample: (index: number) => StoneFinish) {
  const count = geometry.getAttribute("position").count;
  const values = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) values.set(sample(i), i * 3);
  geometry.setAttribute("stoneFinish", new THREE.BufferAttribute(values, 3));
  return geometry;
}

function rearDepth(z: number) {
  return backFace - .86 * (z - frontFace);
}

function pairedContour(right: THREE.Vector2[]) {
  return [...right, ...right.slice(0, -1).reverse().map(({ x, y }) => new THREE.Vector2(-x, y))];
}

function paneContour(offset: number) {
  return pairedContour(Array.from({ length: archSamples + 1 }, (_, i) => {
    const t = i / archSamples;
    const y = THREE.MathUtils.lerp(panel.glassBottom, panel.glassTop, t);
    const x = i === archSamples ? 0 : panelHalfWidth(y) * (1 + offset / panel.halfWidth);
    return new THREE.Vector2(x, bottom - .64 * offset + t * (height + 1.98 * offset));
  }));
}

function lancetPoint(halfWidth: number, peak: number, t: number, crownLift: number) {
  const y = spring + (peak - spring) * (1.8 * t - .35 * t * t) / 1.45;
  return new THREE.Vector2(halfWidth * (1 - t * t), y + crownLift * THREE.MathUtils.smoothstep(t, .65, .87));
}

function lancetContour(halfWidth: number, peak: number, base: number, crownLift = 0) {
  const right = [new THREE.Vector2(halfWidth, base)];
  for (let i = 0; i <= archSamples; i++) right.push(lancetPoint(halfWidth, peak, i / archSamples, crownLift));
  return pairedContour(right);
}

function foilRadius(x: number, y: number, scale: number) {
  const lobe = Math.max(Math.abs(x), Math.abs(y)) * .203;
  return scale * (lobe + Math.sqrt(lobe ** 2 + .226 ** 2 - .203 ** 2));
}

function foilContour(scale: number) {
  // Four overlapping circular lobes create the cusps of the central opening.
  return Array.from({ length: 128 }, (_, i) => {
    const angle = i * Math.PI / 64;
    const x = Math.cos(angle), y = Math.sin(angle);
    const radius = foilRadius(x, y, scale);
    return new THREE.Vector2(radius * x, traceryRoundelCenter + radius * y);
  });
}

function sideLight(side: number) {
  // The inner and outer curves meet in cusps. The inner one bends around
  // the roundel, then returns towards the apex of the single main pane.
  const path = new THREE.Path();
  path.moveTo(1.268, 5.955);
  path.bezierCurveTo(1.115, 6.325, .865, 6.563, .640, 6.733);
  path.bezierCurveTo(.394, 6.918, .482, 7.187, .547, 7.466);
  path.bezierCurveTo(.666, 7.238, .878, 6.988, 1.011, 6.762);
  path.bezierCurveTo(1.161, 6.507, 1.226, 6.258, 1.268, 5.955);
  return path.getPoints(19).slice(0, -1).map(({ x, y }) => new THREE.Vector2(side * x, y));
}

export function traceryOpenings() {
  return [foilContour(1.04), sideLight(-1), sideLight(1)];
}

function extrusion(outer: THREE.Vector2[], holes: THREE.Vector2[][], z: number, depth: number, bevel: number) {
  const shape = new THREE.Shape(outer);
  shape.holes = holes.map((hole) => new THREE.Path(hole));
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelSize: bevel, bevelThickness: bevel * .85, bevelSegments: 3,
  }).translate(0, 0, z);
}

function roundel(radius: number) {
  return Array.from({ length: 96 }, (_, i) => {
    const angle = i * Math.PI / 48;
    return new THREE.Vector2(radius * Math.cos(angle), traceryRoundelCenter + radius * Math.sin(angle));
  });
}

// Continuous stone profile, with two rounded beads separated by a hollow.
const archProfile: [number, number, number, StoneFinish][] = [
  [1.629, 8.207, .086, [.10, .22, .42]],
  [1.619, 8.205, .173, [.18, .11, .39]],
  [1.601, 8.188, .225, [.81, .04, .24]],
  [1.570, 8.138, .235, [.97, .02, .20]],
  [1.541, 8.088, .209, [.57, .18, .31]],
  [1.517, 8.039, .151, [.08, .79, .53]],
  [1.496, 7.997, .151, [.04, .87, .57]],
  [1.474, 7.955, .188, [.69, .14, .28]],
  [1.448, 7.904, .181, [.80, .08, .24]],
  [1.425, 7.863, .149, [.18, .44, .43]],
  [1.404, 7.825, .109, [.06, .72, .51]],
];

function shadowMoulding() {
  const contours = archProfile.map(([width, peak, z]) => {
    // Ease the inner profiles outward at the crown, leaving a solid stone
    // bridge around the roundel and keeping the shoulder profiles in place.
    const crownLift = Math.max(0, 8.205 - peak) * .76;
    return lancetContour(width, peak, .436, crownLift).map(({ x, y }) => [x, y, z]);
  });
  return loftStone(contours, archProfile.map(([, , , finish]) => finish), { closed: true });
}

function loftStone(contours: number[][][], finish: StoneFinish[], { rear = false, closed = false } = {}) {
  const vertices = contours.flat(2);
  const indices = [];
  const stride = contours[0].length;
  for (let ring = 0; ring < contours.length - 1; ring++) {
    for (let i = 0; i < (closed ? stride : stride - 1); i++) {
      const a = ring * stride + i;
      const b = ring * stride + (i + 1) % stride;
      if (rear) indices.push(a, a + stride, b, b, a + stride, b + stride);
      else indices.push(a, b, a + stride, b, b + stride, a + stride);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  stoneFinish(geometry, (i) => finish[Math.floor(i / stride)]);
  const surface = geometry.toNonIndexed();
  geometry.dispose();
  return surface;
}

function identifyStone(geometry: THREE.BufferGeometry, block: number) {
  const ids = new Float32Array(geometry.getAttribute("position").count).fill(block);
  geometry.setAttribute("stoneBlock", new THREE.BufferAttribute(ids, 1));
  return geometry;
}

function cutStones(stations: number[], stepsPerUnit: number, joint: number, keep: number[], blocks: number[],
  build: (points: number[], cuts: readonly [boolean, boolean]) => THREE.BufferGeometry) {
  return stations.slice(1).map((end, i) => {
    const cuts = [i > 0, i < stations.length - 2] as const;
    const start = stations[i] + (cuts[0] ? joint : 0);
    const stop = end - (cuts[1] ? joint : 0);
    const bevel = 1.6 * joint;
    const innerStart = cuts[0] ? start + bevel : start;
    const innerStop = cuts[1] ? stop - bevel : stop;
    const steps = Math.ceil((innerStop - innerStart) * stepsPerUnit);
    const marks = new Set([start, stop, ...keep.filter((point) => point > innerStart && point < innerStop)]);
    for (let j = 0; j <= steps; j++) marks.add(THREE.MathUtils.lerp(innerStart, innerStop, j / steps));
    return identifyStone(build([...marks].sort((a, b) => a - b), cuts), blocks[i]);
  });
}

// The shoulders lead into wedge-shaped arch stones and a continuous keystone.
const archJoints = [-.90, -.73, -.54, -.32, -.13, .13, .32, .54, .73, .90];
// Keep the same texture on both faces and on the exposed side of each arch stone.
const archBlocks = Array.from({ length: archJoints.length + 1 }, (_, i) => i + 1);
const roundelFirstBlock = archBlocks.length + 1;
const paneSurroundBlock = roundelFirstBlock + 4;
const roundelSeatBlock = paneSurroundBlock + 1;
const sillFirstBlock = roundelSeatBlock + 1;
const jambFirstBlock = sillFirstBlock + 3;
const frameStations = [-2, -1.70, -1.34, ...archJoints, 1.34, 1.70, 2];
const frameBlocks = [jambFirstBlock, jambFirstBlock + 1, ...archBlocks, jambFirstBlock + 2, jambFirstBlock + 3];

function frameCourseHeight(s: number, archedHeight: number) {
  return Math.abs(s) <= 1 ? archedHeight : THREE.MathUtils.lerp(.436, spring, 2 - Math.abs(s));
}

function archStones(rear: boolean) {
  const relief = [0, .013, .038, .042, .010, -.013, -.012, .015, .027, .001, 0];
  return cutStones(frameStations, 40, .0024, [-1, 0, 1], frameBlocks, (points, cuts) => {
    const contours = archProfile.map(([width, peak, z], ring) => points.map((s, i) => {
      const t = Math.max(0, 1 - Math.abs(s));
      const lift = Math.max(0, 8.205 - peak) * .76;
      const { x, y } = lancetPoint(width, peak, t, lift);
      const atJoint = (i === 0 && cuts[0]) || (i === points.length - 1 && cuts[1]);
      const detail = THREE.MathUtils.smoothstep(t, .015, .18);
      const face = z + relief[ring] * detail - (atJoint ? .022 : 0);
      return [(s <= 0 ? 1 : -1) * x, frameCourseHeight(s, y),
        rear ? rearDepth(face) : face];
    }));
    return loftStone(contours, archProfile.map(([, , , finish]) => finish), { rear });
  });
}

function archStoneReturns() {
  // Carry the joints over the side of the arch, between the face mouldings.
  const profile: [number, number, StoneFinish][] = [
    [-.204, 0, [.12, .17, .55]], [-.153, 1, [.05, .10, .73]],
    [.069, 1, [.05, .10, .73]], [.119, 0, [.12, .17, .55]],
  ];
  return cutStones(frameStations, 48, .0024, [-1, 0, 1], frameBlocks, (points, cuts) => {
    const contours = profile.map(([z, shoulder]) => points.map((s, i) => {
      const t = Math.max(0, 1 - Math.abs(s));
      const atJoint = (i === 0 && cuts[0]) || (i === points.length - 1 && cuts[1]);
      const archLift = THREE.MathUtils.smoothstep(t, .015, .13);
      const jambLift = .72 * THREE.MathUtils.smoothstep(Math.abs(s), 1.02, 1.14);
      const lift = Math.max(archLift, jambLift) * shoulder * (atJoint ? .28 : 1);
      const { x, y } = lancetPoint(1.621 + .032 * lift, frameCrown + .024 * lift, t, 0);
      return [(s <= 0 ? 1 : -1) * x, frameCourseHeight(s, y), z];
    }));
    return loftStone(contours, profile.map(([, , finish]) => finish));
  });
}

function roundelStones(rear: boolean) {
  const radius = .459;
  const profile: [number, number, StoneFinish][] = [
    [0, .119, [.08, .24, .56]], [.07, .158, [.17, .21, .55]],
    [.20, .216, [.58, .04, .36]], [.38, .226, [.63, .03, .30]],
    [.51, .207, [.43, .23, .48]], [.65, .151, [.09, .79, .72]],
    [.77, .149, [.07, .88, .76]], [.91, .174, [.29, .37, .56]],
    [1, .141, [.09, .69, .66]],
  ];
  // Leave the four lobes intact, meeting between them at the diagonal cusps.
  const stations = Array.from({ length: 5 }, (_, i) => .125 + i / 4);
  const blocks = stations.slice(1).map((_, i) => roundelFirstBlock + i);
  return cutStones(stations, 192, .0021, [.25, .5, .75, 1], blocks, (points, cuts) => {
    // A circle meets itself at the first and last station, so both ends need the same joint.
    const angleOffset = .0021;
    if (!cuts[0]) points[0] += angleOffset;
    if (!cuts[1]) points[points.length - 1] -= angleOffset;
    const contours = profile.map(([inset, depth]) => points.map((s, i) => {
      const x = Math.cos(s * 2 * Math.PI), y = Math.sin(s * 2 * Math.PI);
      const opening = foilRadius(x, y, .986);
      const at = THREE.MathUtils.lerp(radius, opening, inset);
      const clearance = THREE.MathUtils.smoothstep(radius - opening, .038, .11);
      const bevel = i === 0 || i === points.length - 1 ? .019 : 0;
      const face = .119 + (depth - .119) * (.64 + .36 * clearance) - bevel;
      return [at * x, traceryRoundelCenter + at * y, rear ? rearDepth(face) : face];
    }));
    return loftStone(contours, profile.map(([, , finish]) => finish), { rear });
  });
}

function block(width: number, height: number, depth: number, y: number, bevel: number) {
  return new RoundedBoxGeometry(width, height, depth, 3, bevel).translate(0, y, 0);
}

function apertureStone(outer: THREE.Vector2[], opening: THREE.Vector2[], z: number, depth: number, bevel: number) {
  const geometry = extrusion(outer, [opening], z, depth, bevel);
  const normals = geometry.getAttribute("normal");
  return stoneFinish(geometry, (i) => {
    const end = Math.abs(normals.getZ(i));
    const edge = Math.sin(Math.PI * end);
    const reveal = 1 - THREE.MathUtils.smoothstep(end, .04, .65);
    return [.30 + .49 * edge - .20 * reveal, .15 + .64 * reveal, .32 + .21 * reveal];
  });
}

function sillCourse(width: number, height: number, depth: number, y: number, bevel: number) {
  const geometry = block(width, height, depth, y, bevel);
  const normals = geometry.getAttribute("normal");
  return stoneFinish(geometry, (i) => {
    const top = normals.getY(i);
    const bevel = THREE.MathUtils.smoothstep(top, .08, .60) * (1 - THREE.MathUtils.smoothstep(top, .8, 1));
    const tread = THREE.MathUtils.smoothstep(top, .65, .99);
    return [.11 + .65 * bevel + .22 * tread, .08 + .44 * Math.max(0, -top), .48 - .18 * bevel - .11 * tread];
  });
}

function mergeStone(parts: THREE.BufferGeometry[]) {
  parts.forEach((part) => part.deleteAttribute("uv"));
  const stone = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return stone;
}

export function makeGothicFrame() {
  const openings = [paneContour(.020), ...traceryOpenings()];
  const web = extrusion(lancetContour(gothicSilhouette.halfWidth, frameCrown, .358), openings, backFace, frontFace - backFace, .017);
  const normals = web.getAttribute("normal");
  const points = web.getAttribute("position");
  stoneFinish(web, (i) => {
    const side = 1 - Math.abs(normals.getZ(i));
    const central = 1 - THREE.MathUtils.smoothstep(Math.abs(points.getZ(i) + .04), .055, .145);
    return [.05, .10 + side * (.18 + .51 * central), .44 + .15 * side];
  });
  const paneTrims = [
    [paneContour(.092), paneContour(.017), .106, .075, .011],
    [paneContour(.052), paneContour(.011), .161, .019, .005],
  ] as const;
  const paneTrim = (rear: boolean) => paneTrims.map(([outer, opening, z, depth, bevel]) =>
    apertureStone(outer, opening, rear ? rearDepth(z + depth) : z, rear ? depth * .86 : depth, bevel));
  const roundelSeat = (rear: boolean) => {
    const z = .106, depth = .016;
    return apertureStone(roundel(.459), foilContour(.986), rear ? rearDepth(z + depth) : z,
      rear ? depth * .86 : depth, .004);
  };
  const sills = [
    sillCourse(3.60, .225, GOTHIC_SILL_DEPTH, .119, .028),
    sillCourse(3.43, .154, .748, .294, .018),
    sillCourse(3.29, .299, .676, .514, .024),
  ];
  const front = paneTrim(false);
  const rear = paneTrim(true);
  const gothicStone = mergeStone([
    identifyStone(web.clone(), 0), ...sills.map((sill, i) => identifyStone(sill.clone(), sillFirstBlock + i)),
    ...[...front, ...rear].map((trim) => identifyStone(trim.clone(), paneSurroundBlock)),
    identifyStone(roundelSeat(false), roundelSeatBlock), identifyStone(roundelSeat(true), roundelSeatBlock),
    ...archStones(false), ...archStones(true), ...archStoneReturns(), ...roundelStones(false), ...roundelStones(true),
  ]);
  rear.forEach((trim) => trim.dispose());
  const gothicShadow = mergeStone([
    web, shadowMoulding(), ...front, apertureStone(roundel(.459), foilContour(.986), .106, .043, .012), ...sills,
  ]);
  return { gothicStone, gothicShadow };
}
