import * as THREE from "three";
import { TREE_SEAT_BASE_RADIUS } from "./sundial-layout";

const soilRadius = 1.145;
const rimTop = .191;
const brassInner = 1.394;
const brassOuter = 1.426;
const segments = 128;

// From the footing, around the coping, and down the inside wall into the soil.
const rimProfile: [number, number][] = [
  [TREE_SEAT_BASE_RADIUS, -.041], [TREE_SEAT_BASE_RADIUS, .016], [1.519, .036], [1.507, .152],
  [1.485, .177], [1.460, rimTop], [brassOuter, rimTop], [brassOuter, .181], [brassInner, .181],
  [brassInner, rimTop], [1.192, rimTop], [1.160, .180], [1.137, .157], [1.121, .095], [1.114, .032],
];
const insetTop = rimTop - .002;

export function plantingSoilHeight(x: number, z: number) {
  const radius = Math.hypot(x, z);
  const roots = .029 * Math.exp(-4.5 * radius * radius);
  const edge = .019 * THREE.MathUtils.smoothstep(radius, .79, 1.14);
  const surface = .020 * Math.sin(6 * x + 2.5 * z) * Math.cos(5 * z - x)
    + .009 * Math.cos(12 * x - 4 * z) * Math.sin(11 * z + 3 * x)
    + .004 * Math.sin(17 * x + 14 * z) * Math.cos(13 * z - 7 * x);
  return .061 + roots + edge + surface;
}

// Each knot gives x, z and the centerline's height relative to the soil at that point.
const rootPaths = [
  [.158, [[.09, .05, .235], [-.08, .16, .118], [-.26, .32, .034], [-.46, .42, -.012], [-.64, .52, -.051]]],
  [.136, [[.095, .047, .198], [.24, .13, .096], [.43, .09, .026], [.62, -.026, -.012], [.84, -.12, -.055]]],
  [.113, [[.055, .03, .211], [.085, -.12, .099], [.014, -.30, .025], [-.11, -.45, -.009], [-.26, -.61, -.049]]],
  [.090, [[.018, .02, .165], [-.16, -.028, .063], [-.35, -.096, .018], [-.50, -.22, -.015], [-.62, -.28, -.042]]],
  [.040, [[-.22, .28, .017], [-.32, .39, .016], [-.32, .51, -.005], [-.38, .65, -.025]]],
  [.032, [[.40, .10, .017], [.49, .168, .007], [.54, .29, -.012], [.64, .37, -.036]]],
] as const;

function makePlanterRoots() {
  return rootPaths.map(([width, knots], root) => {
    const path = new THREE.CatmullRomCurve3(knots.map(([x, z, depth]) => new THREE.Vector3(x, plantingSoilHeight(x, z) + depth, z)));
    const rings = 32, sides = 12;
    const geometry = new THREE.TubeGeometry(path, rings, width, sides, false);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const offset = new THREE.Vector3(), center = new THREE.Vector3();
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings;
      path.getPointAt(t, center);
      const taper = .045 + .955 * (1 - t) ** .77;
      for (let side = 0; side <= sides; side++) {
        const i = ring * (sides + 1) + side, angle = side * Math.PI * 2 / sides;
        const grain = Math.sin(3 * angle + t * 2.8 + root) + .44 * Math.sin(5 * angle - t * 3.2);
        offset.fromBufferAttribute(positions, i).sub(center).multiplyScalar(taper * (1 + .098 * grain));
        // Keep the root collar full and flatten the smaller sections as they enter the soil.
        offset.y *= .94 - .24 * THREE.MathUtils.smoothstep(t, .10, .83);
        offset.add(center);
        positions.setXYZ(i, offset.x, offset.y, offset.z);
        const aboveSoil = offset.y - plantingSoilHeight(offset.x, offset.z);
        const contact = 1 - THREE.MathUtils.smoothstep(aboveSoil, .002, .065);
        const bark = .88 + .083 * grain + .036 * Math.sin(t * 31 + angle * 2);
        colors.set([bark * (1 - .24 * contact), bark * (.958 - .235 * contact), bark * (.928 - .23 * contact)], i * 3);
      }
    }
    geometry.computeVertexNormals();
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  });
}

function makeSoilAggregate(random: (seed: number) => number) {
  const geometry = new THREE.IcosahedronGeometry(1);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const facet = .94 + .15 * Math.sin(9 * x + 13 * z + 5 * y);
    positions.setXYZ(i, x * facet, y * facet, z * facet);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96 });
  const count = 144;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "Planter soil aggregate";
  mesh.receiveShadow = true;
  const soilDark = new THREE.Color("#665447"), soilPale = new THREE.Color("#97806a");
  const stoneDark = new THREE.Color("#736b60"), stonePale = new THREE.Color("#ae9a80");
  const grain = new THREE.Object3D(), color = new THREE.Color();
  const patches = [[-.53, .39], [.26, .60], [.70, -.20], [-.33, -.63], [.12, -.76]];
  for (let i = 0; i < count; i++) {
    const seed = 47 + 21 * i;
    const angle = Math.PI * 2 * random(seed);
    const circle = Math.sqrt(random(seed + 1));
    const [px, pz] = patches[i % patches.length];
    const clustered = i % 3 === 0;
    const radius = circle * (clustered ? .29 : 1.01);
    const x = Math.cos(angle) * radius + (clustered ? px : 0);
    const z = Math.sin(angle) * radius + (clustered ? pz : 0);
    const fragment = i % 5 === 0;
    const size = fragment ? .024 + .032 * random(seed + 2) : .007 + .019 * random(seed + 2);
    const height = size * (.43 + .24 * random(seed + 3));
    const r = Math.hypot(x, z);
    const fit = Math.min(1, (soilRadius - .095) / Math.max(.001, r));
    const sx = x * fit, sz = z * fit;
    grain.position.set(sx, plantingSoilHeight(sx, sz) - height * (.13 + .38 * random(seed + 4)), sz);
    grain.rotation.set((random(seed + 5) - .5) * .59, random(seed + 6) * Math.PI * 2, (random(seed + 7) - .5) * .71);
    grain.scale.set(size * (.92 + .31 * random(seed + 8)), height, size * (.62 + .29 * random(seed + 9)));
    grain.updateMatrix();
    mesh.setMatrixAt(i, grain.matrix);
    color.copy(fragment ? stoneDark : soilDark).lerp(fragment ? stonePale : soilPale, random(seed + 10));
    mesh.setColorAt(i, color);
  }
  return mesh;
}

export function makeSundialPlanter(random: (seed: number) => number) {
  const rim = new THREE.LatheGeometry(rimProfile.map(([radius, y]) => new THREE.Vector2(radius, y)), segments);
  const inlay = new THREE.RingGeometry(brassInner, brassOuter, segments, 1, Math.PI / 2)
    .rotateX(-Math.PI / 2).translate(0, insetTop, 0);
  const soil = new THREE.RingGeometry(0, soilRadius, segments, 34).rotateX(-Math.PI / 2);
  const vertices = soil.getAttribute("position");
  for (let i = 0; i < vertices.count; i++) {
    vertices.setY(i, plantingSoilHeight(vertices.getX(i), vertices.getZ(i)));
  }
  soil.computeVertexNormals();
  const roots = makePlanterRoots();
  const aggregate = makeSoilAggregate(random);
  const surfaces = [...roots.map((geometry) => new THREE.Mesh(geometry, aggregate.material)), aggregate];
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const sample = (x: number, z: number) => {
    const base = samplePlanter(x, z);
    if (!base || Math.hypot(x, z) >= soilRadius) return base;
    ray.ray.origin.set(x, .58, z);
    const [hit] = ray.intersectObjects(surfaces, false);
    if (!hit?.face || hit.point.y <= base.height) return base;
    const up = hit.face.normal;
    if (hit.instanceId !== undefined) {
      aggregate.getMatrixAt(hit.instanceId, matrix);
      up.applyNormalMatrix(normalMatrix.getNormalMatrix(matrix));
    }
    const dy = Math.max(.08, up.y);
    return { height: hit.point.y, slopeX: -up.x / dy, slopeZ: -up.z / dy };
  };
  const dispose = () => {
    [rim, inlay, soil, ...roots, aggregate.geometry].forEach((geometry) => geometry.dispose());
    aggregate.material.dispose();
    aggregate.dispose();
  };
  return { rim, inlay, soil, roots, aggregate, sample, dispose };
}

function samplePlanter(x: number, z: number) {
  const radius = Math.hypot(x, z);
  if (radius >= TREE_SEAT_BASE_RADIUS) return;
  let height = radius < soilRadius ? plantingSoilHeight(x, z) : -Infinity;
  const step = .01;
  let slopeX = radius < soilRadius ? (plantingSoilHeight(x + step, z) - plantingSoilHeight(x - step, z)) / (2 * step) : 0;
  let slopeZ = radius < soilRadius ? (plantingSoilHeight(x, z + step) - plantingSoilHeight(x, z - step)) / (2 * step) : 0;
  if (radius >= brassInner && radius <= brassOuter) return { height: insetTop, slopeX: 0, slopeZ: 0 };
  for (let i = 1; i < rimProfile.length; i++) {
    const [a, low] = rimProfile[i - 1], [b, high] = rimProfile[i];
    if (radius < Math.min(a, b) || radius > Math.max(a, b) || a === b) continue;
    const rise = (high - low) / (b - a);
    const y = low + rise * (radius - a);
    if (y <= height) continue;
    height = y;
    slopeX = rise * x / radius;
    slopeZ = rise * z / radius;
  }
  return { height, slopeX, slopeZ };
}
