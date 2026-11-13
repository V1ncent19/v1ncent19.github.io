import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CloisterStone } from "./cloister-stone";
import { falls, seeded, streamAt, streamEnd, streamStart } from "./gallery-layout";
import type { GlassLighting } from "./glass-optics";

const sampleCount = 226;
const waterBands = 8;

function streamGeometry(columns: number, point: (z: number, column: number) => [number, number, number]) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= sampleCount; row++) {
    const z = THREE.MathUtils.lerp(streamStart, streamEnd, row / sampleCount);
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      positions.push(...point(z, u));
      uv.push(u, z);
      if (row && column) {
        const end = row * (columns + 1) + column;
        const previous = end - columns - 1;
        indices.push(previous - 1, end - 1, end, previous - 1, end, previous);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const streamVertex = /* glsl */ `
  varying vec2 vStreamUv;
  varying vec3 vWorld;
  varying vec3 vSlope;
  void main() {
    vStreamUv = uv;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vSlope = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const streamFragment = /* glsl */ `
  uniform float glassTime[1];
  uniform vec3 glassRay;
  varying vec2 vStreamUv;
  varying vec3 vWorld;
  varying vec3 vSlope;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.73, 97.43))) * 31214.36);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
  }

  void main() {
    float falling = smoothstep(.22, .71, 1.0 - vSlope.y);
    float travel = glassTime[0] * mix(.62, 2.24, falling);
    vec2 p = vec2(vWorld.x, vWorld.z - travel);
    float grain = noise(p * vec2(13.0, 4.9));
    float waveA = sin(p.y * 15.0 + p.x * 6.0 + grain * 2.2);
    float waveB = sin(p.x * 24.0 - p.y * 7.0 + grain * 1.8);
    vec3 n = normalize(vSlope + vec3(waveB * .075, 0.0, waveA * .103));
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(0.0, dot(view, n)), 3.3);
    float sun = pow(max(0.0, dot(reflect(-normalize(glassRay), n), view)), 74.0);
    float edge = 1.0 - smoothstep(0.0, .20, min(vStreamUv.x, 1.0 - vStreamUv.x));
    float current = noise(p * vec2(7.0, 3.7) + vec2(0.0, waveB * .13));
    vec3 river = mix(vec3(.012, .049, .050), vec3(.058, .159, .145), .18 + .44 * current + .28 * edge);
    vec3 sky = vec3(.30, .45, .49);
    vec3 water = mix(river, sky, .07 + .63 * fresnel) + sun * vec3(.41, .43, .41);

    float foamDistance = min(abs(vWorld.z - ${falls[0]} - .14), abs(vWorld.z - ${falls[1]} - .18));
    float poolFoam = (1.0 - smoothstep(.015, .57, foamDistance)) * smoothstep(.34, .76, noise(p * vec2(27.0, 14.0)));
    float streaks = noise(vec2(vWorld.x * 48.0, p.y * 5.0));
    float fallingFoam = falling * (.15 + .74 * smoothstep(.24, .92, streaks));
    float eddies = edge * smoothstep(.78, .99, noise(p * vec2(25.0, 9.0))) * .24;
    vec3 foam = vec3(.61, .74, .71);
    gl_FragColor = vec4(mix(water, foam, clamp(max(poolFoam, fallingFoam) + eddies, 0.0, .93)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function useCourtyardGround() {
  return useMemo(() => {
    const land = new THREE.Shape();
    land.moveTo(-90, -90);
    land.lineTo(90, -90);
    land.lineTo(90, 90);
    land.lineTo(-90, 90);
    land.closePath();
    const opening = new THREE.Path();
    for (const side of [-1, 1]) {
      for (let row = 0; row <= sampleCount; row++) {
        const z = THREE.MathUtils.lerp(streamStart, streamEnd, side < 0 ? row / sampleCount : 1 - row / sampleCount);
        const at = streamAt(z);
        const x = at.x + side * (at.width / 2 + .18);
        if (side < 0 && row === 0) opening.moveTo(x, -z);
        else opening.lineTo(x, -z);
      }
    }
    opening.closePath();
    land.holes.push(opening);
    const geometry = new THREE.ShapeGeometry(land);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
}

export default function CloisterStream({ lighting, stone }: {
  lighting: GlassLighting;
  stone: CloisterStone;
}) {
  const rocks = useRef<THREE.InstancedMesh>(null);
  const pebble = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const wobble = 1 + Math.sin(x * 12.1 + y * 3.8 + z * 9.4) * .14;
      pos.setXYZ(i, x * wobble, Math.max(-.64, y * wobble), z * wobble);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  const { surface, banks } = useMemo(() => ({
    surface: streamGeometry(waterBands, (z, u) => {
      const at = streamAt(z);
      return [at.x + (u - .5) * at.width, at.y + Math.sin(u * 24 + z * 6.1) * .009, z];
    }),
    banks: streamGeometry(8, (z, u) => {
      const at = streamAt(z);
      const side = u < .5 ? -1 : 1;
      const band = Math.abs(u - .5) * 2;
      const y = band > .89 ? -.159 : band > .68 ? Math.max(-.11, at.y + .028) : at.y - .20;
      return [at.x + side * band * (at.width / 2 + .38), y, z];
    }),
  }), []);
  const uniforms = useMemo(() => ({ glassTime: lighting.glassTime, glassRay: lighting.glassRay }), [lighting]);
  useEffect(() => () => { surface.dispose(); banks.dispose(); pebble.dispose(); }, [surface, banks, pebble]);
  useEffect(() => {
    const mesh = rocks.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < mesh.count; i++) {
      const side = i % 2 ? -1 : 1;
      const z = -6.7 + Math.floor(i / 2) * .51 + (seeded(i + 36) - .5) * .47;
      const { x, y, width } = streamAt(z);
      dummy.position.set(x + side * (width / 2 + .03 + seeded(i + 52) * .21), Math.max(-.17, y - .01), z);
      dummy.rotation.set((seeded(i + 9) - .5) * .31, seeded(i + 79) * 2, (seeded(i + 44) - .5) * .48);
      dummy.scale.set(.16 + seeded(i + 251) * .23, .10 + seeded(i + 18) * .16, .16 + seeded(i + 74) * .29);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const shade = .42 + seeded(i + 113) * .32;
      mesh.setColorAt(i, color.setRGB(shade * .93, shade * .97, shade * .83));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  return (
    <>
      <mesh geometry={banks} receiveShadow>
        <meshStandardMaterial {...stone} color="#716e51" bumpScale={.031} roughness={1} />
      </mesh>
      <instancedMesh ref={rocks} args={[pebble, undefined, 114]} castShadow receiveShadow>
        <meshStandardMaterial {...stone} bumpScale={.032} roughness={1} />
      </instancedMesh>
      <mesh geometry={surface}>
        <shaderMaterial uniforms={uniforms} vertexShader={streamVertex} fragmentShader={streamFragment} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
