import * as THREE from "three";
import { windows } from "@/assets-src/playground/window-gallery.mjs";
import { panel } from "@/assets-src/playground/louvre-panel.mjs";
import { gothicSilhouette } from "./france-window-frame";
import { WINDOW_SCALE, type Slot, type TravelWindow } from "./sundial-layout";
import type { SundialInlay } from "./sundial-inlay";
import { createSundialHover } from "./sundial-hover";
import { createPanePaths, sundialPanePaths } from "./sundial-pane-paths";
import { carvedStone, floorMarble } from "./sundial-materials";
import { createTraceryAtlas, tracerySampling } from "./tracery-glass";

export const PANE_Z = 0;
export const PLANE_HEIGHT = panel.height * panel.heightScale * WINDOW_SCALE;
const paneWidth = panel.width * WINDOW_SCALE;
const windowTints: Record<string, string> = {
  france: "#e19eb7", ptes: "#afcfca", guatemala: "#b8a8df", anitabi: "#9ac9e2",
};

export const atlas = /* glsl */ `
  const vec2 atlasScale = vec2(1.0 / ${Number(windows.length).toFixed(1)}, 1.0);
  vec2 atlasUV(vec2 uv, float n) {
    return (clamp(uv, vec2(.0025), vec2(.9975)) + vec2(n, 0.0)) * atlasScale;
  }
`;

export const paneProjectionGeometry = /* glsl */ `
  const vec2 paneSize = vec2(${paneWidth.toFixed(7)}, ${PLANE_HEIGHT.toFixed(7)});
  const vec2 paneOrigin = vec2(.5, -${(panel.bottom / panel.height).toFixed(7)});
  const float glassBottom = ${(panel.glassBottom * WINDOW_SCALE * panel.heightScale).toFixed(5)};
  const float glassTop = ${(panel.glassTop * WINDOW_SCALE * panel.heightScale).toFixed(5)};
  const float frameTop = ${(gothicSilhouette.crown * WINDOW_SCALE).toFixed(5)};

  vec3 paneAxes(vec3 p, vec2 basis) {
    return vec3(dot(p.xz, vec2(basis.x, -basis.y)), p.y, dot(p.xz, basis.yx));
  }

  float lancetHalfWidth(float height, float spring, float crown, float width) {
    float rise = max(0.0, (height - spring) / (crown - spring));
    float arch = (1.8 - sqrt(max(0.0, 3.24 - 2.03 * rise))) / .7;
    return width * max(0.0, 1.0 - arch * arch);
  }

  float paneHalfWidthAt(float height) {
    return lancetHalfWidth(height, ${(panel.spring * WINDOW_SCALE * panel.heightScale).toFixed(5)}, glassTop, ${(panel.halfWidth * WINDOW_SCALE).toFixed(5)});
  }

  float paneOpeningEdge(vec2 point, float halfWidth) {
    return min(halfWidth - abs(point.x), min(point.y - glassBottom, glassTop - point.y));
  }
`;

export const paneHoverLight = /* glsl */ `
  float paneHoverGain(vec3 color, float activation, float sunHeight) {
    float clearPane = smoothstep(.035, .55, dot(color, glassLuma));
    float daylight = smoothstep(.54, .81, sunHeight);
    return 1.0 + activation * mix(.20, mix(.56, .72, daylight), clearPane);
  }
`;

const lampColor = /* glsl */ `
  vec3 warmLampGlass(vec3 color) { return color * vec3(1.17, 1.0, .78); }
`;

export function windowTransmissionSampling(tracery: boolean) {
  return /* glsl */ `
    vec4 windowTransmission(vec2 hit, int index) {
      float layer = sundialLayers[index];
      float opening = smoothstep(-.018, .042, paneOpeningEdge(hit, paneHalfWidthAt(hit.y)));
      if (opening > .0) {
        vec2 atGlass = atlasUV(hit / paneSize + paneOrigin, layer);
        vec4 glass = textureLod(sundialTrans, atGlass, 2.65);
        return vec4(panePathColor(glass.rgb, mainPaneId(atGlass), layer, false), opening * pow(glass.a, .72));
      }
      ${tracery ? /* glsl */ `
      if (traceryLayers[index] >= 0.0 && hit.y >= glassTop - .15) {
        vec4 glass = tracerySample(traceryUV(hit), traceryLayers[index]);
        int id = int(glass.a * 255.0 + .5);
        if (id > 1) return vec4(panePathColor(glass.rgb, id, layer, true), 1.0);
      }` : ""}
      return vec4(0.0);
    }
  `;
}

export function installTreeTransmission(
  shader: Parameters<THREE.MeshStandardMaterial["onBeforeCompile"]>[0],
  optics: SundialLighting,
  filterDirectLight = true,
) {
  const count = optics.layers.value.length;
  Object.assign(shader.uniforms, {
    treeLightPlanes: optics.planes, treeLightLayers: optics.layers,
    treeGlass: optics.transmission, paneIds: optics.paneIds, panePathState: optics.panePaths.texture,
    treeLightRay: optics.ray, treeSunlight: optics.daylight, traceryMap: optics.tracery.texture, treeTraceryLayers: optics.tracery.layers,
  });
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vTreeLightWorld;")
    .replace("#include <project_vertex>", `#include <project_vertex>
      vec4 treePoint = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        treePoint = instanceMatrix * treePoint;
      #endif
      vTreeLightWorld = (modelMatrix * treePoint).xyz;
    `);
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
    varying vec3 vTreeLightWorld;
    uniform vec4 treeLightPlanes[${count}];
    uniform float treeLightLayers[${count}];
    uniform vec3 treeLightRay;
    uniform float treeSunlight;
    uniform sampler2D treeGlass;
    ${atlas}
    ${sundialPanePaths}
    ${paneProjectionGeometry}
    ${optics.tracery.enabled ? `uniform float treeTraceryLayers[${count}];\n${tracerySampling(optics.tracery.columns)}` : ""}

    vec4 treeWindowLight() {
      if (treeSunlight <= 0.0) return vec4(0.0);
      float nearest = 23.0;
      vec2 hit = vec2(0.0);
      float incidence = 0.0;
      int windowIndex = -1;
      for (int i = 0; i < ${count}; i++) {
        vec4 pane = treeLightPlanes[i];
        vec3 ray = paneAxes(treeLightRay, pane.zw);
        if (abs(ray.z) < .035) continue;
        vec3 local = paneAxes(vTreeLightWorld - vec3(pane.x, 0.0, pane.y), pane.zw);
        float distanceToPane = -local.z / ray.z;
        if (distanceToPane <= .025 || distanceToPane >= nearest) continue;
        vec2 point = local.xy + ray.xy * distanceToPane;
        if (abs(point.x) > ${(gothicSilhouette.halfWidth * WINDOW_SCALE + .07).toFixed(4)} || point.y < glassBottom - .08 || point.y > frameTop) continue;
        nearest = distanceToPane;
        hit = point;
        incidence = smoothstep(.035, .17, abs(ray.z));
        windowIndex = i;
      }
      if (windowIndex < 0) return vec4(0.0);
      float layer = treeLightLayers[windowIndex];
      float edge = paneOpeningEdge(hit, paneHalfWidthAt(hit.y));
      if (edge > -.078) {
        vec2 uv = hit / paneSize + paneOrigin;
        vec2 at = atlasUV(uv, layer);
        vec4 color = textureLod(treeGlass, at, 2.75);
        float coverage = smoothstep(-.078, .10, edge) * sqrt(color.a) * incidence;
        return vec4(panePathColor(color.rgb, mainPaneId(at), layer, false), coverage * treeSunlight);
      }
      ${optics.tracery.enabled ? /* glsl */ `
      float traceryLayer = treeTraceryLayers[windowIndex];
      if (traceryLayer >= 0.0) {
        vec2 uv = traceryUV(hit);
        vec4 color = tracerySample(uv, traceryLayer);
        float id = floor(color.a * 255.0 + .5);
        if (id > 1.5) {
          return vec4(panePathColor(color.rgb, int(id), layer, true), incidence * treeSunlight);
        }
      }
      ` : ""}
      return vec4(0.0);
    }
  `).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
    vec4 treeBeam = treeWindowLight();`);
  if (filterDirectLight) {
    shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", `
      float treePeak = max(treeBeam.r, max(treeBeam.g, treeBeam.b));
      vec3 treeHue = treeBeam.rgb / max(.045, treePeak);
      vec3 treeSunFilter = mix(vec3(1.0), .085 + treeHue * (.54 + .77 * treePeak / (.16 + treePeak)), treeBeam.a);
      ${THREE.ShaderChunk.lights_fragment_begin.replace(
      "getDirectionalLightInfo( directionalLight, directLight );",
      "getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color *= treeSunFilter;",
    )}`);
  }
}

export function sundialLighting(textures: THREE.Texture[], entries: TravelWindow[], slots: Slot[]) {
  const [art, facets, transmission, paneIds] = textures.map((map, i) => {
    const texture = map.clone();
    texture.colorSpace = i === 1 || i === 3 ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  });
  paneIds.minFilter = paneIds.magFilter = THREE.NearestFilter;
  paneIds.generateMipmaps = false;
  const tracery = createTraceryAtlas(entries);
  const panePaths = createPanePaths(tracery.network);
  const time = { value: 0 };
  const daylight = { value: 1 };
  const moonlight = { value: 0 };
  const lamps = { value: 0 };
  const clearNoon = { value: 0 };
  const moonVisibility = { value: 0 };
  return {
    art: { value: art }, facets: { value: facets }, transmission: { value: transmission },
    paneIds: { value: paneIds }, panePaths,
    time,
    setTime: (elapsed: number) => { time.value = elapsed; panePaths.advance(elapsed); },
    ray: { value: new THREE.Vector3() },
    moonRay: { value: new THREE.Vector3() },
    moonVisibility,
    keyRay: { value: new THREE.Vector3() },
    daylight, moonlight, lamps, clearNoon,
    setExteriorLight(sun: number, moon: number, lamp: number, noon: number, lunarDisc: number) {
      daylight.value = sun;
      moonlight.value = moon;
      lamps.value = lamp;
      clearNoon.value = noon;
      moonVisibility.value = lunarDisc;
    },
    tints: { value: entries.map(({ assetId }) => new THREE.Color(windowTints[assetId] ?? "#cfba9c")) },
    activation: createSundialHover(slots.length),
    planes: { value: slots.map(({ x, z, yaw }) => new THREE.Vector4(x, z, Math.cos(yaw), Math.sin(yaw))) },
    layers: { value: entries.map(({ atlasIndex }) => atlasIndex) },
    tracery,
  };
}

export type SundialLighting = ReturnType<typeof sundialLighting>;

export function paneMaterial(optics: SundialLighting, layer: number, slot: number, traceryLayer?: number) {
  const material = new THREE.MeshPhysicalMaterial({
    opacity: 1, side: THREE.DoubleSide, transmission: .92, thickness: .108, ior: 1.5,
    roughness: .12, metalness: 0, clearcoat: .29, clearcoatRoughness: .12, envMapIntensity: .43,
  });
  material.customProgramCacheKey = () => `sundial-pane-${optics.layers.value.length}-${traceryLayer === undefined ? "main" : optics.tracery.columns}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.sundialArt = optics.art;
    shader.uniforms.sundialFacets = optics.facets;
    shader.uniforms.paneIds = optics.paneIds;
    shader.uniforms.panePathState = optics.panePaths.texture;
    shader.uniforms.paneLayer = { value: layer };
    shader.uniforms.paneSlot = { value: slot };
    shader.uniforms.sundialHover = optics.activation.illumination;
    shader.uniforms.paneTint = { value: optics.tints.value[slot] };
    shader.uniforms.sundialRay = optics.ray;
    shader.uniforms.windowLamps = optics.lamps;
    if (traceryLayer !== undefined) {
      shader.uniforms.traceryMap = optics.tracery.texture;
      shader.uniforms.traceryLayer = { value: traceryLayer };
    }
    const plane = optics.planes.value[slot];
    shader.uniforms.paneFacing = { value: new THREE.Vector3(plane.w, 0, plane.z) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vPaneUV; varying vec3 vPaneWorld;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvPaneUV = uv; vPaneWorld = (modelMatrix * vec4(position, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec2 vPaneUV;
        varying vec3 vPaneWorld;
        uniform sampler2D sundialArt;
        uniform sampler2D sundialFacets;
        uniform float paneLayer;
        uniform float paneSlot;
        uniform vec3 paneTint;
        uniform vec3 paneFacing;
        uniform vec3 sundialRay;
        uniform float windowLamps;
        uniform float sundialHover[${optics.layers.value.length}];
        ${atlas}
        ${sundialPanePaths}
        ${paneHoverLight}
        ${lampColor}
        ${traceryLayer === undefined ? "" : `uniform float traceryLayer;\n${tracerySampling(optics.tracery.columns)}`}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        ${traceryLayer === undefined ? /* glsl */ `
          vec2 paneAt = atlasUV(vPaneUV, paneLayer);
          vec4 paneArt = texture2D(sundialArt, paneAt);
          if (paneArt.a < .46) discard;
          vec3 paneFacet = texture2D(sundialFacets, paneAt).rgb;
          float paneLead = smoothstep(.025, .17, dot(paneArt.rgb, glassLuma));
          vec2 glassUV = vPaneUV;
          vec3 paneLight = panePathColor(paneArt.rgb, mainPaneId(paneAt), paneLayer, false);
        ` : /* glsl */ `
          vec4 paneArt = tracerySample(vPaneUV, traceryLayer);
          float id = floor(paneArt.a * 255.0 + .5);
          if (id < 1.0) discard;
          vec3 paneFacet = traceryFacet(id);
          float paneLead = step(1.5, id);
          vec2 glassUV = traceryPaneUV(vPaneUV);
          vec3 paneLight = panePathColor(paneArt.rgb, int(id), paneLayer, true);
        `}
        diffuseColor.rgb *= mix(vec3(.047, .037, .029), pow(mix(paneArt.rgb, paneLight, .65), vec3(.65)), paneLead);
      `)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(.39, mix(.055, .149, paneFacet.b), paneLead);
      `)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec2 paneRipple = .014 * vec2(sin(glassUV.x * 270.0 + 1.5 * cos(glassUV.y * 240.0)),
          cos(glassUV.y * 330.0 + glassUV.x * 56.0));
        normal = normalize(normal + vec3(((paneFacet.rg - .5) * .27 + paneRipple) * paneLead, 0.0));
      `)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float angleLight = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);
        vec3 viewedSide = paneFacing * sign(dot(paneFacing, cameraPosition - vPaneWorld));
        float fill = (1.0 - smoothstep(-.10, .60, dot(viewedSide, sundialRay))) * paneLead;
        float backGlow = .22 * fill * (1.0 - smoothstep(.04, .66, length((glassUV - vec2(.50, .55)) * vec2(1.2, .83))));
        vec3 coloredGlass = mix(paneArt.rgb, paneLight, paneLead) * mix(vec3(1.0), .8 + .45 * paneTint, fill);
        float glassLift = paneHoverGain(paneArt.rgb, sundialHover[int(paneSlot)] * paneLead, sundialRay.y);
        vec3 daylightGlass = coloredGlass * (.55 + backGlow + .12 * angleLight);
        vec3 lampGlass = warmLampGlass(mix(paneArt.rgb, paneLight, paneLead)) * (.54 + .10 * paneLead);
        totalEmissiveRadiance += mix(daylightGlass, lampGlass, windowLamps) * glassLift;
      `)
      .replace("#include <transmission_fragment>", THREE.ShaderChunk.transmission_fragment.replace(
        "material.transmission = transmission;", "material.transmission = transmission * paneLead;",
      ));
  };
  return material;
}

export function stoneProjection(optics: SundialLighting, inlay?: SundialInlay): THREE.MeshStandardMaterial["onBeforeCompile"] {
  const count = optics.layers.value.length;
  return (shader) => {
    if (inlay) floorMarble(shader, inlay, optics.activation.inlay);
    else carvedStone(shader);
    Object.assign(shader.uniforms, {
      paneIds: optics.paneIds, panePathState: optics.panePaths.texture, sundialTrans: optics.transmission,
      keyRay: optics.keyRay, sundialPlanes: optics.planes, sundialLayers: optics.layers, sundialHover: optics.activation.illumination,
      sundialTime: optics.time,
      sundialDaylight: optics.daylight, sundialMoonlight: optics.moonlight,
      clearNoon: optics.clearNoon,
      traceryMap: optics.tracery.texture, traceryLayers: optics.tracery.layers,
    });
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform vec3 keyRay;
        uniform vec4 sundialPlanes[${count}];
        uniform float sundialLayers[${count}];
        uniform float sundialHover[${count}];
        uniform sampler2D sundialTrans;
        uniform float sundialTime;
        uniform float sundialDaylight;
        uniform float sundialMoonlight;
        uniform float clearNoon;
        ${atlas}
        ${sundialPanePaths}
        ${paneHoverLight}
        ${paneProjectionGeometry}
        float drift(vec2 p);

        float sunlightTail(float distanceToPane) {
          return 1.0 - .68 * smoothstep(10.4, 22.0, distanceToPane);
        }

        vec3 projectedGlassColor(vec3 light, float gain) {
          float peak = max(light.r, max(light.g, light.b));
          vec3 hue = pow(light / max(.024, peak), vec3(1.66));
          // Keep the darker steps legible when the daylight response compresses peak brightness.
          float energy = 1.55 * peak / (.17 + peak) * mix(1.0, gain, gain < 1.0 ? .64 : .50);
          float lowSun = mix(1.95, 1.0, smoothstep(.19, .79, keyRay.y));
          float skySpill = mix(.15, .045, smoothstep(.20, .72, keyRay.y));
          return skySpill + hue * energy * lowSun;
        }

        ${optics.tracery.enabled ? `uniform float traceryLayers[${count}];\n${tracerySampling(optics.tracery.columns)}` : ""}

        float contactShade(vec3 ground) {
          float shade = .24 * exp(-dot(ground.xz, ground.xz) * 4.6);
          float treeRim = (length(ground.xz) - 1.51) / .16;
          shade += .20 * exp(-treeRim * treeRim);
          for (int i = 0; i < ${count}; i++) {
            vec4 slot = sundialPlanes[i];
            vec3 local = paneAxes(ground - vec3(slot.x, 0.0, slot.y), slot.zw);
            vec2 offset = max(abs(local.xz) - vec2(1.09, .30), 0.0);
            shade = max(shade, .34 * exp(-dot(offset, offset) / .034));
          }
          return 1.0 - shade;
        }
      `)
      .replace("#include <shadowmap_pars_fragment>", `#include <shadowmap_pars_fragment>
        #if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF) && NUM_DIR_LIGHT_SHADOWS > 0
          uniform mat4 directionalShadowMatrix[NUM_DIR_LIGHT_SHADOWS];
        #endif

        struct StoneProjection {
          vec3 direct;
          vec3 tint;
          float coverage;
          float weight;
        };

        float keyVisibility(vec3 offset) {
          #if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF) && NUM_DIR_LIGHT_SHADOWS > 0
            if (!receiveShadow) return 1.0;
            vec4 coord = vDirectionalShadowCoord[0] + directionalShadowMatrix[0] * vec4(offset, 0.0);
            vec3 at = coord.xyz / coord.w;
            DirectionalLightShadow shadow = directionalLightShadows[0];
            #ifdef USE_REVERSED_DEPTH_BUFFER
              at.z -= shadow.shadowBias;
            #else
              at.z += shadow.shadowBias;
            #endif
            if (at.z > 1.0 || any(lessThan(at.xy, vec2(0.0))) || any(greaterThan(at.xy, vec2(1.0)))) return 1.0;
            return mix(1.0, texture(directionalShadowMap[0], at), shadow.shadowIntensity);
          #else
            return 1.0;
          #endif
        }

        vec2 paneSlope(vec3 delta, vec3 ray) {
          return delta.xy - delta.z * ray.xy / ray.z;
        }

        vec4 glassRay(vec2 hit, vec2 ripple, vec2 dx, vec2 dy, int windowIndex, out float original) {
          float layer = sundialLayers[windowIndex];
          float edge = paneOpeningEdge(hit, paneHalfWidthAt(hit.y));
          float aperture = smoothstep(-.012, .021, edge);
          original = 0.0;
          if (aperture > .001) {
            vec2 at = atlasUV((hit + ripple) / paneSize + paneOrigin, layer);
            vec4 glass = textureGrad(sundialTrans, at, dx, dy);
            // The atlas alpha shapes lead seams within the geometric opening.
            float lead = pow(glass.a, .72);
            original = dot(glass.rgb, glassLuma) * lead;
            float tipTaper = 1.0 - .65 * smoothstep(glassTop - .80, glassTop - .16, hit.y);
            return vec4(panePathColor(glass.rgb, mainPaneId(at), layer, false) * lead, aperture * tipTaper);
          }
          ${optics.tracery.enabled ? `
          float traceryLayer = traceryLayers[windowIndex];
          if (traceryLayer >= 0.0 && hit.y > glassTop - .07) {
            vec4 glass = tracerySample(traceryUV(hit), traceryLayer);
            int id = int(glass.a * 255.0 + .5);
            if (id > 1) {
              original = dot(glass.rgb, glassLuma);
              return vec4(panePathColor(glass.rgb, id, layer, true), 1.0);
            }
          }
          ` : ""}
          return vec4(0.0);
        }

        StoneProjection projectThroughWindow(vec3 receiver, vec3 surfaceNormal) {
          if (sundialDaylight + sundialMoonlight <= 0.0) return StoneProjection(vec3(1.0), vec3(0.0), 0.0, 0.0);
          vec3 worldDx = dFdx(receiver), worldDy = dFdy(receiver);
          vec3 start = receiver;
          #if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF) && NUM_DIR_LIGHT_SHADOWS > 0
            if (receiveShadow) start += normalize(vCraftNormal) * directionalLightShadows[0].shadowNormalBias;
          #endif
          float nearest = 80.0;
          float feather = 0.0;
          float projectionWeight = 0.0;
          int windowIndex = -1;
          vec2 hit = vec2(0.0);
          vec2 basis = vec2(1.0, 0.0);
          vec3 ray = vec3(0.0, 0.0, 1.0);
          for (int i = 0; i < ${count}; i++) {
            vec4 slot = sundialPlanes[i];
            vec3 localRay = paneAxes(keyRay, slot.zw);
            if (abs(localRay.z) < .028) continue;
            // Near edge-on, the plane is ill-conditioned. Let the frame's shadow map
            // carry the solid silhouette while the glass projection tapers away.
            float incidenceWeight = sundialDaylight > 0.0 ? smoothstep(.075, .24, abs(localRay.z)) : 1.0;
            if (incidenceWeight <= 0.0) continue;
            vec3 point = paneAxes(start - vec3(slot.x, 0.0, slot.y), slot.zw);
            float distance = -point.z / localRay.z;
            if (distance <= .015 || distance >= nearest) continue;
            vec2 target = point.xy + localRay.xy * distance;
            float width = lancetHalfWidth(target.y, ${(gothicSilhouette.spring * WINDOW_SCALE).toFixed(5)}, frameTop, ${(gothicSilhouette.halfWidth * WINDOW_SCALE).toFixed(5)});
            float outside = max(abs(target.x) - width, max(.21 - target.y, target.y - frameTop));
            float margin = .26 + min(.68, (.06 + .013 * distance) / abs(localRay.z));
            float nearWindow = 1.0 - smoothstep(margin * .55, margin, outside);
            if (nearWindow <= .0) continue;
            nearest = distance;
            windowIndex = i;
            hit = target;
            basis = slot.zw;
            ray = localRay;
            feather = nearWindow;
            projectionWeight = incidenceWeight * smoothstep(0.0, .42, nearWindow);
          }
          if (windowIndex < 0) return StoneProjection(vec3(1.0), vec3(0.0), 0.0, 0.0);

          vec2 dx = paneSlope(paneAxes(worldDx, basis), ray) / paneSize * atlasScale;
          vec2 dy = paneSlope(paneAxes(worldDy, basis), ray) / paneSize * atlasScale;
          vec2 field = receiver.xz * .72;
          vec2 flow = vec2(sundialTime * .034, -sundialTime * .028);
          vec2 shimmer = vec2(drift(field + flow), drift(field.yx - flow + 16.0));
          vec2 slope = clamp(paneAxes(surfaceNormal, basis).xz, vec2(-.24), vec2(.24));
          vec2 ripple = slope * .066 + shimmer * .038;
          vec3 across = normalize(cross(vec3(0.0, 1.0, 0.0), keyRay));
          vec3 along = cross(keyRay, across);
          // Keep contact shadows tight and open the same cone of rays for both
          // the stone occluder and the glass as their distance from the floor grows.
          float reach = smoothstep(.24, 7.4, nearest);
          float radius = mix(.027, .157, reach * feather);
          float openingEdge = paneOpeningEdge(hit, paneHalfWidthAt(hit.y));
          float rimClearance = (radius + .16 * length(ray.xy)) / abs(ray.z);
          float interior = smoothstep(rimClearance, rimClearance + .15, openingEdge);
          radius = mix(radius, min(radius, .037 + .0015 * nearest), interior);
          // At the projected crown, spread along the footprint of the sunlight.
          // Keep the lateral edge and the mosaic in the body of the beam readable.
          float crown = smoothstep(glassTop - .76, glassTop + .28, hit.y) * reach * feather;
          float lengthwise = 1.0 + 1.32 * crown * (1.0 - interior);
          radius *= mix(1.0, .82, clearNoon);
          float visible = 0.0;
          float colored = 0.0;
          float originalLight = 0.0;
          vec3 light = vec3(0.0);
          for (int j = 0; j < 9; j++) {
            float angle = float(j) * 2.39996323;
            float spread = radius * sqrt(float(j) / 8.0);
            vec3 offset = (across * cos(angle) + along * (lengthwise * sin(angle))) * spread;
            float weight = (j == 0 ? .36 : .08) * keyVisibility(offset);
            visible += weight;
            if (weight < .0001) continue;
            vec2 lightAt = hit + paneSlope(paneAxes(offset, basis), ray);
            float original;
            vec4 glass = glassRay(lightAt, ripple, dx, dy, windowIndex, original);
            float through = weight * glass.a;
            colored += through;
            light += glass.rgb * through;
            originalLight += original * through;
          }

          float incidence = smoothstep(.035, .17, abs(ray.z));
          // Let the crown taper through low color coverage without carrying an isolated outer tap.
          float coherence = smoothstep(.10 - .032 * crown, .42 - .10 * crown, colored);
          float coverage = colored * coherence * feather * incidence * sunlightTail(nearest);
          float gain = clamp(dot(light, glassLuma) / max(.01 * colored, originalLight), .40, 1.93);
          vec3 transmitted = light / max(.001, colored);
          vec3 tint = projectedGlassColor(transmitted * (1.0 + .13 * shimmer.x), gain)
            * paneHoverGain(transmitted, .73 * sundialHover[windowIndex], keyRay.y);
          float rim = crown * (1.0 - smoothstep(.13, .66, colored));
          tint = mix(tint, vec3(dot(tint, glassLuma)), .58 * rim);
          if (sundialMoonlight > 0.0) {
            // Tinted moonlight replaces the same rays that the glass intercepts.
            vec3 moonTint = min(vec3(.88), vec3(.17) + .51 * tint);
            return StoneProjection(vec3(visible - coverage) + moonTint * coverage, moonTint, coverage, 1.0);
          }
          float skyBounce = (.13 * reach * feather + .38 * crown) * (1.0 - visible);
          vec3 bounceColor = vec3(1.0);
          if (rim > .02 && skyBounce > .01) {
            // A little transmitted light from the neighboring glass tints the soft shadow at the crown.
            vec3 nearbyLight = vec3(0.0);
            for (int j = 0; j < 3; j++) {
              float stepBack = .17 * float(j + 1);
              vec3 offset = -along * stepBack + across * (.05 * float(j - 1));
              vec2 lightAt = hit + paneSlope(paneAxes(offset, basis), ray);
              float original;
              vec4 glass = glassRay(lightAt, ripple, dx, dy, windowIndex, original);
              nearbyLight += glass.rgb * (glass.a * keyVisibility(offset) * (.48 - .14 * float(j)));
            }
            vec3 chroma = nearbyLight - vec3(dot(nearbyLight, glassLuma));
            bounceColor = max(vec3(.38), bounceColor + 1.45 * rim * chroma);
          }
          return StoneProjection(vec3(visible - coverage) + skyBounce * bounceColor + tint * (1.43 * coverage), tint,
            coverage * projectionWeight, projectionWeight);
        }
      `)
      .replace("#include <lights_fragment_begin>", `
        StoneProjection sundialBeam = projectThroughWindow(vCraftPosition, transformNormalByInverseViewMatrix(normal, viewMatrix));
        ${THREE.ShaderChunk.lights_fragment_begin.replace(
          "directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;",
          `#if defined(SHADOWMAP_TYPE_PCF) && UNROLLED_LOOP_INDEX == 0
            if (sundialBeam.weight >= 1.0) directLight.color *= sundialBeam.direct;
            else {
              float frameShadow = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
              directLight.color *= mix(vec3(frameShadow), sundialBeam.direct, sundialBeam.weight);
            }
          #else
            directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
          #endif
          `,
        )}`)
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        // White environment fill otherwise washes out the filtered sunlight on pale stone.
        // Scale the existing PBR terms so the stone texture and real shadows still contribute.
        float daylight = sundialDaylight * smoothstep(.20, .72, keyRay.y);
        vec3 bounceTint = mix(.74, .40, daylight) + .12 * clamp(sundialBeam.tint, 0.0, 1.0);
        float bounceCoverage = sundialBeam.coverage * (sundialDaylight > 0.0 ? 1.0 : .20 * sundialMoonlight);
        reflectedLight.indirectDiffuse *= mix(vec3(.91), bounceTint, bounceCoverage) * contactShade(vCraftPosition);
        reflectedLight.directSpecular *= mix(mix(.30, .50, daylight), .68, ${inlay ? "inlayMask" : "0.0"}) * mix(1.0, .72, sundialBeam.coverage);
        reflectedLight.indirectSpecular *= mix(mix(.57, mix(.61, .48, daylight), bounceCoverage), .70, ${inlay ? "inlayMask" : "0.0"});`);
  };
}
