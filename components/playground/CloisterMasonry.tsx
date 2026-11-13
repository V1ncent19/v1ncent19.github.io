import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CloisterStone } from "./cloister-stone";
import { anitabiRecess, anitabiWall, balconyRim, onAnitabiWall, retainingRim, seeded, stair, stairLeftAt, terrace, terraceRim, upperArcadeZ } from "./gallery-layout";
import { tintStoneWithWindows, type GlassLighting } from "./glass-optics";

type Block = { x: number; y: number; z: number; width: number; height: number; depth: number; yaw?: number };
type WallRun = {
  a: readonly [number, number];
  b: readonly [number, number];
  startHeight: number;
  endHeight: number;
  depth: number;
  base?: number;
};

function buildSteps() {
  const blocks: Block[] = [];
  const stepDepth = (stair.foot - stair.head) / stair.count;
  for (let i = 0; i < stair.count; i++) {
    const rise = terrace.level * (stair.count - i - 1) / stair.count + .045;
    const z = stair.head + (i + .47) * stepDepth;
    const left = stairLeftAt(z);
    const span = stair.right - left;
    for (let col = 0; col < 3; col++) {
      const x = left + (col + .5) * span / 3;
      blocks.push({ x, y: rise * .5 - .035, z, width: span / 3 - .014, height: rise + .07, depth: stepDepth + .048 });
    }
  }
  return blocks;
}

function buildWallBlocks(walls: WallRun[], uneven = true) {
  const result: Block[] = [];
  walls.forEach(({ a, b, startHeight, endHeight, depth, base = 0 }, index) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);
    const course = .33;
    for (let row = 0; row < Math.ceil(Math.max(startHeight, endHeight) / course); row++) {
      for (let from = 0; from < length - .07;) {
        const width = Math.min(length - from, (row % 2 && from === 0 ? .37 : .64) + seeded(index * 331 + row * 17 + from) * .35);
        const t = (from + width / 2) / length;
        const top = THREE.MathUtils.lerp(startHeight, endHeight, t) + (uneven ? (seeded(t * 731 + index) - .5) * .38 : 0);
        if ((row + .8) * course < top && width > .035) {
          result.push({ x: a[0] + dx * t, y: base + (row + .5) * course - .06, z: a[1] + dz * t,
            width: width - .023, height: .311, depth: depth + seeded(row + from * 12) * .095, yaw });
        }
        from += width;
      }
    }
  });
  return result;
}

function buildCourtyardBlocks() {
  const retaining = retainingRim.slice(1).map((b, index) => ({
    a: retainingRim[index], b, startHeight: terrace.level + .07, endHeight: terrace.level + .07, depth: .46,
  }));
  const parapet = balconyRim.slice(1).map((b, index) => ({
    a: balconyRim[index], b, startHeight: .73, endHeight: .73, depth: .42, base: terrace.level,
  }));
  const recess = anitabiRecess.slice(1).map((b, index) => ({
    a: onAnitabiWall(...anitabiRecess[index]), b: onAnitabiWall(...b),
    startHeight: index === 1 ? 2.7 : 2.1, endHeight: index === 1 ? 2.55 : 1.9, depth: .47,
  }));
  const returns: WallRun[] = [
    { a: [-10.31, 3.61], b: [-11.33, 8.6], startHeight: 2.8, endHeight: .84, depth: .58 },
    { a: [-6.58, 1.18], b: [-7.3, -1.04], startHeight: 2.65, endHeight: 1.57, depth: .6 },
    { a: [-6.48, -4.34], b: [-6.19, -2.2], startHeight: 4.2, endHeight: 1.3, depth: .63, base: terrace.level },
    { a: [6.56, -4.51], b: [7.87, -2.68], startHeight: 4.62, endHeight: 2.08, depth: .65, base: terrace.level },
    { a: [7.87, -2.68], b: [8.08, -.88], startHeight: 2.08, endHeight: .91, depth: .62, base: terrace.level },
    { a: onAnitabiWall(2.08, -.26), b: onAnitabiWall(3.63, -.24), startHeight: 3.28, endHeight: 1.62, depth: .56 },
    { a: [-8.22, -5.25], b: [-8.06, -2.84], startHeight: 2.3, endHeight: 1.82, depth: .61 },
  ];
  return [...buildSteps(), ...buildWallBlocks(retaining, false), ...buildWallBlocks(parapet, false), ...buildWallBlocks([...returns, ...recess])];
}

function StoneCourses({ blocks, geometry, stone, lighting }: {
  blocks: Block[];
  geometry: THREE.BufferGeometry;
  stone: CloisterStone;
  lighting: GlassLighting;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tint = useMemo(() => tintStoneWithWindows(3.15, lighting), [lighting]);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    blocks.forEach(({ x, y, z, width, height, depth, yaw }, index) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw ?? 0, (seeded(index + 381) - .5) * .026);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const tone = .61 + seeded(index + 73) * .29;
      mesh.setColorAt(index, color.setRGB(tone, tone * .96, tone * .86));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks]);
  return <instancedMesh ref={ref} args={[geometry, undefined, blocks.length]} castShadow receiveShadow>
    <meshStandardMaterial {...stone} bumpScale={.044} roughness={1} onBeforeCompile={tint} />
  </instancedMesh>;
}

const arcadeSpring = 2.48;
const arcadeTip = 4.43;
const bayHalf = 1.075;

function archPoint(center: number, progress: number, outer: boolean) {
  const side = progress < .5 ? -1 : 1;
  const t = 1 - Math.abs(progress * 2 - 1);
  const edge = outer ? .17 : 0;
  const x = center + side * (bayHalf + edge) * (1 - t ** 2);
  const y = arcadeSpring + 2 * (1 - t) * t * 1.20 + t ** 2 * (arcadeTip - arcadeSpring + edge);
  return new THREE.Vector2(x, y);
}

function makeArcade(bays: number) {
  const centers = bays === 1 ? [0] : [-1.31, 1.31];
  const half = bays === 1 ? 1.63 : 2.81;
  const wall = new THREE.Shape();
  wall.moveTo(-half, 0);
  wall.lineTo(half, 0);
  wall.lineTo(half, 4.63);
  wall.lineTo(half * .8, 4.72);
  wall.lineTo(half * .76, 4.88);
  wall.lineTo(half * .26, 4.78);
  wall.lineTo(half * .11, 4.94);
  wall.lineTo(-half * .43, 4.91);
  wall.lineTo(-half * .58, 4.77);
  wall.lineTo(-half, 4.87);
  wall.closePath();
  const stones: THREE.ExtrudeGeometry[] = [];
  for (const [index, center] of centers.entries()) {
    const opening = new THREE.Path();
    opening.moveTo(center - bayHalf, .105);
    for (let point = 0; point <= 30; point++) opening.lineTo(...archPoint(center, point / 30, false).toArray());
    opening.lineTo(center + bayHalf, .105);
    opening.closePath();
    wall.holes.push(opening);
    for (let block = 0; block < 14; block++) {
      const stone = new THREE.Shape();
      const start = (block + .026) / 14, end = (block + .974) / 14;
      stone.moveTo(...archPoint(center, start, false).toArray());
      stone.lineTo(...archPoint(center, end, false).toArray());
      stone.lineTo(...archPoint(center, end, true).toArray());
      stone.lineTo(...archPoint(center, start, true).toArray());
      stone.closePath();
      const geom = new THREE.ExtrudeGeometry(stone, { depth: .13, bevelEnabled: true, bevelSize: .013, bevelThickness: .01, bevelSegments: 1 });
      const color = new THREE.Color("#e5d5b5").multiplyScalar(.75 + seeded(index * 41 + block) * .24);
      const colors = new Float32Array(geom.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) colors.set(color.toArray(), i);
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      stones.push(geom);
    }
  }
  const voussoirs = mergeGeometries(stones);
  stones.forEach((geometry) => geometry.dispose());
  return { wall: new THREE.ExtrudeGeometry(wall, { depth: .53, bevelEnabled: true, bevelSize: .02, bevelThickness: .022, bevelSegments: 1 }), voussoirs };
}

function OpenArcade({ bays, stone }: { bays: number; stone: CloisterStone }) {
  const { wall, voussoirs } = useMemo(() => makeArcade(bays), [bays]);
  useEffect(() => () => { wall.dispose(); voussoirs.dispose(); }, [wall, voussoirs]);
  const posts = bays === 1 ? [-1.25, 1.25] : [-2.57, 0, 2.57];
  return (
    <>
      <mesh geometry={wall} position={[0, 0, -.69]} castShadow receiveShadow>
        <meshStandardMaterial {...stone} color="#c1b497" bumpScale={.038} roughness={.97} />
      </mesh>
      <mesh geometry={voussoirs} position={[0, 0, -.185]} castShadow receiveShadow>
        <meshStandardMaterial {...stone} vertexColors bumpScale={.036} roughness={.96} />
      </mesh>
      {posts.map((x) => (
        <group key={x} position={[x, 0, -.04]}>
          <mesh position={[0, 1.41, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[.13, .17, 2.06, 14]} />
            <meshStandardMaterial {...stone} color="#e8dac1" bumpScale={.035} roughness={.95} />
          </mesh>
          {[.37, 2.46].map((y) => <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[.42, .19, .39]} />
            <meshStandardMaterial {...stone} color="#d9c9ab" bumpScale={.026} roughness={.97} />
          </mesh>)}
        </group>
      ))}
    </>
  );
}

export default function CloisterMasonry({ stone, lighting, block }: {
  stone: CloisterStone;
  lighting: GlassLighting;
  block: THREE.BufferGeometry;
}) {
  const blocks = useMemo(() => buildCourtyardBlocks(), []);
  const platform = useMemo(() => {
    const shape = new THREE.Shape(terraceRim.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: terrace.level + .095, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  useEffect(() => () => platform.dispose(), [platform]);
  return (
    <>
      <mesh geometry={platform} position={[0, -.18, 0]} receiveShadow>
        <meshStandardMaterial {...stone} color="#8e8266" bumpScale={.045} roughness={1} />
      </mesh>
      <StoneCourses blocks={blocks} geometry={block} stone={stone} lighting={lighting} />
      <group position={[0, terrace.level, upperArcadeZ]} scale={[1.09, 1, 1]}>
        <OpenArcade bays={2} stone={stone} />
      </group>
      <group position={[anitabiWall.x, 0, anitabiWall.z]} rotation={[0, anitabiWall.yaw, 0]}>
        <group position={[-3.53, 0, -.02]} scale={[.88, .78, 1]}>
          <OpenArcade bays={1} stone={stone} />
        </group>
      </group>
    </>
  );
}
