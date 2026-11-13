"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { panel, panelHalfWidth } from "@/assets-src/playground/louvre-panel.mjs";
import { windows } from "@/assets-src/playground/window-gallery.mjs";
import CloisterMasonry from "./CloisterMasonry";
import CloisterStream from "./CloisterStream";
import { useCloisterStone, type CloisterStone } from "./cloister-stone";
import GardenCourtyard from "./GardenCourtyard";
import GardenPanCamera, { initialCameraPosition } from "./GardenPanCamera";
import { seeded, windowPlanes } from "./gallery-layout";
import { glassFragment, glassVertex, makeGlassLighting, tintStoneWithWindows, type GlassLighting } from "./glass-optics";

const GLASS_URL = "/assets/playground/gallery-window.webp";
const GLASS_OPTICS_URL = "/assets/playground/gallery-window-optics.png";
const GLASS_LIGHT_URL = "/assets/playground/gallery-window-light.webp";
type GalleryWindow = (typeof windows)[number];

function useFrameGeometry() {
  return useMemo(() => {
    const outer = new THREE.Shape();
    outer.moveTo(-1.55, 0);
    outer.lineTo(1.55, 0);
    outer.lineTo(1.55, 3.87);
    outer.quadraticCurveTo(1.55, 4.96, 0, 5.55);
    outer.quadraticCurveTo(-1.55, 4.96, -1.55, 3.87);
    outer.closePath();
    const inner = new THREE.Path();
    inner.moveTo(-1.22, 0.4);
    inner.lineTo(-1.22, 3.67);
    inner.quadraticCurveTo(-1.22, 4.57, 0, 5.12);
    inner.quadraticCurveTo(1.22, 4.57, 1.22, 3.67);
    inner.lineTo(1.22, 0.4);
    inner.closePath();
    outer.holes.push(inner);
    return new THREE.ExtrudeGeometry(outer, {
      depth: 0.43,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: 2,
      curveSegments: 22,
    });
  }, []);
}

function RuinWall({ index, stone, block }: { index: number; stone: CloisterStone; block: THREE.BufferGeometry }) {
  const masonry = useRef<THREE.InstancedMesh>(null);
  const wall = useMemo(() => {
    const shape = new THREE.Shape();
    const mirror = index % 2 ? 1 : -1;
    const top = 5.91 + seeded(index + 24) * .39;
    shape.moveTo(mirror * -2.22, 0);
    shape.lineTo(mirror * 2.19, 0);
    shape.lineTo(mirror * 2.19, 4.26 + seeded(index + 70) * .55);
    shape.lineTo(mirror * 1.93, 4.26 + seeded(index + 70) * .55);
    shape.lineTo(mirror * 1.93, 5.26);
    shape.lineTo(mirror * 1.44, 5.26);
    shape.lineTo(mirror * 1.41, 5.64);
    shape.lineTo(mirror * .74, 5.64);
    shape.lineTo(mirror * .70, top);
    shape.lineTo(mirror * -.49, top - .04);
    shape.lineTo(mirror * -.53, top - .24);
    shape.lineTo(mirror * -1.21, top - .29);
    shape.lineTo(mirror * -1.22, 5.31);
    shape.lineTo(mirror * -1.78, 5.31);
    shape.lineTo(mirror * -1.79, 4.8);
    shape.lineTo(mirror * -2.22, 4.8);
    shape.closePath();
    const opening = new THREE.Path();
    const jamb = panel.revealHalfWidth;
    opening.moveTo(-jamb, panel.revealBottom);
    opening.lineTo(-jamb, panel.revealSpring);
    opening.quadraticCurveTo(-jamb, panel.revealControlY, 0, panel.revealTop);
    opening.quadraticCurveTo(jamb, panel.revealControlY, jamb, panel.revealSpring);
    opening.lineTo(jamb, panel.revealBottom);
    opening.closePath();
    shape.holes.push(opening);
    return new THREE.ExtrudeGeometry(shape, { depth: .47, bevelEnabled: true, bevelSize: .028, bevelThickness: .025, bevelSegments: 1, curveSegments: 24 });
  }, [index]);
  useEffect(() => () => wall.dispose(), [wall]);
  const stones = useMemo(() => {
    const result: { x: number; y: number; width: number; tone: number }[] = [];
    for (let row = 0; row < 16; row++) {
      const y = .22 + row * .337;
      for (const side of [-1, 1]) {
        const seed = index * 83 + row * 2 + (side + 1) / 2;
        const x = side * (1.88 + seeded(seed + 42) * .15);
        if (y > 4.3 && (side === (index % 2 ? 1 : -1) || y > 4.77)) continue;
        result.push({ x, y, width: .34 + seeded(seed + 72) * .13, tone: .65 + seeded(seed + 21) * .27 });
      }
    }
    for (let col = -2; col <= 2; col++) {
      result.push({ x: col * .49, y: 5.52 - Math.abs(col) * .13, width: .44, tone: .73 + seeded(col + index * 7) * .18 });
    }
    return result;
  }, [index]);
  useEffect(() => {
    const mesh = masonry.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    stones.forEach(({ x, y, width, tone }, index) => {
      dummy.position.set(x, y, -.207);
      dummy.scale.set(width, .293, .075);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color.setRGB(tone, tone * .94, tone * .79));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [stones]);
  return (
    <>
      <mesh position={[0, -.105, -.25]} castShadow receiveShadow>
        <boxGeometry args={[4.43, .22, .86]} />
        <meshStandardMaterial {...stone} bumpScale={.015} color="#bfb397" roughness={1} />
      </mesh>
      <mesh geometry={wall} position={[0, 0, panel.revealBackZ]} castShadow receiveShadow>
        <meshStandardMaterial {...stone} bumpScale={.041} color="#c8bda2" roughness={1} />
      </mesh>
      <instancedMesh ref={masonry} args={[block, undefined, stones.length]} castShadow receiveShadow>
        <meshStandardMaterial {...stone} bumpScale={.017} roughness={1} />
      </instancedMesh>
    </>
  );
}

function useGlassGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    const bottom = panel.glassBottom;
    const top = panel.glassTop;
    shape.moveTo(-panel.halfWidth, bottom - panel.baseY);
    for (let i = 0; i <= 48; i++) {
      const y = THREE.MathUtils.lerp(bottom, top, i / 48);
      shape.lineTo(panelHalfWidth(y), y - panel.baseY);
    }
    for (let i = 47; i >= 0; i--) {
      const y = THREE.MathUtils.lerp(bottom, top, i / 48);
      shape.lineTo(-panelHalfWidth(y), y - panel.baseY);
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    const positions = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < positions.count; i++) {
      uv.setXY(i, .5 + positions.getX(i) / panel.width,
        (positions.getY(i) + panel.baseY - panel.bottom) / panel.height);
    }
    return geometry;
  }, []);
}

function Window({ index, entry, lighting, stone, frame, glass, suppressClick }: {
  index: number;
  entry: GalleryWindow;
  lighting: GlassLighting;
  stone: CloisterStone;
  frame: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  suppressClick: RefObject<boolean>;
}) {
  const router = useRouter();
  const canvas = useThree(({ gl }) => gl.domElement);
  const plane = windowPlanes[index];
  const windowUniforms = useMemo(() => ({
    ...lighting,
    windowIndex: { value: index },
    windowBasis: { value: new THREE.Vector2(plane.cos, plane.sin) },
  }), [lighting, index, plane]);
  const lightOnSill = useMemo(() => tintStoneWithWindows(2.25, lighting), [lighting]);

  return (
    <group
      position={[plane.x, plane.y + panel.baseY, plane.z]}
      rotation={[0, plane.yaw, 0]}
      scale={[1, panel.heightScale, 1]}
      onClick={(event) => {
        event.stopPropagation();
        if (suppressClick.current) return;
        canvas.removeAttribute("data-window-hover");
        router.push(entry.href);
      }}
      onPointerOver={(event) => { event.stopPropagation(); canvas.setAttribute("data-window-hover", ""); }}
      onPointerOut={() => { canvas.removeAttribute("data-window-hover"); }}
    >
      <mesh geometry={glass} position={[0, 0, panel.z]}>
        <shaderMaterial
          uniforms={windowUniforms}
          vertexShader={glassVertex}
          fragmentShader={glassFragment}
        />
      </mesh>
      <mesh geometry={frame} position={[0, 0, -0.23]} castShadow receiveShadow>
        <meshStandardMaterial {...stone} bumpScale={.035} color="#e4d9bd" roughness={.96} />
      </mesh>
      {[1.44, -1.44].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 2.2, -0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.45, 4.25, 0.92]} />
            <meshStandardMaterial {...stone} bumpScale={.035} color="#d8d1bd" roughness={1} />
          </mesh>
          <mesh position={[0, 0.39, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[0.63, 0.27, 1.03]} />
            <meshStandardMaterial {...stone} color="#eee1c3" roughness={.97} />
          </mesh>
          <mesh position={[0, 3.82, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[0.57, 0.16, 1.02]} />
            <meshStandardMaterial {...stone} color="#eee1c3" roughness={.97} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.7, 0.36, 1.25]} />
        <meshStandardMaterial {...stone} color="#dfd4bb" roughness={1} />
      </mesh>
      <mesh position={[0, 0.4, 0.27]} castShadow receiveShadow>
        <boxGeometry args={[3.31, 0.13, 0.84]} />
        <meshStandardMaterial {...stone} color="#f1dfbb" roughness={.96} onBeforeCompile={lightOnSill} />
      </mesh>
    </group>
  );
}

function LitWindowScene() {
  const [artwork, surface, lightMap] = useLoader(THREE.TextureLoader, [GLASS_URL, GLASS_OPTICS_URL, GLASS_LIGHT_URL]);
  const { uniforms: lighting, advance } = useMemo(() => makeGlassLighting(artwork, surface, lightMap), [artwork, surface, lightMap]);
  const stone = useCloisterStone();
  const frame = useFrameGeometry();
  const glass = useGlassGeometry();
  const block = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, .045), []);
  const sunPosition = useMemo(() => lighting.glassRay.value.clone().multiplyScalar(25), [lighting]);
  const reducedMotion = useRef(false);
  const suppressClick = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { reducedMotion.current = preference.matches; };
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  useEffect(() => () => {
    lighting.artwork.value.dispose();
    lighting.panes.value.dispose();
    lighting.transmission.value.dispose();
    frame.dispose();
    glass.dispose();
    block.dispose();
  }, [lighting, frame, glass, block]);
  useFrame((_, delta) => {
    if (!reducedMotion.current) advance(delta);
  });
  return (
    <>
      <directionalLight
        position={sunPosition}
        intensity={3.15}
        color="#fff0dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-21}
        shadow-camera-right={21}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-far={67}
        shadow-bias={-.00018}
        shadow-radius={3}
      />
      <GardenCourtyard lighting={lighting} stone={stone} />
      <CloisterMasonry lighting={lighting} stone={stone} block={block} />
      <CloisterStream lighting={lighting} stone={stone} />
      {windows.map((entry, index) => {
        const { x, y, z, yaw } = windowPlanes[index];
        return (
          <group key={entry.id}>
            <group position={[x, y + panel.baseY, z]} rotation={[0, yaw, 0]} scale={[1, panel.heightScale, 1]}>
              <RuinWall index={index} stone={stone} block={block} />
            </group>
            <Window entry={entry} index={index} lighting={lighting} stone={stone} frame={frame} glass={glass} suppressClick={suppressClick} />
          </group>
        );
      })}
      <GardenPanCamera suppressClick={suppressClick} />
    </>
  );
}

function GlassGlow() {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const pipeline = new EffectComposer(gl);
    pipeline.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    pipeline.setSize(size.width, size.height);
    pipeline.addPass(new RenderPass(scene, camera));
    pipeline.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), .32, .3, .87));
    pipeline.addPass(new OutputPass());
    composer.current = pipeline;
    return () => {
      composer.current = null;
      pipeline.dispose();
    };
  }, [gl, scene, camera, size.width, size.height]);
  useFrame((_, delta) => composer.current?.render(delta), 1);
  return null;
}

export default function StainedGlassScene() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.75]}
      camera={{ position: initialCameraPosition, fov: 43, near: .1, far: 130 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#c6cebf"]} />
      <fog attach="fog" args={["#c6cebf", 31, 80]} />
      <ambientLight intensity={.53} color="#e1eae0" />
      <hemisphereLight intensity={.92} color="#fff3d4" groundColor="#4b5942" />
      <LitWindowScene />
      <GlassGlow />
    </Canvas>
  );
}
