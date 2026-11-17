import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/addons/postprocessing/Pass.js";
import type { RefObject } from "react";
import type { sundialLayout } from "./sundial-layout";
import { atlas, paneHoverLight, paneProjectionGeometry, windowTransmissionSampling, type SundialLighting } from "./sundial-optics";
import { sundialPanePaths } from "./sundial-pane-paths";
import { tracerySampling } from "./tracery-glass";

const vertex = /* glsl */ `
  varying vec2 at;
  void main() {
    at = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

function scatterShader(count: number, emptyCount: number, tracery: SundialLighting["tracery"]) {
  return /* glsl */ `
    varying vec2 at;
    uniform sampler2D sceneDepth;
    uniform highp sampler2DShadow sunDepth;
    uniform mat4 inverseProjection;
    uniform mat4 cameraWorld;
    uniform mat4 shadowMatrix;
    uniform float shadowBias;
    uniform vec3 keyRay;
    uniform vec3 keyColor;
    uniform vec4 sundialPlanes[${count}];
    uniform float sundialLayers[${count}];
    uniform float sundialHover[${count}];
    uniform float sundialTime;
    uniform float sundialDaylight;
    uniform float sundialMoonlight;
    uniform float clearNoon;
    uniform int preview;
    uniform bool diskAir;
    uniform float diskRadius;
    ${emptyCount ? `uniform vec4 emptyWindowPlanes[${emptyCount}];` : ""}
    uniform sampler2D sundialTrans;
    ${atlas}
    ${sundialPanePaths}
    ${paneProjectionGeometry}
    ${paneHoverLight}
    ${tracery.enabled ? `uniform float traceryLayers[${count}];\n${tracerySampling(tracery.columns)}` : ""}

    ${windowTransmissionSampling(tracery.enabled)}

    float sunlightVisibility(vec3 world) {
      vec4 projected = shadowMatrix * vec4(world, 1.0);
      vec3 coord = projected.xyz / projected.w;
      if (any(lessThan(coord, vec3(0.0))) || any(greaterThan(coord, vec3(1.0)))) return 1.0;
      return texture(sunDepth, vec3(coord.xy, coord.z + shadowBias));
    }

    // These coordinates preserve the window aperture along the directional sunlight.
    vec3 beamSpace(vec3 local, vec3 sun) {
      float distanceToGlass = -local.z / sun.z;
      return vec3(local.xy + sun.xy * distanceToGlass, distanceToGlass);
    }

    vec2 rayInterval(vec3 origin, vec3 direction, vec3 minimum, vec3 maximum, float limit) {
      vec3 inverse = sign(direction + vec3(1e-7)) / max(abs(direction), vec3(1e-6));
      vec3 hitMin = (minimum - origin) * inverse;
      vec3 hitMax = (maximum - origin) * inverse;
      vec3 lo = min(hitMin, hitMax);
      vec3 hi = max(hitMin, hitMax);
      return vec2(max(0.0, max(lo.x, max(lo.y, lo.z))), min(limit, min(hi.x, min(hi.y, hi.z))));
    }

    bool behindGlass(vec2 hit, int index) {
      if (paneOpeningEdge(hit, paneHalfWidthAt(hit.y)) > -.012) return true;
      ${tracery.enabled ? /* glsl */ `
      if (traceryLayers[index] >= 0.0 && hit.y >= glassTop - .15) {
        return tracerySample(traceryUV(hit), traceryLayers[index]).a > .001;
      }` : ""}
      return false;
    }

    float underCanopy(vec3 world) {
      float descent = max(0.0, 3.25 - world.y) / max(.35, keyRay.y);
      vec2 underTree = world.xz + .74 * descent * keyRay.xz;
      float width = 1.0 - smoothstep(1.15, 3.65, length(underTree));
      float height = smoothstep(.24, .92, world.y) * (1.0 - smoothstep(2.45, 4.15, world.y));
      return width * height;
    }

    float daylightInAir(vec3 eye, vec3 direction, float limit, float jitter, float lowSun,
      vec2 windows[${count}], vec3 origins[${count}], vec3 slopes[${count}]) {
      float rim = diskRadius + .72;
      vec2 interval = rayInterval(eye, direction, vec3(-rim, .12, -rim), vec3(rim, 6.2, rim), limit);
      float span = interval.y - interval.x;
      if (span <= 0.0) return 0.0;
      float stride = span / 14.0;
      float transmitted = 0.0;
      float shafts = 0.0;
      float oblique = 1.0 - smoothstep(.55, .76, keyRay.y);
      ${emptyCount ? /* glsl */ `
      vec2 emptyIntervals[${emptyCount}];
      vec3 emptyOrigins[${emptyCount}];
      vec3 emptySlopes[${emptyCount}];
      if (oblique > 0.0) {
        for (int index = 0; index < ${emptyCount}; index++) {
          emptyIntervals[index] = vec2(1.0, -1.0);
          vec4 plane = emptyWindowPlanes[index];
          vec3 sun = paneAxes(keyRay, plane.zw);
          if (abs(sun.z) < .12) continue;
          vec3 origin = beamSpace(paneAxes(eye - vec3(plane.x, 0.0, plane.y), plane.zw), sun);
          vec3 slope = beamSpace(paneAxes(direction, plane.zw), sun);
          emptyIntervals[index] = rayInterval(origin, slope,
            vec3(-1.55, .22, .14), vec3(1.55, frameTop + .08, 6.4), limit);
          emptyOrigins[index] = origin;
          emptySlopes[index] = slope;
        }
      }` : ""}
      for (int stepIndex = 0; stepIndex < 14; stepIndex++) {
        float travel = interval.x + (float(stepIndex) + .23 + .54 * jitter) * stride;
        vec3 world = eye + direction * travel;
        float edge = 1.0 - smoothstep(diskRadius - 1.1, rim, length(world.xz));
        float height = smoothstep(.12, .78, world.y) * (1.0 - smoothstep(4.25, 6.2, world.y));
        float density = edge * height;
        if (density < .004) continue;
        float visible = sunlightVisibility(world);
        if (visible < .005) continue;
        // Colored beams already integrate this transmitted light with their own pane samples.
        bool colored = false;
        for (int index = 0; index < ${count}; index++) {
          vec2 window = windows[index];
          if (travel < window.x || travel > window.y) continue;
          if (behindGlass((origins[index] + slopes[index] * travel).xy, index)) {
            colored = true;
            break;
          }
        }
        if (colored) continue;
        transmitted += density * visible * stride;
        if (oblique <= 0.0) continue;

        // Concentrate a little more mist in the two areas where the shadow detail reads.
        float stronger = 1.12 * underCanopy(world);
        ${emptyCount ? /* glsl */ `
        for (int index = 0; index < ${emptyCount}; index++) {
          vec2 opening = emptyIntervals[index];
          if (travel < opening.x || travel > opening.y) continue;
          vec3 through = emptyOrigins[index] + emptySlopes[index] * travel;
          float width = 1.0 - smoothstep(.65, 1.55, abs(through.x));
          float height = smoothstep(.22, .92, through.y) * (1.0 - smoothstep(frameTop - .38, frameTop + .08, through.y));
          float falloff = smoothstep(.14, .94, through.z) * (1.0 - smoothstep(2.4, 6.4, through.z));
          stronger = max(stronger, width * height * falloff);
        }` : ""}
        shafts += density * stronger * visible * visible * stride;
      }
      float scattering = transmitted * mix(.014, .022, lowSun) * mix(1.0, .57, clearNoon);
      float softMist = .099 * (1.0 - exp(-scattering / .099));
      return softMist + oblique * .145 * (1.0 - exp(-.70 * shafts));
    }

    void main() {
      float depth = texture2D(sceneDepth, at).r;
      vec4 cameraPoint = inverseProjection * vec4(at * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      vec3 surface = cameraPoint.xyz / cameraPoint.w;
      float viewDepth = -surface.z;
      vec3 direction = normalize(mat3(cameraWorld) * surface);
      vec3 eye = cameraWorld[3].xyz;
      float limit = max(0.0, length(surface) - .075);
      float strength = sundialDaylight + .15 * sundialMoonlight;
      if (strength <= 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, viewDepth);
        return;
      }
      float lowSun = 1.0 - smoothstep(.37, .81, keyRay.y);
      float phase = .58 + .57 * pow(.5 + .5 * clamp(dot(direction, keyRay), -1.0, 1.0), 2.0);
      float beamLength = min(10.8, frameTop / max(.16, keyRay.y));
      float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
      bool useDiskAir = diskAir && sundialDaylight > 0.0;
      vec3 scattered = vec3(0.0);
      vec2 windowIntervals[${count}];
      vec3 windowOrigins[${count}];
      vec3 windowSlopes[${count}];
      for (int index = 0; index < ${count}; index++) {
        windowIntervals[index] = vec2(1.0, -1.0);
        vec4 pane = sundialPlanes[index];
        vec3 localRay = paneAxes(keyRay, pane.zw);
        if (abs(localRay.z) < .065) continue;
        vec3 origin = beamSpace(paneAxes(eye - vec3(pane.x, 0.0, pane.y), pane.zw), localRay);
        vec3 slope = beamSpace(paneAxes(direction, pane.zw), localRay);
        vec2 interval = rayInterval(origin, slope,
          vec3(-1.22, glassBottom - .04, .045), vec3(1.22, frameTop + .025, beamLength), limit);
        float lengthInBeam = interval.y - interval.x;
        if (lengthInBeam <= .0) continue;
        if (useDiskAir) {
          windowIntervals[index] = interval;
          windowOrigins[index] = origin;
          windowSlopes[index] = slope;
        }
        float closeView = 1.0 - smoothstep(11.5, 22.0, distance(eye, vec3(pane.x, 2.2, pane.y)));
        float emphasis = closeView * (index == preview ? 1.0 : .40);
        float density = mix(.065, .105, lowSun) + emphasis * mix(.175, .52, lowSun);
        float incidence = smoothstep(.065, .31, abs(localRay.z));
        float stride = lengthInBeam / 10.0;
        for (int stepIndex = 0; stepIndex < 10; stepIndex++) {
          float travel = interval.x + (float(stepIndex) + .35 + .30 * jitter) * stride;
          vec3 world = eye + direction * travel;
          if (world.y < .08) continue;
          vec3 pos = origin + slope * travel;
          vec4 glass = windowTransmission(pos.xy, index);
          if (glass.a < .002) continue;
          float visible = sunlightVisibility(world);
          float envelope = smoothstep(.045, .33, pos.z) * (1.0 - smoothstep(beamLength * .55, beamLength, pos.z));
          float air = .91 + .09 * sin(dot(world, vec3(1.87, 2.65, -1.61)) + sundialTime * .32);
          float fade = exp(-.12 * pos.z) * smoothstep(.08, .46, world.y);
          float brightness = paneHoverGain(glass.rgb, .73 * sundialHover[index], keyRay.y);
          float luma = dot(glass.rgb, glassLuma);
          vec3 color = mix(vec3(luma), glass.rgb, mix(.67, .93, emphasis));
          scattered += color * glass.a * visible * envelope * fade * air * density * incidence * brightness * stride;
        }
      }
      if (useDiskAir) {
        float daylight = daylightInAir(eye, direction, limit, jitter, lowSun, windowIntervals, windowOrigins, windowSlopes);
        scattered += vec3(1.0, .97, .89) * daylight;
      }
      gl_FragColor = vec4(scattered * (phase * strength) * keyColor, viewDepth);
    }
  `;
}

export class SundialScatterPass extends Pass {
  readonly target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  readonly ready = { value: false };
  private readonly material: THREE.ShaderMaterial;
  private readonly quad: FullScreenQuad;
  private readonly select = { value: -1 };

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly light: RefObject<THREE.DirectionalLight | null>,
    optics: SundialLighting,
    layout: Pick<ReturnType<typeof sundialLayout>, "plate" | "spare">,
    diskAir: boolean,
  ) {
    super();
    this.needsSwap = false;
    const emptyPlanes = layout.spare.filter(({ ring }) => ring === 1)
      .map(({ x, z, yaw }) => new THREE.Vector4(x, z, Math.cos(yaw), Math.sin(yaw)));
    this.material = new THREE.ShaderMaterial({
      name: "Sundial window air",
      vertexShader: vertex,
      fragmentShader: scatterShader(optics.layers.value.length, emptyPlanes.length, optics.tracery),
      uniforms: {
        sceneDepth: { value: null }, sunDepth: { value: null },
        inverseProjection: { value: camera.projectionMatrixInverse }, cameraWorld: { value: camera.matrixWorld },
        shadowMatrix: { value: null }, shadowBias: { value: 0 },
        keyColor: { value: new THREE.Color() }, keyRay: optics.keyRay,
        sundialPlanes: optics.planes, sundialLayers: optics.layers, sundialHover: optics.activation.illumination,
        sundialTime: optics.time, sundialTrans: optics.transmission, paneIds: optics.paneIds,
        sundialDaylight: optics.daylight, sundialMoonlight: optics.moonlight,
        clearNoon: optics.clearNoon,
        panePathState: optics.panePaths.texture, traceryMap: optics.tracery.texture, traceryLayers: optics.tracery.layers,
        preview: this.select, diskRadius: { value: layout.plate }, diskAir: { value: diskAir },
        emptyWindowPlanes: { value: emptyPlanes },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  setPreview(index: number) {
    this.select.value = index;
  }

  setSize(width: number, height: number) {
    this.target.setSize(Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(height / 2)));
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const light = this.light.current;
    const sunDepth = light?.shadow.map?.depthTexture;
    this.ready.value = Boolean(sunDepth && readBuffer.depthTexture);
    if (!light || !sunDepth || !readBuffer.depthTexture) return;
    const uniforms = this.material.uniforms;
    uniforms.sceneDepth.value = readBuffer.depthTexture;
    uniforms.sunDepth.value = sunDepth;
    uniforms.shadowMatrix.value = light.shadow.matrix;
    uniforms.shadowBias.value = light.shadow.bias;
    uniforms.keyColor.value.copy(light.color);
    renderer.setRenderTarget(this.target);
    this.quad.render(renderer);
  }

  dispose() {
    this.target.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
