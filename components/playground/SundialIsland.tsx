import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { panel, panelHalfWidth } from "@/assets-src/playground/louvre-panel.mjs";
import { SUNDIAL_PAVING_INSET, sundialLayout, TREE_SEAT_BASE_RADIUS, WINDOW_SCALE, type Slot } from "./sundial-layout";
import { installTreeTransmission, paneMaterial, stoneProjection, type SundialLighting } from "./sundial-optics";
import { agedBrass, carvedStone, cherryCrownTexture, plantingSoil, windowLimestone } from "./sundial-materials";
import { sundialFloorSurface } from "./sundial-floor";
import type { SundialInlay } from "./sundial-inlay";
import { makeSundialPlanter, plantingSoilHeight } from "./sundial-planter";
import { makeGothicFrame } from "./france-window-frame";
import { makeTraceryGlass } from "./tracery-glass";
import { CHERRY_ANCHOR, CHERRY_CROWN_HEIGHT, CHERRY_REBOUND_START, cherryFlex, cherryTreeHeight, type CherryMotion } from "./sundial-cherry-motion";

const brass = "#bd9759";
const tau = Math.PI * 2;

function random(seed: number) {
  const n = Math.sin(seed * 136.591 + 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function StudioEnvironment() {
  const { scene, gl } = useThree();
  useEffect(() => setStudioEnvironment(scene, gl), [scene, gl]);
  return null;
}

function setStudioEnvironment(scene: THREE.Scene, gl: THREE.WebGLRenderer) {
  const room = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(gl);
  const target = generator.fromScene(room, .065);
  const before = scene.environment;
  const oldIntensity = scene.environmentIntensity;
  scene.environment = target.texture;
  scene.environmentIntensity = .45;
  return () => {
    scene.environment = before;
    scene.environmentIntensity = oldIntensity;
    target.dispose();
    generator.dispose();
    room.dispose();
  };
}

function setUniform(uniform: THREE.IUniform<number>, value: number) { uniform.value = value; }

function diskProfile(points: [number, number][]) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 192);
}

function illuminatedBrass(optics: SundialLighting): THREE.MeshStandardMaterial["onBeforeCompile"] {
  return (shader) => {
    agedBrass(shader);
    installTreeTransmission(shader, optics);
  };
}

function quarriedUnderside(profile: [number, number][]) {
  const stone = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 128);
  const position = stone.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i), py = position.getY(i), pz = position.getZ(i);
    const angle = Math.atan2(pz, px);
    const radius = Math.hypot(px, pz);
    const shoulder = THREE.MathUtils.smoothstep(-py, .65, 1.55);
    const split = Math.sin(angle * 8 + py * .48);
    const cut = .28 * split * Math.abs(split) + .15 * Math.sin(angle * 13 + py * 1.6) + .095 * Math.sin(angle * 23 - py * 2.1)
      + .054 * Math.cos(angle * 41 + py * 4.7);
    const offset = shoulder * cut * Math.min(radius, 1);
    const chippedY = shoulder * (.18 * Math.sin(angle * 8) + .09 * Math.cos(angle * 19)) * Math.min(radius, 1);
    position.setXYZ(i, px + Math.cos(angle) * offset, py + chippedY, pz + Math.sin(angle) * offset);
  }
  stone.computeVertexNormals();
  return stone;
}

export function SundialIsland({ layout, optics, floor, inlay }: {
  layout: ReturnType<typeof sundialLayout>; optics: SundialLighting; floor: THREE.BufferGeometry; inlay: SundialInlay;
}) {
  const parts = useMemo(() => {
    const r = layout.plate;
    const e = layout.island;
    const paving = r - SUNDIAL_PAVING_INSET;
    const rimInner = paving - .003;
    const rimOuter = rimInner + .036;
    return {
      upper: diskProfile([[e - .13, -.26], [e - .015, -.22], [e - .048, -.12], [e - .14, -.036], [r + .025, -.018],
        [rimOuter, -.011], [rimOuter, -.022], [rimInner, -.022], [rimInner, -.008], [paving - .021, -.008], [paving - .043, -.021]]),
      rim: diskProfile([[rimOuter, -.0125], [rimInner, -.0095]]),
      metal: diskProfile([[e - .26, -.72], [e - .085, -.62], [e, -.50], [e, -.27], [e - .025, -.20], [e - .072, -.16]]),
      tray: quarriedUnderside([[0, -2.0], [e - 1.28, -2.0], [e - .98, -1.88], [e - .76, -1.72], [e - .62, -1.51],
        [e - .39, -1.29], [e - .26, -1.13], [e - .16, -.95], [e - .09, -.78], [e - .062, -.53], [0, -.53]]),
    };
  }, [layout.plate, layout.island]);
  const projection = useMemo(() => stoneProjection(optics, inlay), [optics, inlay]);
  const bevelProjection = useMemo(() => stoneProjection(optics), [optics]);
  const brassFinish = useMemo(() => illuminatedBrass(optics), [optics]);
  useEffect(() => () => Object.values(parts).forEach((geometry) => geometry.dispose()), [parts]);

  return (
    <>
      <mesh geometry={parts.tray} receiveShadow><meshStandardMaterial color="#b5b1aa" roughness={.83} side={THREE.DoubleSide} onBeforeCompile={carvedStone} /></mesh>
      <mesh geometry={parts.upper} receiveShadow><meshStandardMaterial color="#b1a89a" roughness={.84} side={THREE.DoubleSide} onBeforeCompile={bevelProjection}
        customProgramCacheKey={() => `sundial-bevel-${optics.layers.value.length}-${optics.tracery.columns}`} /></mesh>
      <mesh name="Sundial rim inlay" geometry={parts.rim} receiveShadow>
        <meshStandardMaterial color="#b29563" metalness={.73} roughness={.49} onBeforeCompile={brassFinish}
          customProgramCacheKey={() => `sundial-lit-brass-${optics.layers.value.length}-${optics.tracery.columns}`} />
      </mesh>
      <mesh geometry={parts.metal} receiveShadow><meshPhysicalMaterial color="#b5945d" metalness={.88} roughness={.33} clearcoat={.13} side={THREE.DoubleSide} onBeforeCompile={agedBrass} /></mesh>
      <mesh geometry={floor} receiveShadow>
        <meshStandardMaterial color="#afa89d" roughness={.84} onBeforeCompile={projection}
          customProgramCacheKey={() => `sundial-stone-${optics.layers.value.length}-${optics.tracery.enabled ? optics.tracery.columns : 0}-${inlay.arcs.length}-${inlay.radials.length}-${inlay.elbows.length}-${inlay.junctions.length}`} />
      </mesh>
    </>
  );
}

function makeWindowGeometry() {
  const glass = new THREE.Shape();
  const outer = new THREE.Shape();
  const hole = new THREE.Path();
  const points = Array.from({ length: 65 }, (_, index) => {
    const y = THREE.MathUtils.lerp(panel.glassBottom, panel.glassTop, index / 64);
    return new THREE.Vector2(panelHalfWidth(y), y * panel.heightScale);
  });
  const arch = [...points, ...points.slice(0, -1).reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
  glass.setFromPoints(arch);
  const bottom = panel.glassBottom * panel.heightScale;
  outer.setFromPoints(arch.map((p) => new THREE.Vector2(p.x * 1.16, bottom - .215 + (p.y - bottom) * 1.066)));
  hole.setFromPoints(arch.map((p) => new THREE.Vector2(p.x * .991, bottom + .024 + (p.y - bottom) * .992)).reverse());
  outer.holes.push(hole);
  const pane = new THREE.ShapeGeometry(glass, 64);
  const position = pane.getAttribute("position");
  const uv = pane.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, .5 + position.getX(i) / panel.width, (position.getY(i) / panel.heightScale - panel.bottom) / panel.height);
  }
  const frame = new THREE.ExtrudeGeometry(outer, { depth: .25, bevelEnabled: true, bevelThickness: .036, bevelSize: .024, bevelSegments: 3, curveSegments: 24 });
  const molding = new THREE.ExtrudeGeometry(outer, { depth: .075, bevelEnabled: true, bevelThickness: .022, bevelSize: .029, bevelSegments: 3, curveSegments: 24 });
  return {
    pane, frame, molding, block: new RoundedBoxGeometry(1, 1, 1, 4, .067),
    ...makeGothicFrame(), traceryGlass: makeTraceryGlass(),
  };
}

export function useWindowGeometry() {
  const details = useMemo(() => makeWindowGeometry(), []);
  useEffect(() => () => Object.values(details).forEach((g) => g.dispose()), [details]);
  return details;
}

function GothicWindowStone({ seed, geometry, hover, index }: {
  seed: number; geometry: ReturnType<typeof useWindowGeometry>;
  hover?: SundialLighting["activation"]["illumination"]; index?: number;
}) {
  const stone = useMemo(() => {
    const surface = new THREE.MeshStandardMaterial({ color: "#aaa295", roughness: .76 });
    surface.onBeforeCompile = windowLimestone(seed, hover, index);
    surface.customProgramCacheKey = () => `sundial-frame-${hover?.value.length ?? 0}`;
    return surface;
  }, [seed, hover, index]);
  useEffect(() => () => stone.dispose(), [stone]);
  return (
    <>
      <mesh geometry={geometry.gothicStone} material={stone} receiveShadow />
      {/* Keep the structural light mask independent of the surface carving. */}
      <mesh geometry={geometry.gothicShadow} castShadow raycast={() => {}}>
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </>
  );
}

function GothicWindowFrame({ optics, layer, atlasIndex, slot, geometry }: {
  optics: SundialLighting; layer: number; atlasIndex: number; slot: number; geometry: ReturnType<typeof useWindowGeometry>;
}) {
  const material = useMemo(() => paneMaterial(optics, atlasIndex, slot, layer), [optics, atlasIndex, slot, layer]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <>
      <GothicWindowStone seed={atlasIndex} geometry={geometry} hover={optics.activation.illumination} index={slot} />
      <mesh geometry={geometry.traceryGlass} material={material} />
    </>
  );
}

function SundialWindowFrame({ geometry }: { geometry: ReturnType<typeof useWindowGeometry> }) {
  return (
    <>
      <mesh geometry={geometry.frame} position-z={-.125} castShadow receiveShadow>
        <meshStandardMaterial color="#d8ceba" roughness={.72} onBeforeCompile={carvedStone} />
      </mesh>
      {[-.157, .085].map((offset) => (
        <mesh key={offset} position-z={offset} geometry={geometry.molding}>
          <meshPhysicalMaterial color="#c49a57" metalness={.87} roughness={.32} clearcoat={.15} onBeforeCompile={agedBrass} />
        </mesh>
      ))}
      <mesh geometry={geometry.block} position-y={.165} scale={[3.65, .33, 1.02]} castShadow receiveShadow>
        <meshStandardMaterial color="#b5aea4" roughness={.81} onBeforeCompile={carvedStone} />
      </mesh>
      <mesh geometry={geometry.block} position-y={.42} scale={[3.11, .29, .75]} castShadow receiveShadow>
        <meshStandardMaterial color="#d6cebe" roughness={.73} onBeforeCompile={carvedStone} />
      </mesh>
      <mesh geometry={geometry.block} position-y={.29} scale={[3.51, .036, .95]} receiveShadow>
        <meshStandardMaterial color={brass} metalness={.81} roughness={.36} onBeforeCompile={agedBrass} />
      </mesh>
    </>
  );
}

export function SundialEmptyWindow({ slot, seed, geometry, clearHover }: {
  slot: Slot; seed: number; geometry: ReturnType<typeof useWindowGeometry>; clearHover: (index: number) => void;
}) {
  return (
    <group name={`Travel window ${slot.id}`} position={[slot.x, 0, slot.z]} rotation-y={slot.yaw} scale={WINDOW_SCALE}
      onPointerMove={(event) => { event.stopPropagation(); clearHover(-1); }}
      onClick={(event) => event.stopPropagation()}>
      <GothicWindowStone seed={seed} geometry={geometry} />
    </group>
  );
}

export function SundialWindow({ slot, index, optics, geometry, hover, activate, drag }: {
  slot: Slot; index: number; optics: SundialLighting; geometry: ReturnType<typeof useWindowGeometry>;
  hover: (index: number) => void; activate: (index: number) => void; drag: RefObject<boolean>;
}) {
  const atlasIndex = optics.layers.value[index];
  const opticsMaterial = useMemo(() => paneMaterial(optics, atlasIndex, index), [optics, atlasIndex, index]);
  const traceryLayer = optics.tracery.layers.value[index];
  useEffect(() => () => opticsMaterial.dispose(), [opticsMaterial]);
  return (
    <group name={`Travel window ${slot.id}`} position={[slot.x, 0, slot.z]} rotation-y={slot.yaw} scale={WINDOW_SCALE}
      onPointerMove={(event) => { event.stopPropagation(); if (!drag.current) hover(index); }}
      onPointerOut={(event) => { if (event.intersections[0]?.eventObject !== event.eventObject) hover(-1); }}
      onClick={(event) => { event.stopPropagation(); if (!drag.current && event.delta < 6) activate(index); }}>
      <pointLight position={[0, 3.1, -.53]} color={optics.tints.value[index]} intensity={.54} distance={3.15} decay={2} />
      <mesh geometry={geometry.pane} material={opticsMaterial} />
      {traceryLayer >= 0
        ? <GothicWindowFrame optics={optics} layer={traceryLayer} atlasIndex={atlasIndex} slot={index} geometry={geometry} />
        : <SundialWindowFrame geometry={geometry} />}
    </group>
  );
}

// The tips are shared by the timber and the canopy so each cluster has a visible support.
const crownPads = {
  lowLeft: { tip: [-1.52, 1.97, .47], size: [.88, .32, .57], tint: .51, lobes: 13 },
  leftBack: { tip: [-1.18, 2.65, -1.12], size: [.89, .41, .82], tint: .46, lobes: 11 },
  apex: { tip: [.44, 4.03, -.37], size: [1.14, .46, .83], tint: .80, lobes: 15 },
  rear: { tip: [.24, 2.78, -2.01], size: [1.01, .41, .84], tint: .66, lobes: 11 },
  shoulder: { tip: [1.72, 2.96, -.93], size: [.94, .44, .83], tint: .63, lobes: 13 },
  reach: { tip: [2.51, 2.34, .27], size: [1.07, .37, .66], tint: .71, lobes: 15 },
  foreground: { tip: [.67, 2.16, 1.90], size: [.99, .36, .83], tint: .49, lobes: 8 },
  leftMiddle: { tip: [-1.15, 2.44, -.01], size: [.81, .43, .71], tint: .57, lobes: 9 },
  upperLeft: { tip: [-.29, 3.39, -.41], size: [.86, .47, .73], tint: .70, lobes: 11 },
  rightMiddle: { tip: [1.55, 2.52, .91], size: [.94, .40, .74], tint: .59, lobes: 11 },
  innerLeft: { tip: [-.96, 2.71, 1.27], size: [.87, .45, .82], tint: .58, lobes: 10 },
  upperFront: { tip: [-.18, 3.52, .72], size: [.93, .48, .79], tint: .72, lobes: 11 },
  innerRight: { tip: [.87, 3.11, .78], size: [.81, .46, .73], tint: .57, lobes: 10 },
  upperBack: { tip: [.91, 3.49, -1.30], size: [.88, .46, .75], tint: .68, lobes: 10 },
} as const;
const cherryPads = Object.values(crownPads);

const blossomColors = ["#f3c5d4", "#eb9ab4", "#ffdce2", "#d881a2", "#f6afc5", "#fff0e7"]
  .map((hex) => new THREE.Color(hex));
const canopyShade = new THREE.Color("#b58195");
const canopyLight = new THREE.Color("#f2cfd5");
const cherryWind = [.941, .339] as const;
const cherryWindCycle = 16.8;

function cherryWindDelay(x: number, z: number, wind: readonly [number, number] = cherryWind) {
  return .68 * (wind[0] * x + wind[1] * z);
}

const petalSources = [
  [crownPads.lowLeft, [-.65, .34, .30]], [crownPads.rear, [-.20, .24, -.40]],
  [crownPads.upperLeft, [-.40, .41, .33]], [crownPads.apex, [.35, .23, .43]],
  [crownPads.shoulder, [.57, .24, -.22]], [crownPads.reach, [.70, .10, .21]],
  [crownPads.foreground, [.28, .19, .43]],
] as const;
const petalBursts = [
  { at: .28, count: 8, bearing: -100, strength: .69 },
  { at: cherryWindCycle / 8 - .14, count: 19, bearing: -22, strength: 1.23, gust: true },
  { at: cherryWindCycle / 8 + .51, count: 16, bearing: 0, strength: 1.13 },
  { at: 4.58, count: 15, bearing: 107, strength: .93 },
  { at: 6.56, count: 10, bearing: 145, strength: .67 },
  { at: 8.42, count: 10, bearing: 191, strength: .80 },
  { at: cherryWindCycle * 5 / 8, count: 19, bearing: 154, strength: 1.23, gust: true },
  { at: 12.38, count: 12, bearing: -122, strength: .87 },
  { at: 14.16, count: 11, bearing: -97, strength: 1.05, gust: true },
  { at: 15.73, count: 8, bearing: 69, strength: .72 },
].map(({ bearing, ...burst }) => {
  const direction = Math.atan2(cherryWind[1], cherryWind[0]) + THREE.MathUtils.degToRad(bearing);
  return { ...burst, wind: [Math.cos(direction), Math.sin(direction)] as const };
});
const petalGusts = petalBursts.filter((burst) => burst.gust);

function scatterFoliage(
  shader: Parameters<THREE.MeshStandardMaterial["onBeforeCompile"]>[0], optics: SundialLighting, strength: number, canopy = true,
) {
  installTreeTransmission(shader, optics, canopy);
  shader.uniforms.foliageStrength = { value: strength };
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform float foliageStrength;")
    .replace("vec4 treeBeam = treeWindowLight();", `vec4 treeBeam = treeWindowLight();
      vec3 lightInView = mat3(viewMatrix) * treeLightRay;
      float thinEdge = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 1.7);
      float through = smoothstep(-.12, .8, -dot(normalize(vViewPosition), lightInView));
      float wrap = smoothstep(-.9, .15, -dot(normal, lightInView));
      totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, .83, .89) *
        foliageStrength * (.24 + thinEdge * .76) * through * wrap;
      totalEmissiveRadiance += treeBeam.rgb * treeBeam.a * .28 * (.35 + .65 * thinEdge);`);
  if (!canopy) return;
  shader.uniforms.cherryMoonRay = optics.keyRay;
  shader.uniforms.cherryMoonlight = optics.moonlight;
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform vec3 cherryMoonRay;\nuniform float cherryMoonlight;")
    .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
      if (cherryMoonlight > 0.0) {
        vec3 moonInView = mat3(viewMatrix) * cherryMoonRay;
        float facingMoon = dot(normal, moonInView);
        float lowMoon = 1.0 - smoothstep(.35, .65, cherryMoonRay.y);
        float silver = pow(thinEdge, .9) * smoothstep(-.10, .76, facingMoon);
        float backlit = smoothstep(-.16, .78, -dot(normalize(vViewPosition), moonInView));
        float thinLeaf = smoothstep(.03, .70, thinEdge);
        float pink = mix(.17, .32, lowMoon) * (1.0 - thinLeaf) + thinLeaf;
        pink *= smoothstep(-.28, .54, facingMoon) * backlit;
        float visibility = 1.0;
        #if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF) && NUM_DIR_LIGHT_SHADOWS > 0
          if (receiveShadow) {
            DirectionalLightShadow moonShadow = directionalLightShadows[0];
            visibility = getShadow(directionalShadowMap[0], moonShadow.shadowMapSize, moonShadow.shadowIntensity,
              moonShadow.shadowBias, moonShadow.shadowRadius, vDirectionalShadowCoord[0]);
          }
        #endif
        vec3 silverRim = vec3(.72, .85, 1.0) * (mix(.28, .21, lowMoon) * silver);
        vec3 pinkThrough = diffuseColor.rgb * vec3(1.16, .70, .86) * (mix(.24, .54, lowMoon) * pink);
        totalEmissiveRadiance += cherryMoonlight * mix(.045, 1.0, visibility) * (silverRim + pinkThrough);
      }`);
}

function cherryLeafGeometry() {
  const points = [0, .61, -.024, -.23, .37, 0, -.30, .10, -.030, -.24, -.19, -.050,
    0, -.53, -.078, .23, -.19, -.030, .31, .10, -.026, .20, .37, 0, 0, .07, .108];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex([8, 0, 1, 8, 1, 2, 8, 2, 3, 8, 3, 4, 8, 4, 5, 8, 5, 6, 8, 6, 7, 8, 7, 0]);
  geometry.computeVertexNormals();
  return geometry;
}

function crownGrain(x: number, y: number, z: number) {
  return Math.sin(15 * x + 11 * z) * Math.sin(13 * y - 10 * z);
}

function crownSwell(x: number, y: number, z: number, grain = crownGrain(x, y, z)) {
  return 1 + .050 * grain + .105 * Math.sin(5 * x - 7 * y + 2) * Math.cos(6 * z + 4 * y);
}

type CrownPiece = {
  index: number;
  offset: THREE.Vector3;
  scale: THREE.Vector3;
  rest: THREE.Quaternion;
  tone: number;
  samples: number;
};

function cherrySurfaceLeaves(clusters: { pivot: THREE.Vector3; pieces: CrownPiece[] }[]) {
  const shells = clusters.flatMap(({ pivot, pieces }) => pieces.map((piece) => {
    const center = piece.offset.clone().add(pivot);
    const radius = 1.155 * Math.max(piece.scale.x, piece.scale.y, piece.scale.z);
    return {
      piece, center, radiusSquared: radius * radius,
      inverse: new THREE.Matrix4().compose(center, piece.rest, piece.scale).invert(),
    };
  }));
  const local = new THREE.Vector3(), point = new THREE.Vector3(), world = new THREE.Vector3();
  const normal = new THREE.Vector3(), tangent = new THREE.Vector3(), binormal = new THREE.Vector3();
  const along = new THREE.Vector3(), across = new THREE.Vector3(), face = new THREE.Vector3();
  const rotation = new THREE.Quaternion(), basis = new THREE.Matrix4(), scale = new THREE.Vector3();
  const shellPoint = new THREE.Vector3();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return clusters.map(({ pivot, pieces }) => {
    const leaves: { rest: THREE.Matrix4; tone: number; lightness: number }[] = [];
    for (const piece of pieces) {
      for (let j = 0; j < piece.samples; j++) {
        const seed = piece.index * 997 + j * 13;
        const height = 1 - 2 * (j + .27 + .46 * random(seed)) / piece.samples;
        const ring = Math.sqrt(1 - height * height);
        const azimuth = j * goldenAngle + tau * random(piece.index + 165) + .40 * (random(seed + 2) - .5);
        local.set(ring * Math.cos(azimuth), height, ring * Math.sin(azimuth));
        const swell = crownSwell(local.x, local.y, local.z);
        normal.copy(local).divide(piece.scale).applyQuaternion(piece.rest).normalize();
        point.copy(local).multiply(piece.scale).multiplyScalar(swell).applyQuaternion(piece.rest).add(piece.offset)
          .addScaledVector(normal, .008 + .010 * random(seed + 3));
        world.copy(point).add(pivot);
        // Skip leaves tucked inside another lobe before allocating their instance transforms.
        const hidden = shells.some(({ piece: shell, center, radiusSquared, inverse }) =>
          shell !== piece && center.distanceToSquared(world) < radiusSquared &&
          shellPoint.copy(world).applyMatrix4(inverse).lengthSq() < .89);
        if (hidden) continue;

        tangent.set(normal.z, 0, -normal.x).normalize();
        binormal.crossVectors(normal, tangent).normalize();
        const twist = azimuth * .68 + 1.9 * random(seed + 4);
        along.copy(tangent).multiplyScalar(Math.cos(twist)).addScaledVector(binormal, Math.sin(twist))
          .addScaledVector(normal, .08 + .28 * random(seed + 7)).normalize();
        across.crossVectors(along, normal).normalize();
        face.crossVectors(across, along);
        rotation.setFromRotationMatrix(basis.makeBasis(across, along, face));
        const length = (.108 + .105 * random(seed + 5)) * (.88 + .12 * Math.max(0, normal.y));
        scale.setScalar(length);
        scale.x *= .83 + .42 * random(seed + 8);
        const tone = THREE.MathUtils.clamp(piece.tone + .31 * (random(seed + 11) - .42) + height * .08, 0, 1);
        const lightness = .77 + .21 * random(seed + 12) + .065 * height;
        leaves.push({ rest: new THREE.Matrix4().compose(point, rotation, scale), tone, lightness });
      }
    }
    return leaves;
  });
}

function bendCherryWood(shader: Parameters<THREE.Material["onBeforeCompile"]>[0], bend: THREE.Vector2) {
  shader.uniforms.cherryBend = { value: bend };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nuniform vec2 cherryBend;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed.xz += cherryBend * smoothstep(${CHERRY_ANCHOR}, ${CHERRY_CROWN_HEIGHT}, position.y);`);
}

export function CherryTree({ elapsed, reduced, optics, floor, shake, targets }: {
  elapsed: RefObject<number>; reduced: boolean; optics: SundialLighting; floor: THREE.BufferGeometry;
  shake: CherryMotion; targets: RefObject<THREE.Group | null>;
}) {
  const canopy = useMemo(() => {
    const leafMass = new THREE.IcosahedronGeometry(1, 4);
    const pos = leafMass.getAttribute("position");
    const shading = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const grain = crownGrain(x, y, z);
      const swell = crownSwell(x, y, z, grain);
      pos.setXYZ(i, x * swell, y * swell, z * swell);
      const lift = THREE.MathUtils.smoothstep(y, -.75, .74);
      shading.set([.76 + .23 * lift + .035 * grain, .68 + .30 * lift + .035 * grain, .74 + .24 * lift + .035 * grain], 3 * i);
    }
    leafMass.setAttribute("color", new THREE.BufferAttribute(shading, 3));
    leafMass.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .87 });
    material.customProgramCacheKey = () => "sundial-crown-scatter";
    material.onBeforeCompile = (shader) => {
      scatterFoliage(shader, optics, .38);
      cherryCrownTexture(shader);
    };
    const mesh = new THREE.InstancedMesh(leafMass, material,
      cherryPads.reduce((count, pad) => count + pad.lobes + 1 + Math.floor(pad.lobes / 2), 0));
    mesh.name = "Sundial cherry crown";
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .91, side: THREE.DoubleSide });
    leafMaterial.customProgramCacheKey = () => "sundial-crown-leaf";
    leafMaterial.onBeforeCompile = (shader) => scatterFoliage(shader, optics, .29);
    const dummy = new THREE.Object3D();
    const [windX, windZ] = cherryWind;
    const windAxis = new THREE.Vector3(windZ, 0, -windX).normalize();
    const crosswindAxis = new THREE.Vector3(windX, 0, windZ).normalize();
    const bend = new THREE.Quaternion();
    const twist = new THREE.Quaternion();
    const fromPivot = new THREE.Vector3();
    let index = 0;
    const color = new THREE.Color();
    const clusters = cherryPads.map(({ tip: [x, y, z], size: [width, depth, spread], tint, lobes }, i) => {
      const pieces = Array.from({ length: lobes + 1 }, (_, j) => {
        const seed = 41 * i + 17 * j;
        const at = j * 2.39996 + .31 * random(seed);
        const ring = .40 + .44 * random(seed + 9);
        const size = .16 + .23 * random(seed + 8);
        const rim = j === 0 ? 0 : ring;
        const lift = j === 0 ? .10 : THREE.MathUtils.lerp(-.08, .63, random(seed + 11));
        const offset = new THREE.Vector3(width * Math.cos(at) * rim, depth * lift, spread * Math.sin(at) * rim);
        const scale = j === 0 ? new THREE.Vector3(width * .73, depth * .79, spread * .79) :
          new THREE.Vector3(width * size, depth * (.43 + .61 * random(seed + 5)), spread * (size + .05));
        const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(
          .16 * (random(seed + 12) - .5), (random(seed + 77) - .5) * .82, .34 * (random(seed + 15) - .5),
        ));
        const tone = THREE.MathUtils.clamp(tint + .18 * (random(seed + 14) - .5) + .20 * lift - (j === 0 ? .12 : 0), 0, 1);
        mesh.setColorAt(index, color.copy(canopyShade).lerp(canopyLight, tone));
        return { index: index++, offset, scale, rest, tone, samples: j === 0 ? 340 : 76 };
      });
      for (let j = 2; j <= lobes; j += 2) {
        const piece = pieces[j];
        const seed = 103 * i + 13 * j;
        const rimAngle = Math.atan2(piece.offset.z, piece.offset.x) + .65 * (random(seed + 20) - .5);
        const bud = piece.offset.clone().add(new THREE.Vector3(
          .73 * piece.scale.x * Math.cos(rimAngle),
          piece.scale.y * (.42 - .58 * random(seed + 31)),
          .73 * piece.scale.z * Math.sin(rimAngle),
        ));
        const tone = THREE.MathUtils.clamp(tint + .14 * (random(seed + 27) - .35), 0, 1);
        mesh.setColorAt(index, color.copy(canopyShade).lerp(canopyLight, tone));
        pieces.push({ index: index++, offset: bud, scale: piece.scale.clone().multiplyScalar(.38 + .14 * random(seed + 21)),
          rest: piece.rest, tone, samples: 17 });
      }
      return {
        pivot: new THREE.Vector3(x, cherryTreeHeight(y), z), pieces,
        windDelay: cherryWindDelay(x, z),
        swayRate: .88 + .39 * random(269 + i * 17),
        swayPhase: tau * random(401 + i * 23),
        flex: .69 + .17 * (y - 2) + .12 * Math.hypot(x, z),
      };
    });
    const leafLayers = cherrySurfaceLeaves(clusters);
    const leaves = new THREE.InstancedMesh(cherryLeafGeometry(), leafMaterial,
      leafLayers.reduce((count, layer) => count + layer.length, 0));
    let leafIndex = 0;
    for (const layer of leafLayers) {
      for (const leaf of layer) {
        leaves.setColorAt(leafIndex++, color.copy(canopyShade).lerp(canopyLight, leaf.tone).multiplyScalar(leaf.lightness));
      }
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    leaves.receiveShadow = true;
    const padMatrix = new THREE.Matrix4();
    const leafMatrix = new THREE.Matrix4();
    const anchor = new THREE.Vector3();
    const shakeAtTip = new THREE.Vector2();
    const shakeRotation = new THREE.Euler();
    const pose = (time: number, moving: boolean) => {
      let leafIndex = 0;
      clusters.forEach(({ pivot, pieces, windDelay, swayRate, swayPhase, flex }, i) => {
        bend.identity();
        anchor.copy(pivot);
        if (moving) {
          // Let a gust pass through the canopy while each branch springs back at its own pace.
          const phase = tau * (time - windDelay) / cherryWindCycle;
          const gust = .50 + .32 * Math.sin(2 * phase) + .16 * Math.sin(phase + 1.7);
          const branch = time * swayRate + swayPhase;
          const lean = flex * (.112 * gust - .035 + .039 * Math.sin(branch));
          const side = flex * (.013 + .013 * gust) * Math.sin(branch + 1.05);
          bend.setFromAxisAngle(windAxis, lean).multiply(twist.setFromAxisAngle(crosswindAxis, side));
          const height = cherryFlex(pivot.y);
          anchor.x += shake.bend.x * height;
          anchor.z += shake.bend.y * height;
          shake.sample(time - .026 - .045 * (i % 4) / 3, shakeAtTip);
          bend.multiply(twist.setFromEuler(shakeRotation.set(.67 * flex * shakeAtTip.y, 0, -.67 * flex * shakeAtTip.x)));
        }
        for (const piece of pieces) {
          dummy.position.copy(anchor).add(fromPivot.copy(piece.offset).applyQuaternion(bend));
          dummy.scale.copy(piece.scale);
          dummy.quaternion.copy(bend).multiply(piece.rest);
          dummy.updateMatrix();
          mesh.setMatrixAt(piece.index, dummy.matrix);
        }
        padMatrix.makeRotationFromQuaternion(bend).setPosition(anchor);
        for (const leaf of leafLayers[i]) {
          leaves.setMatrixAt(leafIndex++, leafMatrix.multiplyMatrices(padMatrix, leaf.rest));
        }
      });
      // The light's shadow pass reads these same transforms.
      mesh.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
    };
    pose(0, false);
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius += .70;
    leaves.computeBoundingSphere();
    if (leaves.boundingSphere) leaves.boundingSphere.radius += .70;
    return { mesh, leaves, pose };
  }, [optics, shake]);
  useFrame(() => {
    if (reduced) return;
    shake.sample(elapsed.current, shake.bend);
    canopy.pose(elapsed.current, true);
    targets.current?.children.forEach((target, index) => {
      const pad = cherryPads[index];
      if (!pad) return;
      const [x, restHeight, z] = pad.tip;
      const y = cherryTreeHeight(restHeight);
      const flex = cherryFlex(y);
      target.position.set(x + shake.bend.x * flex, y + .10, z + shake.bend.y * flex);
    });
  });
  useEffect(() => {
    if (!reduced) return;
    shake.reset();
    canopy.pose(0, false);
  }, [canopy, reduced, shake]);
  const branches = useMemo(() => ([
    [.246, [[.02, plantingSoilHeight(.02, .04) - .064, .04], [.20, .56, .09], [.38, 1.14, .06], [.48, 1.70, -.02], [.40, 2.33, -.19], [.32, 3.04, -.36], [.35, 3.62, -.43], crownPads.apex.tip]],
    [.125, [[.34, 1.05, .07], [-.13, 1.42, .20], [-.81, 1.64, .30], [-1.27, 1.83, .39], crownPads.lowLeft.tip]],
    [.132, [[.47, 1.59, -.02], [.94, 1.87, .10], [1.46, 1.99, .28], [2.02, 2.12, .33], crownPads.reach.tip]],
    [.086, [[.22, 1.28, .11], [-.12, 1.68, -.22], [-.61, 2.10, -.58], crownPads.leftBack.tip]],
    [.089, [[.42, 2.08, -.12], [.30, 2.24, -.64], [.17, 2.43, -1.25], crownPads.rear.tip]],
    [.087, [[1.02, 1.89, .13], [1.24, 2.19, -.12], [1.51, 2.53, -.54], crownPads.shoulder.tip]],
    [.096, [[.57, 1.66, .03], [.65, 1.80, .58], [.62, 1.95, 1.18], crownPads.foreground.tip]],
    [.052, [[-.78, 1.65, .29], [-.95, 1.98, .12], crownPads.leftMiddle.tip]],
    [.052, [[.35, 2.43, -.22], [.04, 2.88, -.30], crownPads.upperLeft.tip]],
    [.064, [[1.20, 1.95, .18], [1.32, 2.21, .55], crownPads.rightMiddle.tip]],
    [.065, [[-.60, 1.58, .26], [-.73, 2.05, .67], crownPads.innerLeft.tip]],
    [.056, [[.35, 2.56, -.28], [.15, 3.01, .17], crownPads.upperFront.tip]],
    [.051, [[.65, 1.83, .64], [.78, 2.54, .74], crownPads.innerRight.tip]],
    [.061, [[.29, 2.25, -.71], [.63, 2.89, -1.03], crownPads.upperBack.tip]],
    [.043, [[-1.14, 1.76, .37], [-1.34, 1.78, .70], [-1.65, 2.01, .72]]],
    [.044, [[1.84, 2.07, .32], [2.26, 2.16, -.03], [2.65, 2.37, .10]]],
    [.039, [[.32, 2.78, -.32], [.08, 3.24, -.47], [.01, 3.76, -.59]]],
  ] as const).map(([radius, coords], branch) => {
    const curve = new THREE.CatmullRomCurve3(coords.map((p) => new THREE.Vector3().fromArray(p)));
    const rings = 28;
    const sides = 12;
    const geometry = new THREE.TubeGeometry(curve, rings, radius, sides, false);
    const p = geometry.getAttribute("position");
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const u = Math.floor(i / (sides + 1)) / rings;
      const angle = (i % (sides + 1)) * tau / sides;
      const at = curve.getPointAt(u);
      const fiber = Math.sin(angle * 3 + u * 4.2) + .45 * Math.sin(angle * 5 - u * 9);
      const collar = branch === 0 ? (1 - THREE.MathUtils.smoothstep(at.y, .092, .45)) * (.095 + .14 * Math.cos(angle * 4 + .9) ** 2) : 0;
      const radiusFactor = (.18 + .82 * (1 - u) ** .82) * (1 + .082 * fiber + collar);
      const y = cherryTreeHeight(at.y + (p.getY(i) - at.y) * radiusFactor);
      p.setXYZ(i, at.x + (p.getX(i) - at.x) * radiusFactor, y, at.z + (p.getZ(i) - at.z) * radiusFactor);
      const mottled = .83 + .085 * fiber + .055 * Math.sin(u * 16 + angle * 2);
      colors.set([mottled, mottled * .965, mottled * .94], 3 * i);
    }
    geometry.computeVertexNormals();
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }), []);
  const bark = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ color: "#654f49", roughness: .93, vertexColors: true });
    material.onBeforeCompile = (shader) => { installTreeTransmission(shader, optics); bendCherryWood(shader, shake.bend); };
    return material;
  }, [optics, shake]);
  const branchDepth = useMemo(() => {
    const depth = new THREE.MeshDepthMaterial();
    depth.onBeforeCompile = (shader) => bendCherryWood(shader, shake.bend);
    return depth;
  }, [shake]);
  const planter = useMemo(() => {
    const garden = makeSundialPlanter(random);
    garden.aggregate.material.onBeforeCompile = (shader) => installTreeTransmission(shader, optics);
    garden.aggregate.material.customProgramCacheKey = () => `sundial-soil-aggregate-${optics.layers.value.length}-${optics.tracery.columns}`;
    return garden;
  }, [optics]);
  const planterStone = useMemo(() => stoneProjection(optics), [optics]);
  const brassFinish = useMemo(() => illuminatedBrass(optics), [optics]);
  const soilFinish = useMemo<THREE.MeshStandardMaterial["onBeforeCompile"]>(() => (shader) => {
    plantingSoil(shader);
    installTreeTransmission(shader, optics);
  }, [optics]);
  useEffect(() => () => bark.dispose(), [bark]);
  useEffect(() => () => branchDepth.dispose(), [branchDepth]);
  useEffect(() => () => planter.dispose(), [planter]);
  useEffect(() => () => {
    for (const mesh of [canopy.mesh, canopy.leaves]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    }
    branches.forEach((branch) => branch.dispose());
  }, [canopy, branches]);
  return (
    <group>
      <mesh name="Planter limestone rim" geometry={planter.rim} receiveShadow castShadow>
        <meshStandardMaterial color="#b0a699" roughness={.83} onBeforeCompile={planterStone}
          customProgramCacheKey={() => `sundial-planter-stone-${optics.layers.value.length}-${optics.tracery.columns}`} />
      </mesh>
      <mesh geometry={planter.inlay} receiveShadow>
        <meshStandardMaterial color="#b29563" metalness={.73} roughness={.49} onBeforeCompile={brassFinish}
          customProgramCacheKey={() => `sundial-lit-brass-${optics.layers.value.length}-${optics.tracery.columns}`} />
      </mesh>
      <mesh name="Planter soil" geometry={planter.soil} receiveShadow>
        <meshStandardMaterial color="#816d5c" roughness={.97} onBeforeCompile={soilFinish}
          customProgramCacheKey={() => `sundial-planter-soil-${optics.layers.value.length}-${optics.tracery.columns}`} />
      </mesh>
      {branches.map((geometry, i) => <mesh key={i} geometry={geometry} material={bark} customDepthMaterial={branchDepth} castShadow receiveShadow />)}
      {planter.roots.map((geometry, i) => <mesh key={i} geometry={geometry} material={bark} castShadow receiveShadow />)}
      <primitive object={planter.aggregate} />
      <primitive object={canopy.mesh} />
      <primitive object={canopy.leaves} />
      <group ref={targets} name="Sundial cherry pickers" visible={false}>
        {cherryPads.map(({ tip: [x, y, z], size: [width, depth, spread] }, i) => (
          <mesh key={i} position={[x, cherryTreeHeight(y) + .10, z]} scale={[width * .99, depth * 1.16, spread * .99]}>
            <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial />
          </mesh>
        ))}
        <mesh position={[.22, (cherryTreeHeight(1.64) + .04) / 2, 0]} scale={[.40, (cherryTreeHeight(1.64) - .04) / 2, .38]}>
          <sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial />
        </mesh>
      </group>
      {!reduced && <FallingPetals elapsed={elapsed} optics={optics} floor={floor} samplePlanter={planter.sample} shake={shake} />}
    </group>
  );
}

function FallingPetals({ elapsed, optics, floor, samplePlanter, shake }: {
  elapsed: RefObject<number>; optics: SundialLighting; floor: THREE.BufferGeometry;
  samplePlanter: ReturnType<typeof makeSundialPlanter>["sample"];
  shake: CherryMotion;
}) {
  const multisampling = useThree(({ gl }) => gl.capabilities.maxSamples > 0);
  const petals = useMemo(() => {
    const ambientCount = petalSources.length * petalBursts.reduce((sum, burst) => sum + burst.count, 0);
    const count = ambientCount + 128;
    const outline = new THREE.Shape();
    outline.moveTo(0, -.52);
    outline.bezierCurveTo(-.36, -.28, -.51, .30, -.22, .49);
    outline.quadraticCurveTo(-.09, .55, -.02, .39);
    outline.quadraticCurveTo(.10, .55, .27, .45);
    outline.bezierCurveTo(.50, .26, .29, -.27, 0, -.52);
    const geometry = new THREE.ShapeGeometry(outline, 4);
    const flight = new Float32Array(count * 4);
    const origins = new Float32Array(count * 3);
    const landing = new Float32Array(count * 4);
    const ground = new Float32Array(count * 4);
    const groundGust = new Float32Array(count * 4);
    const floorSurface = sundialFloorSurface(floor);
    const sampleGround = (x: number, z: number) => samplePlanter(x, z) ?? floorSurface.sample(x, z);
    const writePetal = (index: number, [{tip, size}, edge]: typeof petalSources[number], release: number,
      [windX, windZ]: readonly [number, number], strength: number, spread: number, petalSeed: number, shiftX = 0, shiftZ = 0) => {
    const sheltered = random(petalSeed + 11) < .24;
    const duration = 3.30 + 1.65 * random(petalSeed) + (sheltered ? -.38 : .15 * strength);
    const drift = random(petalSeed + 1);
    const turn = random(petalSeed + 6);
    const startX = tip[0] + shiftX + size[0] * (edge[0] + spread * (random(petalSeed + 2) - .5));
    const startY = cherryTreeHeight(tip[1]) + size[1] * (edge[1] - .20 + spread * (random(petalSeed + 3) - .5));
    const startZ = tip[2] + shiftZ + size[2] * (edge[2] + spread * (random(petalSeed + 4) - .5));
    const broad = random(petalSeed + 8) > .86;
    const along = sheltered ? .28 + 1.16 * drift : duration * strength * (.24 + .44 * drift + .057 * duration);
    const across = (turn - .5) * (broad ? 2.65 : 1.34);
    let landX = startX + windX * along - windZ * across;
    let landZ = startZ + windZ * along + windX * across;
    const joint = Math.hypot(landX, landZ) > TREE_SEAT_BASE_RADIUS + .48 && random(petalSeed + 12) < .63
      ? floorSurface.nearJoint(landX, landZ, .044 + .051 * random(petalSeed + 13)) : undefined;
    if (joint) {
      landX = joint.x;
      landZ = joint.z;
    }
    const surface = sampleGround(landX, landZ);
    const staysOnSurface = (fromX: number, fromZ: number, dx: number, dz: number) => {
      if (Math.hypot(surface.slopeX, surface.slopeZ) > .12) return false;
      const steps = Math.ceil(Math.hypot(dx, dz) / .025);
      for (let step = 1; step <= steps; step++) {
        const x = fromX + dx * step / steps, z = fromZ + dz * step / steps;
        const expected = surface.height + surface.slopeX * x + surface.slopeZ * z;
        if (Math.abs(sampleGround(landX + x, landZ + z).height - expected) > .004) return false;
      }
      return true;
    };
    const slide = (joint ? .048 : .145) * (.36 + .64 * random(petalSeed + 9));
    const alongSurface = staysOnSurface(0, 0, windX * slide, windZ * slide) ? slide : 0;
    const slipX = windX * alongSurface, slipZ = windZ * alongSurface;
    const nearSeat = Math.hypot(landX, landZ) < TREE_SEAT_BASE_RADIUS + .82;
    const linger = random(petalSeed + 14) < (joint ? .79 : nearSeat ? .66 : .15);
    const rest = linger ? 3.25 + 2.45 * random(petalSeed + 10) : .84 + .89 * random(petalSeed + 10);
    let pushX = 0, pushZ = 0, pushDelay = rest + 1;
    if (linger && random(petalSeed + 15) < .78) {
      for (const gust of petalGusts) {
        const at = gust.at + cherryWindDelay(landX, landZ, gust.wind) + .27;
        const delay = THREE.MathUtils.euclideanModulo(at - release - duration, cherryWindCycle);
        if (delay < .88 || delay > rest - .64 || delay >= pushDelay) continue;
        const distance = .115 + .16 * random(petalSeed + 16);
        const dx = distance * gust.wind[0], dz = distance * gust.wind[1];
        if (!staysOnSurface(slipX, slipZ, dx, dz)) continue;
        pushX = dx;
        pushZ = dz;
        pushDelay = delay;
      }
    }
    const scale = .089 + .109 * drift + (broad ? .062 : 0);
    flight.set([release, duration, drift, turn], index * 4);
    origins.set([startX, startY, startZ], index * 3);
    landing.set([landX, landZ, surface.height, rest], index * 4);
    ground.set([surface.slopeX, surface.slopeZ, slipX, slipZ], index * 4);
    groundGust.set([pushX, pushZ, pushDelay, scale], index * 4);
    };
    let index = 0;
    petalBursts.forEach((burst, pass) => {
      petalSources.forEach((source, emitter) => {
        const { tip } = source[0];
        const arrival = cherryWindDelay(tip[0], tip[2], burst.wind) * (burst.gust ? 1 : .50);
        const seed = 721 + 103 * pass + 13 * emitter;
        let release = burst.at + arrival + .19 * (random(seed) - .5);
        for (let j = 0; j < burst.count; j++, index++) {
          const petalSeed = 11 * index + 83;
          writePetal(index, source, release, burst.wind, burst.strength, burst.gust ? .22 : .33, petalSeed);
          release += .031 + .027 * random(petalSeed + 7);
        }
      });
    });
    const attributes = {
      flight: new THREE.InstancedBufferAttribute(flight, 4),
      petalOrigin: new THREE.InstancedBufferAttribute(origins, 3),
      petalLanding: new THREE.InstancedBufferAttribute(landing, 4),
      petalGround: new THREE.InstancedBufferAttribute(ground, 4),
      petalGroundGust: new THREE.InstancedBufferAttribute(groundGust, 4),
    };
    for (const [name, attribute] of Object.entries(attributes)) {
      geometry.setAttribute(name, attribute.setUsage(THREE.DynamicDrawUsage));
    }
    const direction = new THREE.Vector2();
    const futureBend = new THREE.Vector2();
    let lastImpulse = 0;
    const emit = (now: number) => {
      let changed = false;
      for (const impulse of shake.impulses) {
        if (impulse.id <= lastImpulse) continue;
        lastImpulse = impulse.id;
        direction.set(impulse.x + .34 * cherryWind[0], impulse.z + .34 * cherryWind[1]).normalize();
        const wind = [direction.x, direction.y] as const;
        const size = Math.round(7 + 47 * THREE.MathUtils.smoothstep(impulse.strength, .29, 1));
        const sources = [...petalSources].sort(([a], [b]) =>
          (b.tip[0] - a.tip[0]) * impulse.x + (b.tip[2] - a.tip[2]) * impulse.z);
        let spawned = 0;
        for (let i = ambientCount; i < count && spawned < size; i++) {
          // Keep an occupied slot until its landing fade is done.
          if (flight[i * 4 + 1] > 0 && now < flight[i * 4] + flight[i * 4 + 1] + landing[i * 4 + 3] + .72) continue;
          const seed = 131071 + impulse.id * 821 + spawned * 19;
          const source = sources[spawned % (impulse.strength > .55 ? sources.length : 3)];
          const release = impulse.time + CHERRY_REBOUND_START + .035 + .068 * random(seed + 4);
          const flex = cherryFlex(cherryTreeHeight(source[0].tip[1]));
          shake.sample(release, futureBend);
          writePetal(i, source, release, wind, .73 + .38 * impulse.strength, .36, seed, futureBend.x * flex, futureBend.y * flex);
          spawned++;
        }
        changed ||= spawned > 0;
      }
      if (changed) for (const attribute of Object.values(attributes)) attribute.needsUpdate = true;
    };
    const time = { value: 0 };
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: .74, side: THREE.DoubleSide, alphaToCoverage: multisampling,
    });
    material.onBeforeCompile = (shader) => {
      scatterFoliage(shader, optics, .73, false);
      shader.uniforms.petalTime = time;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float petalTime;
          attribute vec4 flight;
          attribute vec3 petalOrigin;
          attribute vec4 petalLanding;
          attribute vec4 petalGround;
          attribute vec4 petalGroundGust;
          varying float vPetalPresence;

          struct PetalPose {
            vec3 center;
            mat3 orientation;
            float curl;
            float presence;
          };

          PetalPose posePetal() {
            float seconds = petalTime - flight.x;
            if (gl_InstanceID < ${ambientCount}) seconds = mod(seconds, ${cherryWindCycle.toFixed(1)});
            if (flight.y <= 0.0 || seconds < 0.0) return PetalPose(vec3(0.0), mat3(1.0), 0.0, 0.0);
            float onGround = max(0.0, seconds - flight.y);
            float rest = petalLanding.w;
            if (onGround >= rest + .72) return PetalPose(vec3(0.0), mat3(1.0), 0.0, 0.0);

            float airTime = min(seconds, flight.y);
            float age = airTime / flight.y;
            float curl = 1.0 - smoothstep(.73, 1.0, age);
            vec2 track = petalLanding.xy - petalOrigin.xz;
            vec2 crosswind = vec2(-track.y, track.x) / max(length(track), .15);
            float flutter = sin(airTime * (1.6 + .72 * flight.z) + flight.w * PI2);
            // Clear the coping before the last part of the descent into or beside the planter.
            float nearPlanter = 1.0 - smoothstep(${TREE_SEAT_BASE_RADIUS}, ${TREE_SEAT_BASE_RADIUS + .75}, length(petalLanding.xy));
            float approach = min(1.0, age / mix(1.0, .76, nearPlanter));
            float sweep = sin(PI * approach);
            float turn = sin(PI2 * approach) * (.36 + .09 * length(track));
            float travel = mix(approach * (.69 + .31 * approach), 1.0, smoothstep(.78, 1.0, approach));
            float sliding = 1.0 - pow(1.0 - clamp(onGround / .46, 0.0, 1.0), 3.0);
            float pushTime = smoothstep(petalGroundGust.z, petalGroundGust.z + .62, onGround);
            float pushTurn = length(petalGroundGust.xy) * (flight.w - .5);
            vec2 slip = petalGround.zw * sliding + petalGroundGust.xy * pushTime;
            vec2 horizontal = mix(petalOrigin.xz, petalLanding.xy, travel) + slip;
            horizontal += crosswind * sweep * (turn + flutter * (.12 + .24 * flight.z));
            float floorY = petalLanding.z + .006 + dot(petalGround.xy, slip);
            float fall = 1.0 - pow(1.0 - pow(age, 1.45), 2.0);
            float height = mix(petalOrigin.y, floorY, fall) + .15 * flutter * age * (1.0 - age) * curl;

            float flipSpeed = 1.20 + flight.w * .85;
            float flipAtTouch = flight.y * flipSpeed + PI2 * flight.z;
            float restingFlip = PI * (floor(flipAtTouch / PI) + .5);
            float flip = mix(restingFlip, airTime * flipSpeed + PI2 * flight.z, curl);
            float spin = airTime * (.93 + 1.15 * flight.z) + flight.w * 18.0
              + .28 * (flight.w - .5) * sliding + 2.9 * pushTurn * pushTime;
            float c = cos(flip), s = sin(flip), u = cos(spin), v = sin(spin);
            mat3 tilt = mat3(1.,0.,0., 0.,c,s, 0.,-s,c);
            mat3 heading = mat3(u,0.,-v, 0.,1.,0., v,0.,u);
            vec2 slope = petalGround.xy * (1.0 - curl);
            vec3 up = normalize(vec3(-slope.x, 1.0, -slope.y));
            vec3 across = normalize(vec3(1.0, slope.x, 0.0));
            mat3 surface = mat3(across, up, cross(across, up));
            float presence = smoothstep(0.0, .16, airTime) * (1.0 - smoothstep(rest, rest + .72, onGround));
            return PetalPose(vec3(horizontal.x, height, horizontal.y), surface * heading * tilt, curl, presence);
          }
        `)
        .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
          PetalPose petalPose = posePetal();
          vPetalPresence = petalPose.presence;
          objectNormal = petalPose.orientation * vec3(-.68 * position.x * petalPose.curl, 0.0, 1.0);
        `)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          vec3 curl = position + vec3(0.0, 0.0, .34 * position.x * position.x * petalPose.curl);
          transformed = petalPose.center + petalPose.orientation * curl * petalGroundGust.w * step(.0001, vPetalPresence);
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vPetalPresence;")
        .replace("#include <color_fragment>", `#include <color_fragment>
          #ifdef ALPHA_TO_COVERAGE
            if (vPetalPresence < .002) discard;
            diffuseColor.a *= vPetalPresence;
          #else
            if (vPetalPresence < .999) {
              float pixelThreshold = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
              if (pixelThreshold >= vPetalPresence) discard;
            }
          #endif
        `);
    };
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = "Sundial drifting petals";
    const identity = new THREE.Matrix4();
    for (let i = 0; i < count; i++) { mesh.setMatrixAt(i, identity); mesh.setColorAt(i, blossomColors[i % blossomColors.length]); }
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    return { mesh, time, emit };
  }, [floor, multisampling, optics, samplePlanter, shake]);
  useEffect(() => () => { petals.mesh.geometry.dispose(); petals.mesh.material.dispose(); petals.mesh.dispose(); }, [petals]);
  useFrame(() => {
    setUniform(petals.time, elapsed.current);
    petals.emit(elapsed.current);
  });
  return <primitive object={petals.mesh} raycast={() => {}} />;
}
