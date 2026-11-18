import { Vector2, Vector4, type IUniform, type MeshStandardMaterial } from "three";
import { traceryRoundelCenter } from "./france-window-frame";
import { INLAY_WIDTH_SCALE, type InlayTiming, type SundialInlay } from "./sundial-inlay";
import { slabFinish } from "./sundial-floor";

type MaterialShader = Parameters<MeshStandardMaterial["onBeforeCompile"]>[0];

const driftNoise = /* glsl */ `
  vec2 driftHash(vec2 q) {
    vec2 h = vec2(dot(q, vec2(127.1, 311.7)), dot(q, vec2(269.5, 183.3)));
    return fract(sin(h) * 43758.5453) * 2.0 - 1.0;
  }
  float drift(vec2 p) {
    vec2 q = floor(p);
    vec2 f = fract(p);
    vec2 w = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(driftHash(q), f), dot(driftHash(q + vec2(1, 0)), f - vec2(1, 0)), w.x),
      mix(dot(driftHash(q + vec2(0, 1)), f - vec2(0, 1)), dot(driftHash(q + 1.0), f - 1.0), w.x), w.y);
  }
`;

export function cherryCrownTexture(shader: MaterialShader) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vCherryGrain; varying vec3 vCherryLocalNormal;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      vCherryGrain = position;
      #ifdef USE_INSTANCING_COLOR
        vCherryGrain += instanceColor * vec3(6.2, 11.7, 8.4);
      #endif
      vCherryLocalNormal = normalize(position);
    `);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      varying vec3 vCherryGrain;
      varying vec3 vCherryLocalNormal;
      ${driftNoise}

      float leaflet(vec2 site) {
        vec2 jitter = driftHash(floor(site));
        vec2 direction = normalize(vec2(1.2 + jitter.x, jitter.y));
        vec2 local = fract(site) - .5 + .23 * jitter;
        vec2 leaf = vec2(dot(local, direction), dot(local, vec2(-direction.y, direction.x)));
        float leafWidth = .28 * pow(max(0.0, 1.0 - abs(leaf.x) * 2.04), .67);
        float tip = 1.0 - smoothstep(.42, .52, abs(leaf.x));
        float edge = 1.0 - smoothstep(-.04, .07, abs(leaf.y) - leafWidth);
        return tip * edge * (.73 + .16 * (1.0 - smoothstep(.025, .16, abs(leaf.y))));
      }

      float leafLayers(vec2 field) {
        vec2 warp = vec2(drift(field * .31), drift(field * .31 + vec2(4.2, 6.8)));
        vec2 at = field + .49 * warp;
        return max(leaflet(at), .73 * leaflet(at - vec2(.43, .5))) * (.80 + .34 * warp.y);
      }
    `)
    .replace("#include <color_fragment>", `#include <color_fragment>
      vec3 crownField = vCherryGrain * 3.65;
      vec3 leafWeights = pow(abs(normalize(vCherryLocalNormal)), vec3(4.0));
      leafWeights /= dot(leafWeights, vec3(1.0));
      float leafCover = dot(leafWeights, vec3(leafLayers(crownField.yz), leafLayers(crownField.zx), leafLayers(crownField.xy)));
      float detailVisibility = 1.0 - smoothstep(.31, .87, length(fwidth(crownField)));
      float leafTone = (leafCover - .40) * detailVisibility;
      diffuseColor.rgb *= 1.0 + vec3(.19, .225, .20) * leafTone;
    `)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float leafRelief = .0018 * leafCover * detailVisibility;
      vec3 crownDx = dFdx(-vViewPosition), crownDy = dFdy(-vViewPosition);
      vec3 crownAcross = cross(crownDy, normal), crownAlong = cross(normal, crownDx);
      float crownArea = dot(crownDx, crownAcross);
      vec3 leafSlope = (crownAcross * dFdx(leafRelief) + crownAlong * dFdy(leafRelief)) * sign(crownArea) / max(1e-7, abs(crownArea));
      normal = normalize(normal - clamp(leafSlope, vec3(-.28), vec3(.28)));
    `);
}

const stoneField = /* glsl */ `
  ${driftNoise}

  float mineralBand(vec2 p) {
    float bend = drift(p * .52) * 1.14 + drift(p * 1.74 + 5.1) * .32;
    float seam = abs(sin((p.y * 1.8 + bend) * 3.14159));
    return 1.0 - smoothstep(.02, .16, seam);
  }

  float stoneVein(vec3 p, vec3 weights) {
    vec2 top = vec2(dot(p.xz, vec2(.84, .54)), dot(p.xz, vec2(-.54, .84)));
    return dot(weights, vec3(mineralBand(p.zy), mineralBand(top), mineralBand(p.xy)));
  }
`;

function addSurfacePosition(shader: MaterialShader) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vCraftPosition; varying vec3 vCraftNormal;")
    .replace("#include <project_vertex>", `#include <project_vertex>
      vec4 craftPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        craftPosition = instanceMatrix * craftPosition;
      #endif
      vCraftPosition = (modelMatrix * craftPosition).xyz;
      vCraftNormal = transformNormalByInverseViewMatrix(transformedNormal, viewMatrix);
    `);
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>",
    "#include <common>\nvarying vec3 vCraftPosition; varying vec3 vCraftNormal;");
}

function addCarvedStone(shader: MaterialShader, strength: number) {
  addSurfacePosition(shader);
  shader.uniforms.stoneStrength = { value: strength };
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      uniform float stoneStrength;
      ${stoneField}`)
    .replace("#include <color_fragment>", `#include <color_fragment>
      vec3 stonePoint = vCraftPosition;
      vec3 stoneNormal = normalize(vCraftNormal);
      vec3 layerWeights = pow(abs(stoneNormal), vec3(4.0));
      layerWeights /= dot(layerWeights, vec3(1.0));
      float mineral = .55 * drift(stonePoint.xz * .63 + stonePoint.y * .30)
        + .31 * drift(stonePoint.xy * 2.1 + stonePoint.z * .52)
        + .14 * drift(stonePoint.zy * 7.2 + stonePoint.x);
      float vein = stoneVein(stonePoint * .59, layerWeights) * smoothstep(-.25, .25, mineral);
      float marks = .48 + .52 * drift(stonePoint.xz * 25.0 + stonePoint.y * vec2(12.0, 17.0));
      float edgeChisel = 1.0 - smoothstep(.05, .66, abs(stoneNormal.y));
      float layerHeight = stonePoint.y + .13 * drift(stonePoint.xz * .96) + .045 * drift(stonePoint.xz * 3.4);
      float cleft = pow(1.0 - abs(sin(layerHeight * 15.4)), 4.0) * edgeChisel *
        smoothstep(-.15, .30, drift(stonePoint.xz * .87 + stonePoint.y * 2.3));
      vec3 cool = vec3(.86, .88, .95);
      vec3 warm = vec3(1.05, 1.015, .96);
      float pockets = smoothstep(-.34, .26, mineral);
      vec3 stoneTint = mix(cool, warm, pockets);
      stoneTint *= 1.0 - vein * .25 - .11 * cleft - .066 * smoothstep(.59, .85, marks);
      diffuseColor.rgb *= mix(vec3(1.0), stoneTint, stoneStrength);
    `)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + stoneStrength * (.08 * vein + .13 * (marks - .5)), .32, .97);
    `)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float relief = stoneStrength * (.52 * mineral - .32 * vein - .22 * cleft - .10 * marks);
      vec3 forward = dFdx(vCraftPosition);
      vec3 sideways = dFdy(vCraftPosition);
      vec3 detail = cross(sideways, stoneNormal) * dFdx(relief) + cross(stoneNormal, forward) * dFdy(relief);
      float area = dot(forward, cross(sideways, stoneNormal));
      normal = normalize(normal - mat3(viewMatrix) * detail * sign(area) / (abs(area) + .000001) * .10);
    `);
}

function addUndersideFill(shader: MaterialShader) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
    float downwardFace = smoothstep(.0, .88, -normalize(vCraftNormal).y);
    reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(.087, .112, .22) * downwardFace;`);
}

export function carvedStone(shader: MaterialShader) {
  addCarvedStone(shader, 1);
  addUndersideFill(shader);
}

export function quarriedStone(shader: MaterialShader) {
  addSurfacePosition(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      ${driftNoise}

      vec3 quarryLayers(vec2 point) {
        vec2 at = vec2(dot(point, vec2(.82, .57)), dot(point, vec2(-.57, .82)));
        return vec3(drift(at * .66), drift(at * 3.4 + vec2(12.7, 7.3)), drift(at * 14.0 + vec2(2.4, 17.3)));
      }
    `)
    .replace("#include <color_fragment>", `#include <color_fragment>
      vec3 rockPoint = vCraftPosition;
      vec3 rockNormal = normalize(vCraftNormal);
      vec3 rockWeights = pow(abs(rockNormal), vec3(4.0));
      rockWeights /= max(dot(rockWeights, vec3(1.0)), 1e-5);
      vec3 layers = quarryLayers(rockPoint.zy) * rockWeights.x + quarryLayers(rockPoint.xz) * rockWeights.y
        + quarryLayers(rockPoint.xy) * rockWeights.z;
      vec3 rockDx = dFdx(rockPoint);
      vec3 rockDy = dFdy(rockPoint);
      float rockPixel = max(length(rockDx), length(rockDy));
      vec3 visibility = 1.0 - smoothstep(vec3(.30), vec3(.90), rockPixel * vec3(.66, 3.4, 14.0));
      vec3 resolved = layers * visibility;

      float bedPhase = (dot(rockPoint, vec3(.22, .92, -.17)) + .35 * layers.x + .05 * layers.y) * 6.7;
      float seam = (1.0 - smoothstep(.045, .25, abs(sin(bedPhase)))) * smoothstep(-.18, .23, layers.x + .46 * layers.y);
      float seamVisibility = 1.0 - smoothstep(.22, .86, fwidth(bedPhase));
      float shale = .68 * resolved.x + .32 * resolved.y;
      vec3 rockTint = mix(vec3(.78, .81, .86), vec3(1.07, 1.04, .98), smoothstep(-.34, .34, shale));
      rockTint *= 1.0 + .22 * resolved.y + .16 * resolved.z - .19 * seam * seamVisibility;
      diffuseColor.rgb *= rockTint;
    `)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + .13 * resolved.y + .09 * resolved.z, .72, .96);
    `)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec4 rockHeight = vec4(layers, seam);
      // Filter the slope of each frequency by its projected size.
      vec4 relief = vec4(vec3(.052, .025, .003) * visibility, -.012 * seamVisibility);
      vec3 across = cross(rockDy, rockNormal);
      vec3 along = cross(rockNormal, rockDx);
      float area = dot(rockDx, across);
      vec3 bump = (across * dot(dFdx(rockHeight), relief) + along * dot(dFdy(rockHeight), relief))
        * sign(area) / max(abs(area), 1e-6);
      normal = normalize(normal - mat3(viewMatrix) * bump / (1.0 + 1.8 * length(bump)));
    `);
  addUndersideFill(shader);
}

export function plantingSoil(shader: MaterialShader) {
  addSurfacePosition(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${driftNoise}`)
    .replace("#include <color_fragment>", `#include <color_fragment>
      vec2 soil = vCraftPosition.xz;
      float patches = .64 * drift(soil * 3.8) + .36 * drift(soil * 11.6 + 8.2);
      float clods = drift(soil * 15.0 + patches * .7);
      float fineDetail = 1.0 - smoothstep(.31, 1.05, length(fwidth(soil * 41.0)));
      float grit = drift(soil * 41.0 + 1.5 * clods);
      float grains = fineDetail * smoothstep(.12, .38, grit);
      float pits = smoothstep(.12, .38, -clods) + .53 * fineDetail * smoothstep(.10, .37, -grit);
      float rootContact = exp(-dot(soil, soil) * 5.0);
      float wallContact = smoothstep(.94, 1.14, length(soil));
      vec3 earthTone = mix(vec3(.75, .74, .71), vec3(1.19, 1.13, 1.04), smoothstep(-.31, .34, patches));
      diffuseColor.rgb *= earthTone * (1.0 + .44 * grains + .23 * clods - .26 * pits - .20 * rootContact - .25 * wallContact);
    `)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float relief = .010 * patches + .010 * clods + .0045 * grains - .0045 * pits;
      vec3 dx = dFdx(vCraftPosition), dy = dFdy(vCraftPosition);
      vec3 up = normalize(vCraftNormal);
      vec3 across = cross(dy, up), along = cross(up, dx);
      float area = dot(dx, across);
      vec3 slope = (across * dFdx(relief) + along * dFdy(relief)) * sign(area) / max(1e-7, abs(area));
      normal = normalize(normal - mat3(viewMatrix) * clamp(slope, vec3(-.58), vec3(.58)));
    `);
}

export function floorMarble(shader: MaterialShader, inlay: SundialInlay, activation: IUniform<Vector4[]>) {
  addSurfacePosition(shader);
  const timings = (pieces: { timing: InlayTiming }[]) => ({
    value: pieces.length ? pieces.map(({ timing }) => new Vector4(...timing)) : [new Vector4()],
  });
  shader.uniforms.brassActivation = activation;
  shader.uniforms.brassArcTiming = timings(inlay.arcs);
  shader.uniforms.brassRadialTiming = timings(inlay.radials);
  shader.uniforms.brassElbowTiming = timings(inlay.elbows);
  shader.uniforms.brassArcs = { value: inlay.arcs.length ? inlay.arcs.map(({ shape }) => new Vector4(...shape)) : [new Vector4()] };
  shader.uniforms.brassRadials = { value: inlay.radials.length ? inlay.radials.map(({ shape: [angle, inner, outer] }) =>
    new Vector4(Math.sin(angle), -Math.cos(angle), inner, outer)) : [new Vector4()] };
  shader.uniforms.brassWidths = { value: inlay.radials.length ? inlay.radials.map(({ shape }) => shape[3]) : [.001] };
  shader.uniforms.brassElbows = { value: inlay.elbows.length ? inlay.elbows.map(({ shape: { center, arc } }) =>
    new Vector4(...center, arc[0], arc[3])) : [new Vector4()] };
  shader.uniforms.brassElbowAngles = { value: inlay.elbows.length ? inlay.elbows.map(({ shape: { arc } }) =>
    new Vector2(arc[1], arc[2])) : [new Vector2()] };
  shader.uniforms.brassJunctions = { value: inlay.junctions.map(([x, z]) => new Vector2(x, z)) };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute vec3 slabFinish; varying vec3 vSlabFinish;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSlabFinish = slabFinish;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      varying vec3 vSlabFinish;
      ${driftNoise}
      uniform vec4 brassArcs[${Math.max(1, inlay.arcs.length)}];
      uniform vec4 brassRadials[${Math.max(1, inlay.radials.length)}];
      uniform float brassWidths[${Math.max(1, inlay.radials.length)}];
      uniform vec4 brassElbows[${Math.max(1, inlay.elbows.length)}];
      uniform vec2 brassElbowAngles[${Math.max(1, inlay.elbows.length)}];
      uniform vec4 brassArcTiming[${Math.max(1, inlay.arcs.length)}];
      uniform vec4 brassRadialTiming[${Math.max(1, inlay.radials.length)}];
      uniform vec4 brassElbowTiming[${Math.max(1, inlay.elbows.length)}];
      uniform vec4 brassActivation[${Math.max(1, activation.value.length)}];
      uniform vec2 brassJunctions[${inlay.junctions.length}];
      const float brassWidthScale = ${INLAY_WIDTH_SCALE.toFixed(3)};

      vec2 radialAxis(float angle) { return vec2(sin(angle), -cos(angle)); }

      vec3 arcStroke(vec2 point, float radius, vec2 angles, float width, out float signedAngle) {
        float angle = atan(point.x, -point.y);
        float offset = mod(angle - angles.x + PI, PI2) - PI;
        signedAngle = clamp(offset, -angles.y, angles.y);
        float bearing = angles.x + signedAngle;
        return vec3(length(point - radius * radialAxis(bearing)) - width, cos(bearing), sin(bearing));
      }

      vec3 brassPass(vec4 activation, float at) {
        float behind = activation.x - at;
        float reached = smoothstep(-.29, .16, behind);
        float head = (behind - .095) / .245;
        float closeCrest = exp(-head * head) * (1.0 - smoothstep(.51, .68, behind));
        float menuCrest = 1.0 - smoothstep(.18, 1.26, behind);
        float crest = mix(closeCrest, menuCrest, activation.z) * activation.w;
        return activation.y * reached * vec3(1.0, crest, activation.z);
      }

      vec3 brassSweep(vec4 timing, float at) {
        if (timing.x < 0.0) return vec3(0.0);
        vec3 glow = brassPass(brassActivation[int(timing.x)], timing.z + at);
        if (timing.y >= 0.0) glow = max(glow, brassPass(brassActivation[int(timing.y)], timing.z + at));
        return glow;
      }

      // Return signed distance and tangent, with light for the nearest strip.
      vec3 brassStroke(vec2 point, out vec3 light) {
        float radius = length(point);
        vec3 closest = vec3(.12, 1.0, 0.0);
        light = vec3(0.0);
        float arcDistance = .12;
        for (int i = 0; i < ${inlay.arcs.length}; i++) {
          vec4 arc = brassArcs[i];
          if (abs(radius - arc.x) - arc.w >= arcDistance) continue;
          float signedAngle;
          vec3 sampleAt = arcStroke(point, arc.x, arc.yz, arc.w, signedAngle);
          arcDistance = min(arcDistance, sampleAt.x);
          if (sampleAt.x < closest.x) {
            vec4 timing = brassArcTiming[i];
            closest = sampleAt;
            light = brassSweep(timing, arc.x * (arc.z + signedAngle * timing.w));
          }
        }
        float radialDistance = .12;
        for (int i = 0; i < ${inlay.radials.length}; i++) {
          vec4 radial = brassRadials[i];
          float lengthwise = dot(point, radial.xy);
          float crosswise = abs(dot(point, vec2(-radial.y, radial.x)));
          float pastEnd = max(0.0, max(radial.z - lengthwise, lengthwise - radial.w));
          float distance = length(vec2(crosswise, pastEnd)) - brassWidths[i];
          radialDistance = min(distance, radialDistance);
          if (distance < closest.x) {
            vec4 timing = brassRadialTiming[i];
            float axis = clamp(lengthwise, radial.z, radial.w);
            float local = timing.w > 0.0 ? axis - radial.z : radial.w - axis;
            closest = vec3(distance, radial.xy);
            light = brassSweep(timing, local);
          }
        }
        for (int i = 0; i < ${inlay.elbows.length}; i++) {
          vec4 elbow = brassElbows[i];
          vec2 local = point - elbow.xy;
          if (max(abs(local.x), abs(local.y)) - elbow.z - elbow.w >= closest.x) continue;
          if (abs(length(local) - elbow.z) - elbow.w >= closest.x) continue;
          float signedAngle;
          vec3 sampleAt = arcStroke(local, elbow.z, brassElbowAngles[i], elbow.w, signedAngle);
          if (sampleAt.x < closest.x) {
            vec4 timing = brassElbowTiming[i];
            closest = sampleAt;
            light = brassSweep(timing, elbow.z * (brassElbowAngles[i].y + signedAngle * timing.w));
          }
        }
        // Ease the two shoulders of the T joint without moving the branch.
        float jointDistance = 1.0;
        for (int i = 0; i < ${inlay.junctions.length}; i++) {
          jointDistance = min(jointDistance, length(point - brassJunctions[i]));
        }
        float blend = .085 * brassWidthScale * (1.0 - smoothstep(.07, .18, jointDistance));
        float overlap = max(0.0, blend - abs(arcDistance - radialDistance));
        closest.x -= overlap * overlap / max(.0001, 4.0 * blend);
        return closest;
      }
    `)
    .replace("#include <color_fragment>", `#include <color_fragment>
      float slab = floor(vSlabFinish.x + .5);
      vec2 seed = driftHash(vec2(slab * .43, slab * .81));
      vec2 surface = vCraftPosition.xz + seed * 17.0;
      float bed = vSlabFinish.y;
      int finish = int(vSlabFinish.z + .5);
      float honedFace = float(finish == ${slabFinish.honed});
      float dressedBevel = float(finish == ${slabFinish.bevel});
      float rawCut = float(finish == ${slabFinish.cut});
      float jointDepth = rawCut * smoothstep(.10, .32, bed);
      vec3 slabNormal = normalize(vCraftNormal);
      float cutGrain = 0.0;
      if (rawCut > 0.0) {
        vec2 cutPoint = vec2(dot(vCraftPosition.xz, vec2(slabNormal.z, -slabNormal.x)), vCraftPosition.y) * vec2(25.0, 47.0);
        float visibleGrain = 1.0 - smoothstep(.37, 1.1, length(fwidth(cutPoint)));
        cutGrain = drift(cutPoint + 4.5 * seed) * visibleGrain;
      }
      float cloud = drift(surface * .72) + .34 * drift(surface * 1.84 + seed);
      float bearing = PI * seed.x;
      vec2 axis = vec2(cos(bearing), sin(bearing));
      vec2 grainPoint = vec2(dot(surface, axis), dot(surface, vec2(-axis.y, axis.x)));
      // Cut each slab across a different section of the stone's irregular mineral bands.
      float warp = drift(grainPoint * vec2(.57, 1.36)) + .28 * drift(grainPoint * vec2(2.10, 2.90) + seed);
      float veinPhase = grainPoint.y * (.81 + .15 * seed.y) + .71 * warp;
      float veinDistance = abs(sin(PI * veinPhase));
      float veinFilter = min(.18, fwidth(veinPhase) * 1.45);
      float vein = 1.0 - smoothstep(.055, .19 + veinFilter, veinDistance);
      float halo = 1.0 - smoothstep(.13, .47 + veinFilter, veinDistance);
      float mineral = (.115 * vein + .032 * halo) * smoothstep(-.44, .30, cloud + .54 * warp);
      float sediment = drift(surface * 9.4);
      float detailFade = 1.0 - smoothstep(.30, 1.0, length(fwidth(surface * 25.0)));
      float pores = smoothstep(.07, .38, -drift(surface * 25.0) + .17 * sediment) * detailFade;
      float stoneTone = clamp(.54 + .13 * seed.x + .48 * cloud, 0.0, 1.0);
      vec3 marble = mix(vec3(.85, .84, .825), vec3(1.05, 1.025, .988), stoneTone);
      diffuseColor.rgb *= marble * (1.0 - mineral + .066 * sediment - .064 * pores) * (1.0 - .18 * bed);
      diffuseColor.rgb *= 1.0 + .032 * dressedBevel - .095 * rawCut - .14 * jointDepth + .10 * cutGrain;
      float slabBevel = smoothstep(.10, .62, 1.0 - abs(slabNormal.y)) * (1.0 - smoothstep(.26, .40, bed));
      vec2 floorPoint = vCraftPosition.xz;
      vec3 inlayLight;
      vec3 strip = brassStroke(floorPoint, inlayLight);
      float edgeWidth = clamp(.55 * max(length(dFdx(floorPoint)), length(dFdy(floorPoint))), .001, .057);
      float slabFace = 1.0 - smoothstep(.06, .31, bed);
      float inlayMask = (1.0 - smoothstep(-edgeWidth, edgeWidth, strip.x)) * slabFace;
      float insetEdge = (1.0 - smoothstep(.001, .018 * brassWidthScale + edgeWidth, strip.x)) * (1.0 - inlayMask) * slabFace;
      float metalLip = smoothstep(-.021 * brassWidthScale, -.004 * brassWidthScale + edgeWidth * .35, strip.x);
      float grain = 0.0, patina = .5;
      if (inlayMask > 0.0) {
        grain = drift(vec2(dot(floorPoint, strip.yz) * 3.1, dot(floorPoint, vec2(-strip.z, strip.y)) * 79.0));
        patina = smoothstep(-.39, .40, drift(floorPoint * 1.75) + .09 * grain);
      }
      vec3 brassTint = mix(vec3(.37, .234, .105), vec3(.57, .393, .204), patina) * (1.0 - .17 * metalLip);
      diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - .27 * insetEdge), brassTint, inlayMask);
    `)
    .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float trail = inlayLight.x;
      float crest = inlayLight.y;
      float menu = inlayLight.z / max(.0001, trail);
      float glowWidth = mix(.072, .116, menu);
      float stoneGlow = (1.0 - smoothstep(0.0, glowWidth, strip.x)) * slabFace * (1.0 - inlayMask);
      vec3 amber = vec3(1.0, .33, .059);
      vec3 gold = vec3(1.0, .65, .25);
      totalEmissiveRadiance += amber * trail * (mix(.86, 1.64, menu) * inlayMask + mix(.10, .31, menu) * stoneGlow);
      totalEmissiveRadiance += gold * crest * (mix(.94, 1.72, menu) * inlayMask + mix(.08, .24, menu) * stoneGlow);
    `)
    .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, .74, inlayMask);
    `)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(.84 + .14 * bed + .043 * sediment + .04 * pores - .12 * slabBevel, .70, .98);
      roughnessFactor = mix(roughnessFactor, .865 + .035 * sediment, honedFace);
      roughnessFactor = mix(roughnessFactor, .70 + .045 * sediment, dressedBevel);
      roughnessFactor = mix(roughnessFactor, .958 + .035 * cutGrain, rawCut);
      roughnessFactor = mix(roughnessFactor, .57 + .055 * patina + .03 * grain + .045 * metalLip, inlayMask);
    `)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float relief = (.009 * cloud + .0044 * sediment - .0021 * pores) * (1.0 - .91 * inlayMask);
      relief = mix(relief, .42 * relief, dressedBevel) + .0024 * cutGrain;
      relief += (.00055 * grain - .0039 * brassWidthScale) * inlayMask - .0018 * brassWidthScale * insetEdge;
      vec3 dx = dFdx(vCraftPosition), dy = dFdy(vCraftPosition);
      vec3 surfaceNormal = normalize(vCraftNormal);
      vec3 along = cross(dy, surfaceNormal), across = cross(surfaceNormal, dx);
      float area = dot(dx, along);
      vec3 slope = (dFdx(relief) * along + dFdy(relief) * across) * sign(area) / max(1e-7, abs(area));
      normal = normalize(normal - mat3(viewMatrix) * slope);
    `)
    .replace("#include <aomap_fragment>", `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= (1.0 - .22 * bed) * (1.0 - .14 * insetEdge);
      reflectedLight.indirectDiffuse *= 1.0 - .10 * rawCut - .14 * jointDepth;
      // The slab face absorbs more of the environment's sheen, leaving a soft rim at the bevel.
      float marbleSheen = mix(.75, .94, slabBevel);
      marbleSheen = mix(mix(marbleSheen, .92, dressedBevel), .48, rawCut);
      reflectedLight.indirectSpecular *= mix(marbleSheen, 1.0, inlayMask) * (1.0 - .36 * bed) * (1.0 - .26 * metalLip * inlayMask);
    `);
}

export const windowLimestone = (atlasIndex: number, hover?: IUniform<Float32Array>, index = 0) => (shader: MaterialShader) => {
  addSurfacePosition(shader);
  shader.uniforms.stoneWindowSeed = { value: atlasIndex * 31 };
  if (hover) {
    shader.uniforms.stoneHover = hover;
    shader.uniforms.stoneHoverIndex = { value: index };
  }
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", `#include <common>
      attribute vec3 stoneFinish;
      attribute float stoneBlock;
      varying vec3 vStoneFinish;
      varying vec3 vFramePoint;
      varying float vStoneBlock;
    `)
    .replace("#include <begin_vertex>", `#include <begin_vertex>
      vStoneFinish = stoneFinish;
      vFramePoint = position;
      vStoneBlock = stoneBlock;
    `);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      varying vec3 vStoneFinish;
      varying vec3 vFramePoint;
      varying float vStoneBlock;
      uniform float stoneWindowSeed;
      ${hover ? `uniform float stoneHover[${hover.value.length}]; uniform int stoneHoverIndex;` : ""}
      ${driftNoise}
      float stoneGrain(vec3 p) {
        return .52 * drift(p.xy + p.z * vec2(.48, -.71))
          + .48 * drift(p.yz + p.x * vec2(-.32, .63));
      }
      float blockSeed(float lane) {
        float block = floor(vStoneBlock + .5) + stoneWindowSeed;
        return fract(sin((block + 1.0) * 31.183 + lane * 19.137) * 14497.51);
      }
      mat2 grainRotation(float angle) {
        return mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
      }
      vec3 blockGrainPoint(vec3 point) {
        vec3 seed = vec3(blockSeed(1.0), blockSeed(2.0), blockSeed(3.0));
        point.xy = grainRotation((seed.x - .5) * 2.5) * point.xy;
        point.xz = grainRotation((seed.y - .5) * 3.2) * point.xz;
        return point * mix(vec3(.78), vec3(1.35), seed) + 31.0 * seed;
      }
    `)
    .replace("#include <color_fragment>", `#include <color_fragment>
      float polish = vStoneFinish.x;
      float coarse = vStoneFinish.z;
      // Small contact shadows beneath the sill courses and around the roundel seat.
      float bedJoint = 1.0 - smoothstep(.005, .034,
        min(abs(vFramePoint.y - .225), abs(vFramePoint.y - .371)));
      float roundelRadius = length(vFramePoint.xy - vec2(0.0, ${traceryRoundelCenter.toFixed(3)}));
      float roundelSeat = (1.0 - smoothstep(.008, .048, abs(roundelRadius - .462))) * (1.0 - polish);
      float cavity = clamp(.83 * vStoneFinish.y + .24 * bedJoint + .23 * roundelSeat, 0.0, 1.0);
      float cutFace = smoothstep(.28, .64, cavity) * smoothstep(.40, .59, coarse);
      float honedEdge = smoothstep(.30, .79, polish) * (1.0 - cutFace);
      vec3 blockPoint = blockGrainPoint(vFramePoint);
      float mineralCloud = stoneGrain(blockPoint * 3.15);
      float mineralBed = stoneGrain(blockPoint * vec3(3.0, 14.0, 3.5) + mineralCloud);
      float aggregate = stoneGrain(blockPoint * 13.0);
      float aggregateFade = 1.0 - smoothstep(.38, 1.05, length(fwidth(blockPoint * 13.0)));
      float calcite = smoothstep(.16, .41, aggregate) * aggregateFade;
      float pitField = stoneGrain(blockPoint * 32.0);
      float pits = smoothstep(.12, .39, -pitField + .20 * aggregate)
        * (1.0 - smoothstep(.38, 1.1, length(fwidth(blockPoint * 32.0))));
      // Directional tool marks on the recessed stone.
      vec3 toolPoint = blockPoint * vec3(11.0, 19.0, 6.0) + 1.7 * mineralCloud;
      float tooling = stoneGrain(toolPoint) * (1.0 - smoothstep(.40, 1.1, length(fwidth(toolPoint))));
      float stoneTone = clamp(.19 + .62 * blockSeed(4.0) + .92 * mineralCloud + .24 * mineralBed, 0.0, 1.0);
      vec3 limestone = mix(vec3(.586, .619, .660), vec3(1.15, 1.067, .956), stoneTone);
      vec3 matteTint = limestone * (1.0 + .20 * calcite + .12 * aggregate - .17 * pits);
      vec3 honedTint = limestone * (1.07 + .08 * mineralBed + .050 * calcite);
      vec3 cutTint = limestone * vec3(.80, .817, .844)
        * (.94 + .26 * tooling + .15 * aggregate - .25 * pits + .09 * calcite);
      vec3 finishTint = mix(mix(matteTint, honedTint, honedEdge), cutTint, cutFace);
      diffuseColor.rgb *= finishTint * (1.0 - .11 * cavity);
    `)
    .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      ${hover ? /* glsl */ `
      float edgeLight = mix(.050, .188, honedEdge) * (1.0 - .58 * cavity);
      totalEmissiveRadiance += vec3(1.0, .79, .52) * finishTint *
        edgeLight * stoneHover[stoneHoverIndex];
      ` : ""}
    `)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      float matteRoughness = .81 + .10 * aggregate + .09 * pits;
      float honedRoughness = .54 + .09 * mineralBed;
      float cutRoughness = .94 + .063 * tooling + .075 * pits;
      float limestoneRoughness = mix(mix(matteRoughness, honedRoughness, honedEdge), cutRoughness, cutFace);
      roughnessFactor = clamp(limestoneRoughness, .49, .99);
    `)
    .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      float matteRelief = .0048 * aggregate + .0016 * mineralBed + .0013 * calcite - .0016 * pits;
      float honedRelief = .0008 * mineralBed + .0006 * aggregate;
      float cutRelief = .011 * tooling + .0065 * aggregate - .004 * pits;
      float relief = mix(mix(matteRelief, honedRelief, honedEdge), cutRelief, cutFace);
      vec3 dx = dFdx(vCraftPosition), dy = dFdy(vCraftPosition);
      vec3 n = normalize(vCraftNormal);
      vec3 tangentX = cross(dy, n), tangentY = cross(n, dx);
      float det = dot(dx, tangentX);
      vec3 slope = (dFdx(relief) * tangentX + dFdy(relief) * tangentY) * sign(det) / max(1e-7, abs(det));
      normal = normalize(normal - mat3(viewMatrix) * slope);
    `)
    .replace("#include <aomap_fragment>", `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= 1.0 - .27 * cavity;
      reflectedLight.indirectSpecular *= 1.0 - .35 * cavity;
    `);
};

export function agedBrass(shader: MaterialShader) {
  addSurfacePosition(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${driftNoise}`)
    .replace("#include <color_fragment>", `#include <color_fragment>
      vec3 brassPoint = vCraftPosition;
      float patina = smoothstep(-.36, .31,
        .64 * drift(brassPoint.xz * 2.7 + brassPoint.y * 1.5)
        + .36 * drift(brassPoint.xy * 9.7 + brassPoint.z * 2.3));
      float grain = drift(brassPoint.xz * 17.0 + brassPoint.y * vec2(64.0, 29.0));
      float lip = pow(abs(normalize(vCraftNormal).y), 1.5);
      diffuseColor.rgb *= mix(vec3(.49, .45, .42), vec3(1.04, 1.01, .87), .22 + .58 * patina + .20 * lip);
    `)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + (1.0 - patina) * .24 + .09 * grain - .12 * lip, .20, .73);
    `);
}
