import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { SundialLighting } from "./sundial-optics";

const dawn = ["#707da6", "#f1b8bc", "#efcedc", "#9985a3", "#f8ceb6"];
const day = ["#5b83ac", "#d7e3e8", "#eef4f7", "#788895", "#f3ead7"];
const dusk = ["#4a416c", "#edab88", "#d8bfd3", "#75618d", "#f1a279"];
const twilight = ["#203854", "#718299", "#7d8ca7", "#465974", "#b3aebc"];
const night = ["#101d32", "#374a67", "#677891", "#30435f", "#a7bad5"];
const paletteColors = [dawn, day, dusk, twilight, night].map((stops) => stops.map((hex) => new THREE.Color(hex)));
const clearZenith = new THREE.Color("#518dd1");
const clearHorizon = new THREE.Color("#8db9e5");
const clearCloud = new THREE.Color("#f5f9fc");
const horizonGlow = new THREE.Color();

function createSkyPalette() {
  return {
    zenith: { value: paletteColors[1][0].clone() },
    horizon: { value: paletteColors[1][1].clone() },
    cloud: { value: paletteColors[1][2].clone() },
    cloudShade: { value: paletteColors[1][3].clone() },
    cloudRim: { value: paletteColors[1][4].clone() },
    warmth: { value: 0 },
    clearSky: { value: 0 },
  };
}
type SkyPalette = ReturnType<typeof createSkyPalette>;

function setPalette(palette: SkyPalette, ray: THREE.Vector3, fog: THREE.FogExp2 | null) {
  const [morning, daylight, evening, blueHour, moonlit] = paletteColors;
  const height = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(ray.y, -1, 1)));
  const west = 1 - THREE.MathUtils.smoothstep(ray.x, -.18, .18);
  const twilight = THREE.MathUtils.smoothstep(height, -18, -6);
  const horizonColor = THREE.MathUtils.smoothstep(height, -7, 1);
  const daylightColor = THREE.MathUtils.smoothstep(height, THREE.MathUtils.lerp(5, 2, west), 24);
  [palette.zenith, palette.horizon, palette.cloud, palette.cloudShade, palette.cloudRim]
    .forEach(({ value }, i) => value.copy(moonlit[i]).lerp(blueHour[i], twilight)
      .lerp(horizonGlow.copy(morning[i]).lerp(evening[i], west), horizonColor)
      .lerp(daylight[i], daylightColor));
  const clear = THREE.MathUtils.smoothstep(height, 7, 25);
  palette.clearSky.value = clear;
  palette.zenith.value.lerp(clearZenith, clear);
  palette.horizon.value.lerp(clearHorizon, clear);
  palette.cloud.value.lerp(clearCloud, clear);
  palette.warmth.value = horizonColor * (1 - daylightColor) * THREE.MathUtils.lerp(.64, 1, west);
  if (fog) {
    fog.color.copy(palette.horizon.value);
    fog.density = THREE.MathUtils.lerp(.0055, .0038, clear);
  }
}

const vertex = /* glsl */ `
  varying vec3 skyDirection;
  void main() {
    skyDirection = position;
    mat4 viewRotation = viewMatrix;
    viewRotation[3].xyz = vec3(0.0);
    gl_Position = projectionMatrix * viewRotation * vec4(position, 1.0);
    gl_Position.z = gl_Position.w * .99998;
  }
`;

const skyColors = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 cloudShade;
  uniform vec3 sunRay;
  uniform float warmth;
  uniform float clearSky;

  vec3 skyColor(vec3 ray) {
    vec3 light = normalize(vec3(sunRay.x, .08, sunRay.z));
    float sunward = pow(max(dot(ray, light), 0.0), 3.3);
    float altitude = smoothstep(-.08, .64, ray.y);
    vec3 sky = mix(horizon, zenith, altitude);
    vec3 twilightGlow = mix(vec3(1.0, .48, .26), vec3(1.0, .53, .47), smoothstep(-.18, .18, sunRay.x));
    sky = mix(sky, twilightGlow, warmth * sunward * (1.0 - smoothstep(.0, .55, abs(ray.y))) * .27);

    return mix(sky, cloudShade, mix(.78, .34, clearSky) * smoothstep(.04, .63, -ray.y));
  }
`;

const fragment = /* glsl */ `
  varying vec3 skyDirection;
  uniform vec3 moonRay;
  uniform float moonVisibility;
  ${skyColors}

  void main() {
    vec3 ray = normalize(skyDirection);
    vec3 color = skyColor(ray);
    if (moonVisibility > 0.0) {
      float distanceToMoon = length(ray - moonRay);
      float disc = 1.0 - smoothstep(.006, .008, distanceToMoon);
      float glow = 1.0 - smoothstep(.008, .041, distanceToMoon);
      vec3 tangent = (ray - dot(ray, moonRay) * moonRay) / .008;
      vec3 surface = tangent - moonRay * sqrt(max(0.0, 1.0 - dot(tangent, tangent)));
      float lit = smoothstep(-.02, .11, dot(surface, sunRay));
      float phase = .5 - .5 * dot(sunRay, moonRay);
      color += moonVisibility * (1.26 * disc * lit + .095 * glow * glow * phase) * vec3(.78, .89, 1.0);
    }
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudVertex = (bankCount: number) => /* glsl */ `
  uniform vec3 cloudWindOffsets[${bankCount}];
  uniform float islandRadius;
  attribute float cloudSeed;
  attribute float cloudBank;
  varying vec3 vCloud;
  varying vec3 vCloudNormal;
  varying float vHeight;
  varying float vCloudSeed;

  void main() {
    vec3 p = (instanceMatrix * vec4(position, 1.0)).xyz;
    p += cloudWindOffsets[int(cloudBank)];
    mat3 stretch = mat3(instanceMatrix);
    vec3 scaleSquared = vec3(dot(stretch[0], stretch[0]), dot(stretch[1], stretch[1]), dot(stretch[2], stretch[2]));
    vCloudNormal = normalize(stretch * (normal / scaleSquared));
    vCloud = p * islandRadius;
    vHeight = position.y;
    vCloudSeed = cloudSeed;
    gl_Position = projectionMatrix * viewMatrix * vec4(vCloud, 1.0);
  }
`;

const cloudFragment = /* glsl */ `
  varying vec3 vCloud;
  varying vec3 vCloudNormal;
  varying float vHeight;
  varying float vCloudSeed;
  uniform float islandRadius;
  uniform vec3 cloud;
  uniform vec3 cloudRim;
  uniform vec3 cloudKeyRay;
  uniform float moonWeight;
  ${skyColors}

  void main() {
    vec3 softNormal = normalize(vCloudNormal);
    vec3 facetNormal = normalize(cross(dFdx(vCloud), dFdy(vCloud)));
    vec3 eyeToCloud = vCloud - cameraPosition;
    vec3 ray = normalize(eyeToCloud);
    float distanceToEye = length(eyeToCloud) / islandRadius;
    float bankDistance = length(vCloud.xz) / islandRadius;
    float farBank = smoothstep(3.1, 8.5, bankDistance);

    // Light the cloud volume with continuous normals, then bring back some of the planar facets at close range.
    float facingSun = mix(dot(softNormal, sunRay), dot(softNormal, cloudKeyRay), moonWeight);
    float crown = smoothstep(-.61, .82, vHeight);
    float wrapLight = smoothstep(-.63, .83, facingSun);
    float facetCarry = (1.0 - smoothstep(2.55, 6.2, distanceToEye)) * (1.0 - farBank);
    float facet = clamp(dot(facetNormal - softNormal, sunRay), -.49, .49) * .28 * facetCarry;
    float lit = clamp(.18 + .36 * crown + .41 * wrapLight + facet, 0.0, 1.0);
    vec3 cool = mix(cloudShade * .79, cloud, .13 + .25 * crown);
    vec3 color = mix(cool, cloud * 1.22, lit) * (.95 + .10 * vCloudSeed);

    // The warm edge is most visible through thin parts of the cloud facing the low sun.
    float grazing = 1.0 - clamp(dot(softNormal, -ray), 0.0, 1.0);
    float lowSun = 1.0 - smoothstep(.23, .64, sunRay.y);
    float sunward = smoothstep(-.40, .82, dot(ray, sunRay));
    float rim = pow(grazing, 2.25) * smoothstep(-.49, .68, facingSun) * (.31 + .69 * sunward);
    float warmEdge = mix(lowSun * (rim * .48 + wrapLight * crown * .16) * (.62 + .38 * warmth),
      .28 * rim, moonWeight);
    color = mix(color, cloudRim * 1.19, warmEdge);

    float fogDistance = max(distanceToEye - 1.85, 0.0);
    float groundMist = .11 * (1.0 - smoothstep(-.61, .18, vHeight)) * smoothstep(1.8, 4.8, bankDistance);
    float edgeMist = pow(grazing, 1.8) * (.05 + .32 * farBank) + groundMist;
    float haze = 1.0 - exp(-.049 * fogDistance * fogDistance) * (1.0 - .57 * farBank) * (1.0 - edgeMist);
    gl_FragColor = vec4(mix(color, skyColor(ray), haze), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Grow each vertex of a sphere onto the union of overlapping ellipsoids.
// Each cloud has one closed silhouette, with no intersecting shells.
function makeCloudShape(variant: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 6);
  const lean = variant === 0 ? -.12 : variant === 1 ? .24 : -.28;
  const lobes = [
    [0, -.20, 0, 1.05, .43, .61],
    [-.86, -.08, .05, .58, .48, .52],
    [.85, -.04, -.10, .65, .53, .58],
    [lean, .41 + variant * .05, -.13, .58, .64, .53],
    [.54, .40 - variant * .06, .19, .47, .48, .46],
    [-.58, .24 + variant * .07, .32 - variant * .09, .51, .52, .47],
    [-.15, .08, .60, .41, .40, .43],
    [.27, -.11, .61, .35, .29, .42],
    [.29, .08, -.55, .46, .46, .46],
    [-.48, .10, -.52, .38, .39, .48],
    [1.21, -.19 + variant * .07, .20, .38, .30, .33],
    [-1.23 + variant * .06, -.21, -.14, .34, .30, .39],
    [-.68, -.38, .37, .41, .27, .40],
  ].map(([cx, cy, cz, sx, sy, sz]) => ({ cx, cy, cz, sx, sy, sz, unit: Math.min(sx, sy, sz) }));
  const points = geometry.getAttribute("position");
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
    let inside = 0;
    let outside = 1.95;
    for (let step = 0; step < 12; step++) {
      const radius = (inside + outside) * .5;
      let boundary = Infinity;
      for (const { cx, cy, cz, sx, sy, sz, unit } of lobes) {
        const ellipsoid = (Math.hypot((radius * x - cx) / sx, (radius * y - cy) / sy, (radius * z - cz) / sz) - 1) * unit;
        const blend = Math.max(.105 - Math.abs(boundary - ellipsoid), 0) / .105;
        boundary = Math.min(boundary, ellipsoid) - .02625 * blend * blend;
      }
      if (boundary < 0) inside = radius;
      else outside = radius;
    }
    points.setXYZ(i, x * inside, y * inside, z * inside);
  }
  // Weld the deformed surface for continuous normals. The fragment shader still reads each actual face.
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  const cloud = mergeVertices(geometry);
  cloud.computeVertexNormals();
  geometry.dispose();
  return cloud;
}

// Stagger short banks, leaving open sky between their ends.
const cloudBanks = [
  { bearing: 9, span: 36, radius: 2.80, height: -1.23, scale: .76, count: 4 },
  { bearing: 77, span: 27, radius: 3.06, height: -1.68, scale: .66, count: 3 },
  { bearing: 157, span: 54, radius: 2.95, height: -1.39, scale: .78, count: 5 },
  { bearing: 226, span: 25, radius: 2.64, height: -1.17, scale: .65, count: 3 },
  { bearing: 306, span: 44, radius: 3.03, height: -1.42, scale: .84, count: 4 },
  { bearing: 43, span: 47, radius: 4.90, height: -1.76, scale: 1.01, count: 5 },
  { bearing: 120, span: 46, radius: 5.27, height: -2.13, scale: 1.03, count: 4 },
  { bearing: 204, span: 56, radius: 4.93, height: -1.88, scale: 1.18, count: 5 },
  { bearing: 277, span: 32, radius: 5.30, height: -1.62, scale: .91, count: 3 },
  { bearing: 338, span: 36, radius: 4.60, height: -1.72, scale: .91, count: 4 },
  { bearing: 64, span: 97, radius: 8.00, height: -2.44, scale: 1.55, count: 6 },
  { bearing: 179, span: 72, radius: 8.57, height: -2.62, scale: 1.45, count: 5 },
  { bearing: 294, span: 96, radius: 8.68, height: -2.39, scale: 1.57, count: 6 },
];

const lowerClouds = [
  { x: -.87, y: -.83, z: .98, yaw: -.21, sx: .54, sy: .36, sz: .42, seed: .42 },
  { x: -1.58, y: -1.28, z: .68, yaw: -.55, sx: .48, sy: .30, sz: .33, seed: .14 },
  { x: -.54, y: -1.36, z: 1.65, yaw: .42, sx: .28, sy: .20, sz: .25, seed: .61 },
  { x: .34, y: -1.28, z: 1.58, yaw: .13, sx: .56, sy: .39, sz: .48, seed: .83 },
  { x: 1.31, y: -.97, z: .64, yaw: .60, sx: .39, sy: .30, sz: .38, seed: .26 },
  { x: 1.60, y: -1.52, z: -.45, yaw: -1.06, sx: .55, sy: .37, sz: .43, seed: .24 },
  { x: .68, y: -.70, z: -1.05, yaw: .14, sx: .36, sy: .27, sz: .27, seed: .72 },
  { x: -.46, y: -1.21, z: -1.48, yaw: -.66, sx: .50, sy: .34, sz: .36, seed: .36 },
  { x: -1.46, y: -.78, z: -.77, yaw: -.31, sx: .31, sy: .24, sz: .28, seed: .53 },
];

const nearIslandBank = cloudBanks.length;
const cloudWind = [...cloudBanks, { radius: 1.3 }].map(({ radius }, bank) => ({
  reach: THREE.MathUtils.lerp(.65, .15, THREE.MathUtils.smoothstep(radius, 1.3, 8.6)),
  phase: .095 * Math.sin(bank * 1.39),
}));
const prevailingWind = new THREE.Vector2(.86, -.49).normalize();

// Rear and across use the overview axes in island radii. These clouds sit outside the rail.
const highClouds = [
  { rear: 2.70, across: -2.30, y: -.13, yaw: -.42, sx: .58, sy: .29, sz: .32, seed: .84, bank: 8 },
  { rear: 2.78, across: -1.67, y: -.23, yaw: -.63, sx: .35, sy: .17, sz: .23, seed: .66, bank: 8 },
  { rear: 2.91, across: -2.75, y: -.10, yaw: -.27, sx: .31, sy: .20, sz: .26, seed: .58, bank: 8 },
  { rear: 2.84, across: 1.86, y: -.05, yaw: -.60, sx: .48, sy: .24, sz: .30, seed: .76, bank: 9 },
  { rear: 2.94, across: 2.61, y: .080, yaw: -.47, sx: .36, sy: .20, sz: .26, seed: .85, bank: 9 },
];

function CloudSea({ uniforms, clock }: { uniforms: Record<string, THREE.IUniform>; clock: THREE.IUniform<number> }) {
  const field = useMemo(() => {
    const placements = cloudBanks.flatMap(({ count, bearing, span, radius, height, scale }, bank) =>
      Array.from({ length: count }, (_, index) => {
        const variation = (salt: number) => Math.sin((bank + 1.22) * 39.8 + (index + 1) * (salt + 1.03) * 14.2);
        const acrossBank = index / (count - 1) - .5;
        const angle = THREE.MathUtils.degToRad(bearing + span * acrossBank + variation(2) * 3.5);
        const distance = radius + acrossBank * .27 + variation(5) * .47;
        return {
          x: Math.cos(angle) * distance, z: Math.sin(angle) * distance,
          y: height + variation(6) * .32, yaw: -angle + Math.PI / 2 + variation(3) * .85,
          sx: scale * (.87 + variation(7) * .25), sy: scale * (.76 + variation(4) * .18),
          sz: scale * (.82 + variation(9) * .19), seed: variation(1) * .5 + .5, bank,
        };
      }));
    placements.push(...lowerClouds.map((cloud) => ({ ...cloud, bank: nearIslandBank })));
    const overviewSin = .5;
    const overviewCos = Math.sqrt(.75);
    placements.push(...highClouds.map(({ rear, across, ...cloud }) => ({
      ...cloud, x: rear * overviewSin + across * overviewCos, z: across * overviewSin - rear * overviewCos,
    })));
    const windOffsets = cloudWind.map(() => new THREE.Vector3());
    const material = new THREE.ShaderMaterial({
      vertexShader: cloudVertex(windOffsets.length), fragmentShader: cloudFragment,
      uniforms: { ...uniforms, cloudWindOffsets: { value: windOffsets } },
    });
    const transform = new THREE.Object3D();
    const meshes = Array.from({ length: 3 }, (_, variant) => {
      const group = placements.filter((_, i) => i % 3 === variant);
      const geometry = makeCloudShape(variant);
      geometry.setAttribute("cloudSeed", new THREE.InstancedBufferAttribute(Float32Array.from(group, ({ seed }) => seed), 1));
      geometry.setAttribute("cloudBank", new THREE.InstancedBufferAttribute(Float32Array.from(group, ({ bank }) => bank), 1));
      const mesh = new THREE.InstancedMesh(geometry, material, group.length);
      group.forEach(({ x, y, z, yaw, sx, sy, sz }, i) => {
        transform.position.set(x, y, z);
        transform.rotation.y = yaw;
        transform.scale.set(sx, sy, sz);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      });
      mesh.frustumCulled = false;
      return mesh;
    });
    return { material, meshes, windOffsets };
  }, [uniforms]);
  useFrame(() => {
    const now = clock.value;
    const { x, y: z } = prevailingWind;
    // Every cloud in a bank shares one translation. A slow turn in wind direction keeps the drift bounded.
    cloudWind.forEach(({ reach, phase }, bank) => {
      const turn = now * .026 + phase;
      const along = reach * (Math.sin(turn) - Math.sin(phase));
      const across = reach * .34 * (Math.cos(phase) - Math.cos(turn));
      const rise = .008 * (Math.sin(now * .047 + phase * 12) - Math.sin(phase * 12));
      field.windOffsets[bank].set(x * along - z * across, rise, z * along + x * across);
    });
  }, -.25);
  useEffect(() => () => {
    for (const mesh of field.meshes) { mesh.geometry.dispose(); mesh.dispose(); }
    field.material.dispose();
  }, [field]);
  return field.meshes.map((mesh) => <primitive key={mesh.uuid} object={mesh} raycast={() => {}} />);
}

export function SundialSky({ islandRadius, optics }: {
  islandRadius: number;
  optics: SundialLighting;
}) {
  const scene = useThree((state) => state.scene);
  const skyMaterial = useRef<THREE.ShaderMaterial>(null);
  const palette = useMemo(() => createSkyPalette(), []);
  const uniforms = useMemo(() => ({
    ...palette, sunRay: optics.ray, cloudKeyRay: optics.keyRay, moonWeight: optics.moonlight,
    moonRay: optics.moonRay, moonVisibility: optics.moonVisibility, islandRadius: { value: islandRadius },
  }), [palette, optics, islandRadius]);
  useFrame(() => {
    setPalette(palette, optics.ray.value, scene.fog instanceof THREE.FogExp2 ? scene.fog : null);
    if (skyMaterial.current) {
      const { clearSky, warmth, moonVisibility } = skyMaterial.current.uniforms;
      clearSky.value = palette.clearSky.value;
      warmth.value = palette.warmth.value;
      moonVisibility.value = optics.moonVisibility.value;
    }
  }, -.5);

  return (
    <>
      <mesh renderOrder={-100} frustumCulled={false} raycast={() => {}}>
        <sphereGeometry args={[1, 24, 16]} />
        <shaderMaterial ref={skyMaterial} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms}
          side={THREE.BackSide} depthWrite={false} depthTest={false} />
      </mesh>
      <CloudSea uniforms={uniforms} clock={optics.time} />
    </>
  );
}
