import * as THREE from "three";
import { panel } from "@/assets-src/playground/louvre-panel.mjs";
import { sunRay, windowPlanes } from "./gallery-layout";

const windowCount = windowPlanes.length;
const atlasCoordinates = /* glsl */ `
  const vec2 atlasScale = vec2(1.0 / ${windowCount.toFixed(1)}, 1.0);
  vec2 windowUV(vec2 uv, float index) {
    return (uv + vec2(index, 0.0)) * atlasScale;
  }

  vec3 toWindowAxes(vec3 world, vec2 basis) {
    return vec3(dot(world.xz, vec2(basis.x, -basis.y)), world.y, dot(world.xz, basis.yx));
  }
`;

export function makeGlassLighting(source: THREE.Texture, surface: THREE.Texture, lightMap: THREE.Texture) {
  const artwork = source.clone();
  artwork.colorSpace = THREE.SRGBColorSpace;
  const panes = surface.clone();
  const transmission = lightMap.clone();
  transmission.colorSpace = THREE.SRGBColorSpace;
  transmission.anisotropy = 8;
  // Fiber copies uniform wrappers. Keep the time in a mutable value shared by the materials.
  const glassTime = { value: new Float32Array(1) };
  const glassRay = { value: new THREE.Vector3(sunRay.x, sunRay.y, sunRay.z) };
  const paneClock = { value: new THREE.Vector4(0, 0, 0, 0) };
  return {
    uniforms: {
      artwork: { value: artwork },
      panes: { value: panes },
      transmission: { value: transmission },
      glassTime,
      glassRay,
      paneClock,
      glassPlanes: { value: windowPlanes.map(({ x, z, cos, sin }) => new THREE.Vector4(x, z, cos, sin)) },
      glassLevels: { value: windowPlanes.map(({ y }) => y) },
    },
    advance(delta: number) {
      const time = glassTime.value[0] + Math.min(delta, .05);
      glassTime.value[0] = time;
      paneClock.value.set(
        Math.cos(time * 1.06), Math.sin(time * 1.06),
        Math.cos(time * .63), Math.sin(time * .63),
      );
    },
  };
}

export type GlassLighting = ReturnType<typeof makeGlassLighting>["uniforms"];

// The optics texture stores a constant tilt and finish per pane. Using those
// values as phase coefficients also lets mip filtering blend neighboring panes.
const paneShimmer = /* glsl */ `
  uniform vec4 paneClock;
  float paneTransmission(vec3 facet) {
    vec2 tilt = (facet.rg * 255.0 - 128.0) / vec2(73.0, 62.0);
    float finish = (facet.b * 255.0 - 168.5) / 41.5;
    float wave = .69 * dot(tilt, paneClock.xy) + .28 * dot(vec2(finish, tilt.x), paneClock.zw);
    float bright = smoothstep(.22, .89, wave);
    float shade = smoothstep(.12, .87, -wave);
    return 1.0 + .66 * bright - .24 * shade;
  }
`;

export const glassVertex = /* glsl */ `
  varying vec2 vGlassUv;
  varying vec3 vGlassPosition;
  void main() {
    vGlassUv = uv;
    vGlassPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const glassFragment = /* glsl */ `
  uniform sampler2D artwork;
  uniform sampler2D panes;
  uniform float glassTime[1];
  uniform float windowIndex;
  uniform vec2 windowBasis;
  varying vec2 vGlassUv;
  varying vec3 vGlassPosition;
  ${paneShimmer}
  ${atlasCoordinates}

  const vec3 luma = vec3(.2126, .7152, .0722);

  float softbox(vec2 at, vec2 center, vec2 size) {
    vec2 d = (at - center) / size;
    return exp(-dot(d, d));
  }

  void main() {
    float time = glassTime[0];
    vec2 atlasUV = windowUV(vGlassUv, windowIndex);
    vec4 art = texture2D(artwork, atlasUV);
    if (art.a < .6) discard;
    vec4 facet = texture2D(panes, atlasUV);
    vec2 tilt = (facet.rg - .502) * .42;
    // Fine waviness breaks up the reflections inside each piece of glass.
    vec2 q = vGlassUv * vec2(98.0, 181.0);
    tilt += .007 * vec2(sin(q.x + 1.4 * cos(q.y)), cos(q.y + 1.7 * sin(q.x)));
    // The luminance relief in the artwork gives each glass surface fine ripples.
    vec2 relief = vec2(
      dot(texture2D(artwork, atlasUV + vec2(.003, 0.0) * atlasScale).rgb -
          texture2D(artwork, atlasUV - vec2(.003, 0.0) * atlasScale).rgb, luma),
      dot(texture2D(artwork, atlasUV + vec2(0.0, .0015)).rgb -
          texture2D(artwork, atlasUV - vec2(0.0, .0015)).rgb, luma)
    );
    tilt += clamp(relief * .16, vec2(-.021), vec2(.021)) * smoothstep(.38, .85, facet.a);
    float panePhase = dot(facet.rg, vec2(19.0, 31.0));
    vec2 movingRipple = vec2(
      sin(q.x * .21 + q.y * .15 + panePhase + time * .82),
      cos(q.y * .24 - q.x * .16 + panePhase - time * .69)
    );
    tilt += .012 * movingRipple;
    vec3 n = normalize(vec3(tilt, 1.0));
    vec3 eye = normalize(toWindowAxes(cameraPosition - vGlassPosition, windowBasis));
    vec3 reflection = reflect(-eye, n);
    vec2 angled = vec2(reflection.x + .28 * reflection.y, reflection.y);
    float spread = mix(.027, .058, facet.b);
    float warm = softbox(angled, vec2(-.64, -.22), vec2(spread, .25));
    float cool = softbox(angled, vec2(-.34, -.14), vec2(spread, .22));
    float haze = softbox(reflection.xy, vec2(-.54, -.25), vec2(.25, .28));
    float luminance = dot(art.rgb, luma);
    float lead = smoothstep(.018, .13, luminance);
    float reflectance = (1.0 - .37 * facet.b) * facet.a * lead;
    float ripple = pow(max(0.0, sin(panePhase + time * .93 + vGlassUv.y * 9.0)), 4.0);
    float glint = ripple * (.55 + .45 * movingRipple.x) * (.25 + .75 * haze);
    vec3 sheen = reflectance * (warm * vec3(.25, .19, .13) +
      cool * vec3(.13, .18, .28) + glint * vec3(.16, .105, .07) +
      haze * vec3(.014, .017, .023));
    // The bevel follows the seam already detected in the registered artwork.
    // Only add a small metallic highlight to the existing dark lead.
    vec2 seamTexel = vec2(.0015, .00075) * atlasScale;
    vec2 seamSlope = vec2(
      texture2D(panes, atlasUV + vec2(seamTexel.x, 0.0)).a - texture2D(panes, atlasUV - vec2(seamTexel.x, 0.0)).a,
      texture2D(panes, atlasUV + vec2(0.0, seamTexel.y)).a - texture2D(panes, atlasUV - vec2(0.0, seamTexel.y)).a
    );
    float seam = smoothstep(.18, .64, 1.0 - facet.a) * (1.0 - smoothstep(.035, .14, luminance));
    float bevel = max(0.0, dot(seamSlope, normalize(vec2(.45, 1.0))));
    sheen += vec3(.061, .052, .049) * seam * bevel * (.55 + .45 * abs(eye.x));
    float transmitted = mix(1.0, paneTransmission(facet.rgb), lead);
    gl_FragColor = vec4(art.rgb * (.96 * transmitted) + sheen, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Filter the sun before Three applies shadows and the stone's lighting response.
// The other lights still illuminate the stone wherever the glass transmits less.
export function tintStoneWithWindows(
  gain: number,
  lighting: GlassLighting,
): THREE.MeshStandardMaterial["onBeforeCompile"] {
  return (shader) => {
    shader.uniforms.glassLightGain = { value: gain };
    shader.uniforms.glassTransmission = lighting.transmission;
    shader.uniforms.glassPanes = lighting.panes;
    shader.uniforms.glassTime = lighting.glassTime;
    shader.uniforms.glassRay = lighting.glassRay;
    shader.uniforms.paneClock = lighting.paneClock;
    shader.uniforms.glassPlanes = lighting.glassPlanes;
    shader.uniforms.glassLevels = lighting.glassLevels;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGlassFloor;")
      .replace("#include <project_vertex>", `
        #include <project_vertex>
        vec4 glassFloorPoint = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          glassFloorPoint = instanceMatrix * glassFloorPoint;
        #endif
        vGlassFloor = (modelMatrix * glassFloorPoint).xyz;
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `
        #include <common>
        varying vec3 vGlassFloor;
        uniform float glassLightGain;
        uniform sampler2D glassTransmission;
        uniform sampler2D glassPanes;
        uniform float glassTime[1];
        uniform vec3 glassRay;
        uniform vec4 glassPlanes[${windowCount}];
        uniform float glassLevels[${windowCount}];
        ${paneShimmer}
        ${atlasCoordinates}

        vec3 sampleGlassLight(vec2 uv, vec2 dx, vec2 dy) {
          vec4 glass = textureGrad(glassTransmission, uv, dx, dy);
          vec3 facet = textureGrad(glassPanes, uv, dx, dy).rgb;
          return glass.rgb * (glass.a * paneTransmission(facet));
        }

        float rearOpening(vec2 hit) {
          // Invert the height of the same quadratic arch used in the wall mesh.
          float y = (hit.y - ${panel.baseY}) / ${panel.heightScale};
          float rise = max(0.0, y - ${panel.revealSpring});
          float slope = 2.0 * (${panel.revealControlY} - ${panel.revealSpring});
          float curvature = 2.0 * ${panel.revealControlY} - ${panel.revealSpring} - ${panel.revealTop};
          float t = (slope - sqrt(max(0.0, slope * slope - 4.0 * curvature * rise))) / (2.0 * curvature);
          float halfWidth = ${panel.revealHalfWidth} * max(0.0, 1.0 - t * t);
          float openingDistance = min(halfWidth - abs(hit.x),
            min(y - ${panel.revealBottom}, ${panel.revealTop} - y));
          return smoothstep(-.015, .025, openingDistance);
        }

        float glassRim(vec2 hit) {
          float panelY = (hit.y - ${panel.baseY}) / ${panel.heightScale} + ${panel.baseY};
          float rise = max(0.0, (panelY - ${panel.spring}) / (${panel.glassTop} - ${panel.spring}));
          float archT = (1.8 - sqrt(max(0.0, 1.8 * 1.8 - 4.0 * .35 * 1.45 * rise))) / .7;
          float halfWidth = ${panel.halfWidth} * max(0.0, 1.0 - archT * archT);
          return min(halfWidth - abs(hit.x),
            min(panelY - ${panel.glassBottom}, ${panel.glassTop} - panelY));
        }

        vec3 filterSunThroughGlass(vec3 receiver) {
          float travel = 1000.0;
          float rimDistance = -1.0;
          float index = -1.0;
          vec2 glassHit = vec2(0.0);
          vec2 basis = vec2(1.0, 0.0);
          vec3 ray = glassRay;
          // Intersect each tilted plane, then sample only the nearest aperture.
          for (int slot = 0; slot < ${windowCount}; slot++) {
            vec4 plane = glassPlanes[slot];
            vec3 localPoint = toWindowAxes(receiver - vec3(plane.x, glassLevels[slot], plane.y), plane.zw);
            vec3 localRay = toWindowAxes(glassRay, plane.zw);
            if (abs(localRay.z) < .025) continue;
            float distanceToPane = (${panel.z} - localPoint.z) / localRay.z;
            vec2 hit = localPoint.xy + distanceToPane * localRay.xy;
            float rim = glassRim(hit);
            if (distanceToPane > .01 && distanceToPane < travel && rim > -.12) {
              travel = distanceToPane;
              rimDistance = rim;
              index = float(slot);
              glassHit = hit;
              basis = plane.zw;
              ray = localRay;
            }
          }
          const vec2 glassSize = vec2(${panel.width}, ${panel.height * panel.heightScale});
          // Take screen derivatives of the receiver, so texture filtering stays
          // local to a window even where neighbouring pixels see different slots.
          vec3 pointDx = toWindowAxes(dFdx(receiver), basis);
          vec3 pointDy = toWindowAxes(dFdy(receiver), basis);
          vec2 dx = (pointDx.xy - pointDx.z * ray.xy / ray.z) / glassSize * atlasScale;
          vec2 dy = (pointDy.xy - pointDy.z * ray.xy / ray.z) / glassSize * atlasScale;
          if (index < 0.0) return vec3(1.0);
          float coverage = smoothstep(-.12, -.03, rimDistance);
          float panelY = (glassHit.y - ${panel.baseY}) / ${panel.heightScale} + ${panel.baseY};
          vec2 glassUV = vec2(.5 + glassHit.x / ${panel.width}, (panelY - ${panel.bottom}) / ${panel.height});
          vec2 ripple = vec2(
            sin(glassUV.y * 37.0 + glassUV.x * 9.0 + glassTime[0] * .76),
            cos(glassUV.x * 33.0 - glassUV.y * 16.0 - glassTime[0] * .63)
          );
          glassUV += ripple * .0019;

          float revealTravel = ${panel.z - panel.revealBackZ} / -ray.z;
          vec2 rearHit = glassHit + ray.xy * revealTravel;
          // The receiver may be inside the opening when sunlight enters from the front.
          bool crossesRearOpening = travel + revealTravel > 0.0;
          float rearScale = max(0.0, 1.0 + revealTravel / travel);
          float spread = min(.009 + .0075 * travel, .060);
          vec3 transmitted = vec3(0.0);
          // A fixed 3×3 kernel integrates a small cone around the sun ray.
          // The centre retains pane detail while the neighbours fill thin seams.
          // Blocked rays keep their weight and contribute zero transmission.
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 offset = vec2(float(x), float(y)) * spread;
              vec2 sampleUV = windowUV(glassUV + offset / glassSize, index);
              float aperture = crossesRearOpening ? rearOpening(rearHit + offset * rearScale) : 1.0;
              float weight = (x == 0 ? .68 : .16) * (y == 0 ? .68 : .16);
              transmitted += sampleGlassLight(sampleUV, dx, dy) * (aperture * weight);
            }
          }
          float peak = max(transmitted.r, max(transmitted.g, transmitted.b));
          vec3 colour = pow(transmitted / max(.04, peak), vec3(1.3));
          float rippleLight = .96 + .08 * ripple.x * ripple.y;
          // Fade the beam around the shadow from the reveal and at its far end.
          float jambDistance = crossesRearOpening ? ${panel.revealHalfWidth} - abs(rearHit.x) : rimDistance;
          float penumbra = smoothstep(.045, .19 + .037 * travel, min(rimDistance, jambDistance));
          float tail = 1.0 - .99 * smoothstep(5.0, 10.4, travel);
          float throughput = pow(peak, .78) * penumbra * tail;
          return mix(vec3(1.0), colour * (glassLightGain * rippleLight * throughput), coverage);
        }
      `)
      .replace("#include <lights_fragment_begin>", THREE.ShaderChunk.lights_fragment_begin.replace(
        "getDirectionalLightInfo( directionalLight, directLight );",
        `
          getDirectionalLightInfo( directionalLight, directLight );
          #if UNROLLED_LOOP_INDEX == 0
            directLight.color *= filterSunThroughGlass(vGlassFloor);
          #endif
        `,
      ));
  };
}
