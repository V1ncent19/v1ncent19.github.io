import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { useCourtyardGround } from "./CloisterStream";
import type { CloisterStone } from "./cloister-stone";
import { isAnitabiRecess, isUpperTerrace, lowerGarden, nearStream, onAnitabiWall, seeded, stair, stairLeftAt, terrace, upperArcadeZ, upperGarden, windowPlanes } from "./gallery-layout";
import { tintStoneWithWindows, type GlassLighting } from "./glass-optics";

const spacing = .72;

function GardenPaving({ lighting, stone }: { lighting: GlassLighting; stone: CloisterStone }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, .036), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const lightOnStone = useMemo(() => tintStoneWithWindows(3.6, lighting), [lighting]);
  const slabs = useMemo(() => {
    const result: { x: number; y: number; z: number }[] = [];
    for (let row = -13; row <= 20; row++) {
      for (let col = -17; col <= 17; col++) {
        const x = (col + (row % 2 ? .42 : 0)) * spacing;
        const z = row * spacing;
        if (nearStream(x, z, .31)) continue;
        if (isUpperTerrace(x, z)) {
          result.push({ x, y: terrace.level, z });
          continue;
        }
        if (x > stairLeftAt(z) - .1 && x < stair.right + .1 && z > stair.head && z < stair.foot) continue;
        const west = z > 1.35 && z < 10.7 && x > -11.0 && x < -4.4;
        const court = z > .14 && z < 12.55 && x > -5.05 + .12 * z && x < 11.65 - .11 * Math.max(0, z - 7);
        const apron = z > 11.9 && x > -.15 && x < 5.1 && z < 14.55;
        if (west || court || apron || isAnitabiRecess(x, z)) result.push({ x, y: 0, z });
      }
    }
    return result;
  }, []);
  useEffect(() => {
    const tiles = mesh.current;
    if (!tiles) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    slabs.forEach(({ x, y, z }, index) => {
      dummy.position.set(x, y - .083 + seeded(index + 25) * .022, z);
      dummy.rotation.y = (seeded(index + 470) - .5) * .029;
      dummy.scale.set(.665 + seeded(index + 32) * .035, .144, .67 + seeded(index + 80) * .034);
      dummy.updateMatrix();
      tiles.setMatrixAt(index, dummy.matrix);
      const tone = .55 + seeded(index + 110) * .31;
      const moss = seeded(index + 876) > .87;
      color.setRGB(tone * (moss ? .88 : 1), tone * .955, tone * (moss ? .79 : .89));
      tiles.setColorAt(index, color);
    });
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  }, [slabs]);
  return <instancedMesh ref={mesh} args={[geometry, undefined, slabs.length]} receiveShadow>
    <meshStandardMaterial {...stone} bumpScale={.045} roughness={1} onBeforeCompile={lightOnStone} />
  </instancedMesh>;
}

const cypresses = [
  [-14.2, -5.8, 5.1], [-10.8, -6.7, 6.1], [-6.45, -8.6, 5.7], [-.05, -9.4, 6.6],
  [5.2, -8.4, 5.3], [11.0, -6.1, 6.3], [14.6, -1.2, 5.4],
  [-14.6, .5, 4.3], [-10.0, -14.3, 5.7], [-4.5, -15, 5.2], [3.7, -15.3, 6.0], [10.9, -13.8, 5.1],
  [-18.1, -9.9, 6.3], [-17.1, 3.3, 4.6], [17.6, -10.6, 6.2], [18.5, -3.8, 5.9], [17.9, 6.4, 4.6],
];

const gardenBeds = [upperGarden, lowerGarden];
const gardenHedges = gardenBeds.flatMap(({ x, z, width, depth }) => [
  [x, z - depth / 2, width, .19], [x, z + depth / 2, width, .19],
  [x - width / 2, z, .19, depth], [x + width / 2, z, .19, depth],
]);
const hedges = [
  [-13.05, 3.9, .73, 6.6], [13.5, 4.75, .84, 5.55],
  [-10.1, 12.15, 4.5, .78], [8.9, 12.3, 3.8, .64],
  [-10.9, -3.5, 3.5, .68], [7.07, -1.66, .72, 1.98], [11.1, -3.3, 3.6, .68],
  ...gardenHedges,
  [-7.7, -10.45, 7.8, .76], [6.85, -10.45, 7.7, .76],
];

const planters = [[-3.15, -5.23], [5.8, -3.3], [-9.15, 3.78], [10.65, 6.88], onAnitabiWall(-3.62, -1.97)];
const flowerBeds = [
  ...[[-10.5, 9.7], [10.22, 9.6], [-6.94, 6.55], [7.15, 8.25], [-7.16, 1.1]]
    .map(([x, z]) => ({ x, z, lift: 0, spread: 1 })),
  ...gardenBeds.flatMap(({ x, z }) => [-1.07, 0, 1.07].map((offset) => ({ x: x + offset, z, lift: .29, spread: .8 }))),
  ...planters.map(([x, z]) => ({ x, z, lift: .59, spread: .36 })),
];

type Plant = { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string };

const crownProfile = [[0, 0], [.29, .01], [.63, .045], [.79, .12], [.87, .23], [.86, .35],
  [.79, .46], [.73, .56], [.65, .67], [.51, .77], [.39, .86], [.28, .94], [.15, .984], [0, 1]];

function GardenPlants() {
  const canopy = useRef<THREE.InstancedMesh>(null);
  const trees = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const flowers = useRef<THREE.InstancedMesh>(null);
  const treeGeometry = useMemo(() => {
    const geometry = new THREE.LatheGeometry(crownProfile.map(([x, y]) => new THREE.Vector2(x, y)), 17);
    const vertices = geometry.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      const radius = 1 + .075 * Math.sin(y * 54 + Math.atan2(z, x) * 5) + .055 * Math.cos(y * 37 - x * 8);
      vertices.setXYZ(i, x * radius + .12 * y * y, y, z * radius);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => treeGeometry.dispose(), [treeGeometry]);
  const foliage = useMemo(() => {
    const plants: Plant[] = [];
    hedges.forEach(([x, z, width, depth], index) => {
      const columns = Math.max(2, Math.ceil(width / .52));
      const rows = Math.max(2, Math.ceil(depth / .52));
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const seed = index * 113 + row * columns + col;
          const px = x + (col / (columns - 1) - .5) * width;
          const pz = z + (row / (rows - 1) - .5) * depth;
          plants.push({ x: px + (seeded(seed) - .5) * .09, z: pz, y: .27 + seeded(seed + 9) * .11,
            sx: .36, sy: .42 + seeded(seed + 81) * .11, sz: .35, color: seed % 3 ? "#546e40" : "#637b47" });
        }
      }
    });
    flowerBeds.forEach(({ x, z, lift, spread }, index) => {
      for (let plant = 0; plant < 10; plant++) {
        const at = index * 31 + plant;
        plants.push({ x: x + (seeded(at + 10) - .5) * 1.75 * spread, z: z + (seeded(at + 24) - .5) * .78 * spread,
          y: .12 + lift, sx: .24, sy: .21, sz: .21, color: at % 3 ? "#6e8450" : "#798954" });
      }
    });
    return plants;
  }, []);
  useEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    foliage.forEach(({ x, y, z, sx, sy, sz, color: tint }, index) => {
      dummy.position.set(x, y + (isUpperTerrace(x, z) ? terrace.level : 0), z);
      dummy.rotation.set(.04, seeded(index + 71) * Math.PI, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      canopy.current?.setMatrixAt(index, dummy.matrix);
      canopy.current?.setColorAt(index, color.set(tint).multiplyScalar(.91 + seeded(index + 18) * .21));
    });
    cypresses.forEach(([x, z, height], index) => {
      const elevation = isUpperTerrace(x, z) ? terrace.level : 0;
      dummy.position.set(x, elevation + height * .23, z);
      dummy.rotation.set(0, 0, .018);
      dummy.scale.set(1, height * .48, 1);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(index, dummy.matrix);
      const radius = .88 + seeded(index + 44) * .28;
      dummy.position.set(x, elevation + height * .085, z);
      dummy.rotation.set(.012, seeded(index + 70) * Math.PI * 2, -.015);
      dummy.scale.set(radius, height * .9, radius * .91);
      dummy.updateMatrix();
      trees.current?.setMatrixAt(index, dummy.matrix);
      trees.current?.setColorAt(index, color.set(index % 3 ? "#445d43" : "#566b49"));
    });
    flowerBeds.forEach(({ x, z, lift, spread }, index) => {
      const shades = ["#c28695", "#a692c0", "#e5cc90", "#e3d6bb"];
      for (let flower = 0; flower < 19; flower++) {
        const at = index * 19 + flower;
        dummy.position.set(x + (seeded(at + 95) - .5) * 2.05 * spread,
          .22 + lift + seeded(at + 117) * .2 + (isUpperTerrace(x, z) ? terrace.level : 0), z + (seeded(at + 12) - .5) * .95 * spread);
        dummy.rotation.set(0, seeded(at) * Math.PI, 0);
        dummy.scale.setScalar(.047 + seeded(at + 24) * .046);
        dummy.updateMatrix();
        flowers.current?.setMatrixAt(at, dummy.matrix);
        flowers.current?.setColorAt(at, color.set(shades[at % shades.length]));
      }
    });
    [canopy.current, trees.current, trunks.current, flowers.current].forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [foliage]);
  return (
    <>
      <instancedMesh ref={canopy} args={[undefined, undefined, foliage.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial roughness={.97} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, cypresses.length]} castShadow receiveShadow>
        <cylinderGeometry args={[.08, .14, 1, 8]} />
        <meshStandardMaterial color="#675347" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={trees} args={[treeGeometry, undefined, cypresses.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={.96} />
      </instancedMesh>
      <instancedMesh ref={flowers} args={[undefined, undefined, flowerBeds.length * 19]} receiveShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={.84} emissive="#41312c" emissiveIntensity={.22} />
      </instancedMesh>
    </>
  );
}

function WallIvy() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const leaf = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
      0, -.84, 0, -.68, -.19, 0, -.57, .36, 0, 0, .98, -.06, .55, .41, 0, .68, -.16, 0, 0, .12, .25,
    ], 3));
    geometry.setIndex([0, 6, 1, 1, 6, 2, 2, 6, 3, 3, 6, 4, 4, 6, 5, 5, 6, 0]);
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => leaf.dispose(), [leaf]);
  const leaves = useMemo(() => {
    const foliage: Array<{ x: number; y: number; z: number; yaw: number }> = [];
    windowPlanes.forEach((plane, windowIndex) => {
      const side = windowIndex === 0 || windowIndex === 3 ? -1 : 1;
      for (let index = 0; index < 40; index++) {
        const seed = windowIndex * 71 + index;
        const fraction = seeded(seed + 93);
        const wallX = side * (1.83 + .10 * Math.sin(fraction * 22 + windowIndex) + (seeded(seed + 28) - .5) * .35);
        const wallZ = -.125 + seeded(seed + 33) * .08;
        foliage.push({
          x: plane.x + wallX * plane.cos + wallZ * plane.sin,
          y: plane.y + .5 + (windowIndex % 2 ? 4.15 : 3.6) * fraction,
          z: plane.z - wallX * plane.sin + wallZ * plane.cos,
          yaw: plane.yaw,
        });
      }
    });
    for (let i = 0; i < 45; i++) {
      const x = -.97 + seeded(i + 75) * 1.84;
      const y = terrace.level + 4.61 + Math.cos(x * 3.1) * .11 - seeded(i + 117) * .21;
      foliage.push({ x, y, z: upperArcadeZ - .09 + seeded(i + 14) * .07, yaw: 0 });
    }
    return foliage;
  }, []);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const palette = ["#536539", "#657747", "#80924f", "#87925c"];
    leaves.forEach(({ x, y, z, yaw }, index) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set((seeded(index + 97) - .5) * .88, yaw + (seeded(index + 23) - .5) * .86, seeded(index + 7) * 6.28);
      dummy.scale.setScalar(.075 + seeded(index + 61) * .071);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color.set(palette[index % palette.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [leaves]);
  return <instancedMesh ref={ref} args={[leaf, undefined, leaves.length]} castShadow receiveShadow>
    <meshStandardMaterial side={THREE.DoubleSide} roughness={.92} />
  </instancedMesh>;
}

const basinProfile = [[0, 0], [1.22, 0], [1.27, .08], [1.27, .15], [1.09, .19], [1.1, .29],
  [1.24, .32], [1.27, .41], [1.25, .47], [1.12, .47], [1.06, .36], [0, .36]];
const planterProfile = [[0, 0], [.21, 0], [.23, .08], [.27, .11], [.37, .39], [.4, .48], [.4, .55],
  [.365, .58], [.31, .54], [.29, .47], [0, .47]];

function GardenStonework({ stone }: { stone: CloisterStone }) {
  const bowl = useMemo(() => basinProfile.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const pots = useMemo(() => new THREE.LatheGeometry(planterProfile.map(([x, y]) => new THREE.Vector2(x, y)), 24), []);
  useEffect(() => () => pots.dispose(), [pots]);
  return (
    <>
      <group position={[.93, 0, 7.47]}>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[bowl, 64]} />
          <meshStandardMaterial {...stone} bumpScale={.034} color="#e8d8b8" roughness={.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .397, 0]} receiveShadow>
          <circleGeometry args={[1.101, 64]} />
          <meshPhysicalMaterial color="#577974" roughness={.31} metalness={.15} clearcoat={.52} />
        </mesh>
        <mesh position={[0, .47, 0]} castShadow>
          <cylinderGeometry args={[.18, .24, .22, 20]} />
          <meshStandardMaterial {...stone} color="#dbcaac" roughness={.94} />
        </mesh>
      </group>
      {planters.map(([x, z], index) => (
        <mesh key={index} geometry={pots} position={[x, isUpperTerrace(x, z) ? terrace.level : 0, z]} castShadow receiveShadow>
          <meshStandardMaterial {...stone} color={index % 2 ? "#bd8c65" : "#b8916e"} bumpScale={.027} roughness={.93} />
        </mesh>
      ))}
      {gardenBeds.map(({ x, z, width, depth }, index) => (
        <mesh key={index} position={[x, (isUpperTerrace(x, z) ? terrace.level : 0) + .055, z]} receiveShadow>
          <boxGeometry args={[width + .48, .17, depth + .43]} />
          <meshStandardMaterial {...stone} color="#a28f70" bumpScale={.029} roughness={1} />
        </mesh>
      ))}
      {[[-10.55, 11.3, .16], [5.48, 11.15, -.08]].map(([x, z, yaw]) => (
        <group key={x} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          {[-.72, .72].map((x) => (
            <mesh key={x} position={[x, .22, 0]} castShadow receiveShadow>
              <boxGeometry args={[.31, .44, .46]} />
              <meshStandardMaterial {...stone} color="#c6b694" roughness={.96} />
            </mesh>
          ))}
          <mesh position={[0, .48, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.96, .16, .52]} />
            <meshStandardMaterial {...stone} bumpScale={.034} color="#dfcfad" roughness={.94} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function GardenCourtyard({ lighting, stone }: { lighting: GlassLighting; stone: CloisterStone }) {
  const ground = useCourtyardGround();
  const grass = useMemo(() => {
    const texture = stone.map.clone();
    texture.repeat.set(.32, .32);
    return texture;
  }, [stone]);
  useEffect(() => () => { grass.dispose(); ground.dispose(); }, [grass, ground]);
  return (
    <>
      <mesh geometry={ground} position={[0, -.16, 0]} receiveShadow>
        <meshStandardMaterial map={grass} bumpMap={grass} bumpScale={.034} color="#7b8b55" roughness={1} />
      </mesh>
      <GardenPaving lighting={lighting} stone={stone} />
      <GardenPlants />
      <WallIvy />
      <GardenStonework stone={stone} />
    </>
  );
}
