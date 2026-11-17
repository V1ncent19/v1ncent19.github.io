"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CherryTree, StudioEnvironment, SundialEmptyWindow, SundialIsland, SundialWindow, useWindowGeometry } from "./SundialIsland";
import { SundialScatterPass } from "./SundialAtmosphere";
import { SundialSky } from "./SundialSky";
import { makeSundialFloor } from "./sundial-floor";
import { sundialInlay } from "./sundial-inlay";
import { sundialLighting } from "./sundial-optics";
import { createSundialTitleLight } from "./sundial-title-light";
import { createCherryMotion, createCherrySwipe, type CherryMotion } from "./sundial-cherry-motion";
import { PORTAL_DURATION, SUNDIAL_PAVING_INSET, sundialLayout, type Slot, type TravelWindow } from "./sundial-layout";
import { SUNDIAL_EXPOSURE, lightElevation, sundialTimeAt, worldLightSnapshot, type LightLocation, type SundialClock } from "./sundial-world-light";

export interface PortalFlight { index: number; started: number }
export interface SundialSceneProps {
  entries: TravelWindow[];
  selected: number;
  hoverIndex: number;
  flight: PortalFlight | null;
  reduced: boolean;
  lightClock: SundialClock;
  lightLocation: LightLocation;
  titleLightRef: RefObject<HTMLSpanElement | null>;
  interfaceRef: RefObject<HTMLDivElement | null>;
  onHover: (index: number) => void;
  onActivateWindow: (index: number, ready: boolean) => void;
  onStep: (direction: number) => void;
  onReady: () => void;
  onUnavailable: () => void;
}

const textures = ["gallery-window.webp", "gallery-window-optics.png", "gallery-window-light.webp", "gallery-window-pane-ids.png"]
  .map((file) => `/assets/playground/glass/${file}`);
const up = new THREE.Vector3(0, 1, 0);
const menuFocus = new THREE.Vector3(.18, 1.45, 0);
const moonColor = new THREE.Color("#cedeef");
const noonSunColor = new THREE.Color().setRGB(1, .968, .918);
const dayFill = new THREE.Color("#f4f1ef");
const morningFill = new THREE.Color("#f2c5d4");
const nightFill = new THREE.Color("#a1b7d6");
const lightGlideSeconds = 1.15;
const noLightTurn = new THREE.Quaternion();

function createLightGlide(location: LightLocation) {
  return {
    location, time: lightGlideSeconds,
    sunFrom: new THREE.Vector3(), moonFrom: new THREE.Vector3(),
    turn: new THREE.Quaternion(), goal: new THREE.Vector3(),
  };
}

function overview(radius: number) {
  const bearing = Math.PI / 6;
  return new THREE.Vector3(-Math.sin(bearing) * radius * 2.75, radius * 1.35, Math.cos(bearing) * radius * 2.75);
}

function windowPose(slot: Slot, sculpted: boolean) {
  const inward = new THREE.Vector3(-Math.sin(slot.angle), 0, Math.cos(slot.angle));
  const tangent = new THREE.Vector3(Math.cos(slot.angle), 0, Math.sin(slot.angle));
  const target = new THREE.Vector3(slot.x, 2.02, slot.z);
  // The taller carved crest needs a little more room below the heading.
  const focus = target.clone().addScaledVector(up, sculpted ? .48 : 0);
  // Preserve the close-up distance while looking around the crown at the inset slots.
  const outerFraming = THREE.MathUtils.smoothstep(slot.radius, 7.27, 8.35);
  const depth = sculpted ? THREE.MathUtils.lerp(8.18, 9.35, outerFraming) : 7.05;
  const offset = sculpted ? Math.sqrt(9.35 ** 2 + 3.05 ** 2 - depth ** 2) : 3.7;
  const eye = focus.clone().addScaledVector(inward, depth)
    .addScaledVector(tangent, offset).addScaledVector(up, sculpted ? 2.25 : 2.83);
  return { eye, focus, target, inward, tangent };
}

function approachAlongRing(eye: THREE.Vector3, goal: THREE.Vector3, blend: number) {
  const at = Math.atan2(eye.x, eye.z);
  const turn = Math.atan2(goal.x, goal.z) - at;
  const shortest = Math.atan2(Math.sin(turn), Math.cos(turn));
  // Opposite stops are equally close. Always start the half turn in the same direction.
  const step = (Math.abs(shortest) > Math.PI - .0000001 ? Math.PI : shortest) * blend;
  const angle = at + step;
  const radius = THREE.MathUtils.lerp(Math.hypot(eye.x, eye.z), Math.hypot(goal.x, goal.z), blend);
  eye.set(Math.sin(angle) * radius, THREE.MathUtils.lerp(eye.y, goal.y, blend), Math.cos(angle) * radius);
  return step;
}

function createGlide() {
  return { offset: new THREE.Vector3(), speed: new THREE.Vector3(), slope: new THREE.Vector3() };
}

function dampGlide(motion: ReturnType<typeof createGlide>, delta: number) {
  const { offset, speed, slope } = motion;
  const dt = Math.min(delta, .10);
  const stiffness = 8;
  const decay = Math.exp(-stiffness * dt);
  // Critically damped movement carries its speed into the next wheel step.
  slope.copy(speed).addScaledVector(offset, stiffness);
  offset.addScaledVector(slope, dt).multiplyScalar(decay);
  speed.addScaledVector(slope, -stiffness * dt).multiplyScalar(decay);
}

function glideBetweenWindows(eye: THREE.Vector3, goal: THREE.Vector3, delta: number, motion: ReturnType<typeof createGlide>) {
  const bearing = Math.atan2(eye.x, eye.z);
  const goalBearing = Math.atan2(goal.x, goal.z);
  const turn = Math.atan2(Math.sin(bearing - goalBearing), Math.cos(bearing - goalBearing));
  const radius = Math.hypot(goal.x, goal.z);
  const { offset } = motion;
  offset.set(Math.abs(turn) > Math.PI - 1e-7 ? -Math.PI : turn, Math.hypot(eye.x, eye.z) - radius, eye.y - goal.y);
  const previous = offset.x;
  dampGlide(motion, delta);
  const step = offset.x - previous;
  eye.set(Math.sin(bearing + step) * (radius + offset.y), goal.y + offset.z, Math.cos(bearing + step) * (radius + offset.y));
  return step;
}

type CherryInteraction = {
  targets: RefObject<THREE.Group | null>;
  motion: CherryMotion;
  elapsed: RefObject<number>;
};

function wireCanvas(element: HTMLCanvasElement, dragging: RefObject<boolean>, settings: RefObject<SundialSceneProps>, picking: {
  camera: THREE.Camera; scene: THREE.Scene; windows: Slot[]; cherry: CherryInteraction; shaking: RefObject<boolean>;
  refreshHover: (event: PointerEvent) => void;
}) {
  const position = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const screen = new THREE.Vector2();
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3();
  let pointer: number | null = null;
  let swipe: ReturnType<typeof createCherrySwipe> | undefined;
  let suppressDragClick = false;
  let wheel = 0;
  let lastWheel = -1000;
  let lastStep = -1000;

  const canShake = () => !settings.current.reduced && !settings.current.flight && settings.current.selected < 0;
  const hitsCherry = (event: PointerEvent) => {
    const targets = picking.cherry.targets.current;
    if (!targets || !canShake()) return false;
    const rect = element.getBoundingClientRect();
    screen.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
    raycaster.setFromCamera(screen, picking.camera);
    const tree = raycaster.intersectObject(targets, true)[0];
    if (!tree) return false;
    // A flower window in front of the tree keeps its normal pointer behavior.
    raycaster.far = tree.distance;
    const blocked = picking.windows.some(({ id }) => {
      const frame = picking.scene.getObjectByName(`Travel window ${id}`);
      return frame && raycaster.intersectObject(frame, true).length > 0;
    });
    raycaster.far = Infinity;
    return !blocked;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (swipe) { event.stopImmediatePropagation(); return; }
    if (pointer !== null) return;
    suppressDragClick = false;
    dragging.current = false;
    pointer = event.pointerId;
    position.set(event.clientX, event.clientY);
    if (event.button !== 0 || !hitsCherry(event)) return;
    swipe = createCherrySwipe(event.clientX, event.clientY, event.timeStamp);
    suppressDragClick = true;
    picking.shaking.current = true;
    dragging.current = true;
    element.setAttribute("data-dragging", "");
    element.removeAttribute("data-window-hover");
    settings.current.onHover(-1);
    element.setPointerCapture(pointer);
    event.stopImmediatePropagation();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (swipe) {
      event.stopImmediatePropagation();
      if (event.pointerId !== pointer || !canShake()) return;
      const impulse = swipe(event.clientX, event.clientY, event.timeStamp);
      if (!impulse) return;
      const matrix = picking.camera.matrixWorld;
      right.setFromMatrixColumn(matrix, 0).setY(0).normalize();
      forward.setFromMatrixColumn(matrix, 1).setY(0).normalize();
      right.multiplyScalar(impulse.direction.x).addScaledVector(forward, -impulse.direction.y).normalize();
      picking.cherry.motion.push(picking.cherry.elapsed.current, right.x, right.z, impulse.strength);
      return;
    }
    const overTree = pointer === null && hitsCherry(event);
    element.toggleAttribute("data-tree-hover", overTree);
    if (overTree) {
      event.stopImmediatePropagation();
      element.removeAttribute("data-window-hover");
      settings.current.onHover(-1);
      return;
    }
    if (event.pointerId !== pointer || Math.hypot(event.clientX - position.x, event.clientY - position.y) < 5) return;
    dragging.current = true;
    suppressDragClick = true;
    element.setAttribute("data-dragging", "");
    element.removeAttribute("data-window-hover");
    settings.current.onHover(-1);
  };
  const endPointer = () => {
    const captured = pointer;
    pointer = null;
    dragging.current = false;
    if (swipe) {
      swipe = undefined;
      picking.shaking.current = false;
      element.removeAttribute("data-tree-hover");
      if (captured !== null && element.hasPointerCapture(captured)) element.releasePointerCapture(captured);
    }
    element.removeAttribute("data-dragging");
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const overScene = dragging.current && event.type === "pointerup"
      && document.elementFromPoint(event.clientX, event.clientY) === element;
    endPointer();
    if (!overScene) return;
    const overTree = hitsCherry(event);
    element.toggleAttribute("data-tree-hover", overTree);
    if (!overTree) picking.refreshHover(event);
  };
  const onClick = (event: MouseEvent) => {
    // A drag can end with a native click on the canvas even though hover has already resumed.
    if (!suppressDragClick || event.detail === 0) return;
    suppressDragClick = false;
    event.stopImmediatePropagation();
  };
  const onLeave = () => { element.removeAttribute("data-tree-hover"); settings.current.onHover(-1); };
  // OrbitControls owns the wheel for the free camera. A captured tree gesture keeps it still.
  const wheelWhileShaking = (event: WheelEvent) => {
    if (!swipe) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const onWheel = (event: WheelEvent) => {
    const current = settings.current;
    if (current.flight || current.selected < 0 || event.ctrlKey || event.metaKey) {
      wheel = 0;
      return;
    }
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheel > 180) wheel = 0;
    lastWheel = now;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 144 : 1);
    if (Math.sign(wheel) !== Math.sign(delta)) wheel = 0;
    wheel += delta;
    if (Math.abs(wheel) >= 56 && now - lastStep > 415) {
      current.onStep(Math.sign(wheel));
      lastStep = now;
      wheel = 0;
    }
  };
  const onKey = (event: KeyboardEvent) => {
    if (swipe && event.key === "Escape") { endPointer(); return; }
    const current = settings.current;
    if (current.flight || current.selected < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    current.onStep(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
  };
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", "花窗立体场景，预览时可用方向键切换");
  element.addEventListener("pointerdown", onPointerDown, true);
  element.addEventListener("pointermove", onPointerMove, true);
  element.addEventListener("click", onClick, true);
  window.addEventListener("pointerup", onPointerEnd);
  window.addEventListener("pointercancel", onPointerEnd);
  window.addEventListener("blur", endPointer);
  element.addEventListener("lostpointercapture", onPointerEnd);
  element.addEventListener("pointerleave", onLeave);
  element.addEventListener("wheel", wheelWhileShaking, { capture: true, passive: false });
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("keydown", onKey);
  return () => {
    element.removeEventListener("pointerdown", onPointerDown, true);
    element.removeEventListener("pointermove", onPointerMove, true);
    element.removeEventListener("click", onClick, true);
    window.removeEventListener("pointerup", onPointerEnd);
    window.removeEventListener("pointercancel", onPointerEnd);
    window.removeEventListener("blur", endPointer);
    element.removeEventListener("lostpointercapture", onPointerEnd);
    element.removeEventListener("pointerleave", onLeave);
    element.removeEventListener("wheel", wheelWhileShaking, true);
    element.removeEventListener("wheel", onWheel);
    element.removeEventListener("keydown", onKey);
    endPointer();
  };
}

const glassPass = {
  uniforms: {
    tDiffuse: { value: null }, sceneDepth: { value: null }, focusDistance: { value: 10 }, nearPlane: { value: .08 }, farPlane: { value: 150 },
    sharpness: { value: 0 }, flight: { value: 0 }, pixel: { value: new THREE.Vector2() }, origin: { value: new THREE.Vector2(.5, .5) },
    scatteredLight: { value: null }, scatterReady: { value: false },
  },
  vertexShader: /* glsl */ `
    varying vec2 at;
    void main() { at = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D sceneDepth;
    uniform sampler2D scatteredLight;
    uniform bool scatterReady;
    uniform float focusDistance;
    uniform float nearPlane;
    uniform float farPlane;
    uniform float sharpness;
    uniform float flight;
    uniform vec2 pixel;
    uniform vec2 origin;
    varying vec2 at;
    vec3 resolvedAir(vec2 uv, float surfaceDepth) {
      ivec2 size = textureSize(scatteredLight, 0);
      vec2 pixel = uv * vec2(size) - .5;
      vec2 portion = fract(pixel);
      ivec2 base = ivec2(floor(pixel));
      vec3 sum = vec3(0.0);
      float weightSum = .001;
      for (int y = 0; y <= 1; y++) {
        for (int x = 0; x <= 1; x++) {
          vec4 tap = texelFetch(scatteredLight, clamp(base + ivec2(x, y), ivec2(0), size - 1), 0);
          vec2 bilinear = mix(1.0 - portion, portion, vec2(float(x), float(y)));
          float depthWeight = 1.0 - smoothstep(.18, .92, abs(tap.a - surfaceDepth));
          float weight = bilinear.x * bilinear.y * depthWeight;
          sum += tap.rgb * weight;
          weightSum += weight;
        }
      }
      return sum / weightSum;
    }
    void main() {
      vec2 axis = at - origin;
      float r = length(axis);
      float entrance = smoothstep(.24, .96, flight);
      vec2 bend = axis * entrance * (.19 * r + .037 * sin(r * 50.0 - flight * 14.0));
      vec2 sampleAt = at - bend;
      vec3 c = texture2D(tDiffuse, sampleAt).rgb;
      float depth = texture2D(sceneDepth, at).r;
      float viewDistance = nearPlane * farPlane / (farPlane - depth * (farPlane - nearPlane));
      float defocus = smoothstep(.27, .85, abs(viewDistance - focusDistance) / max(focusDistance, 1.0));
      float edge = smoothstep(.23, .50, abs(at.y - origin.y));
      float blur = max(defocus * .55, edge) * sharpness * (1.0 - entrance);
      if (blur > .01) {
        vec2 offset = pixel * mix(1.25, 2.65, blur);
        vec3 soft = texture2D(tDiffuse, sampleAt - offset).rgb + texture2D(tDiffuse, sampleAt + offset).rgb
          + texture2D(tDiffuse, sampleAt + vec2(offset.x, -offset.y)).rgb + texture2D(tDiffuse, sampleAt + vec2(-offset.x, offset.y)).rgb;
        c = mix(c, soft * .25, blur * .68);
      }
      if (scatterReady) c += resolvedAir(at, viewDistance) * (1.0 - entrance);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

function SceneCamera({ props, layout, dragging, previewAtRef, optics, light, treeTargets, shake, elapsed }: {
  props: SundialSceneProps; layout: ReturnType<typeof sundialLayout>; dragging: RefObject<boolean>;
  optics: ReturnType<typeof sundialLighting>; light: RefObject<THREE.DirectionalLight | null>;
  previewAtRef: RefObject<number>;
  treeTargets: CherryInteraction["targets"];
  shake: CherryMotion;
  elapsed: RefObject<number>;
}) {
  const { camera, get, gl, scene, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const shaking = useRef(false);
  const pipeline = useRef<{ composer: EffectComposer; pass: ShaderPass; scatter?: SundialScatterPass } | null>(null);
  const cameraFocus = useRef(menuFocus.clone());
  const viewAmount = useRef(0);
  const menuEye = useRef<THREE.Vector3 | null>(null);
  const from = useRef<{ flight: PortalFlight; eye: THREE.Vector3; focus: THREE.Vector3 } | null>(null);
  const rail = useRef({ stop: -1, linked: false, eye: createGlide(), focus: createGlide() });
  const settings = useRef(props);
  useEffect(() => { settings.current = props; }, [props]);

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enabled = false;
    orbit.enableDamping = true;
    orbit.dampingFactor = .095;
    orbit.enablePan = false;
    orbit.minPolarAngle = .20;
    orbit.maxPolarAngle = 1.32;
    orbit.minDistance = 6.3;
    orbit.maxDistance = layout.island * 4.1;
    orbit.target.copy(cameraFocus.current);
    controls.current = orbit;
    const cherry = { targets: treeTargets, motion: shake, elapsed };
    const refreshHover = (event: PointerEvent) => get().events.handlers?.onPointerMove(event);
    const detach = wireCanvas(gl.domElement, dragging, settings, { camera, scene, windows: layout.slots, cherry, shaking, refreshHover });
    return () => {
      orbit.dispose();
      controls.current = null;
      detach();
    };
  }, [camera, get, gl, scene, layout.island, layout.slots, dragging, treeTargets, shake, elapsed]);

  useEffect(() => {
    const buffer = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, samples: Math.min(4, gl.capabilities.maxSamples),
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    const composer = new EffectComposer(gl, buffer);
    const render = new RenderPass(scene, camera);
    const pass = new ShaderPass(glassPass);
    const scatterMode = new URLSearchParams(window.location.search).get("scatter");
    const scatter = camera instanceof THREE.PerspectiveCamera && scatterMode !== "off"
      ? new SundialScatterPass(camera, light, optics, layout, scatterMode !== "local") : undefined;
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .078, .24, 1.72);
    const output = new OutputPass();
    composer.addPass(render);
    if (scatter) {
      composer.addPass(scatter);
      pass.uniforms.scatteredLight.value = scatter.target.texture;
      pass.uniforms.scatterReady = scatter.ready;
    }
    composer.addPass(bloom);
    composer.addPass(pass);
    composer.addPass(output);
    pipeline.current = { composer, pass, scatter };
    return () => {
      pipeline.current = null;
      composer.dispose();
      render.dispose();
      scatter?.dispose();
      pass.dispose();
      bloom.dispose();
      output.dispose();
    };
  }, [gl, scene, camera, light, optics, layout]);

  useEffect(() => {
    const fx = pipeline.current;
    if (!fx) return;
    fx.composer.setPixelRatio(gl.getPixelRatio());
    fx.composer.setSize(size.width, size.height);
    fx.pass.uniforms.pixel.value.set(1 / (size.width * gl.getPixelRatio()), 1 / (size.height * gl.getPixelRatio()));
  }, [gl, size.width, size.height]);

  const scratch = useMemo(() => ({ aim: new THREE.Vector3(), eye: new THREE.Vector3(), screen: new THREE.Vector3() }), []);
  const updateTitleLight = useMemo(() => createSundialTitleLight(), []);
  const firstFrame = useRef(false);
  const traceryLayers = optics.tracery.layers.value;
  const poses = useMemo(() => layout.windows.map((slot, index) => windowPose(slot, traceryLayers[index] >= 0)), [layout, traceryLayers]);
  const full = useMemo(() => overview(layout.island).multiplyScalar(Math.max(1, 1.24 / (size.width / size.height))), [layout.island, size.width, size.height]);
  useFrame((_, delta) => {
    const orbit = controls.current;
    const fx = pipeline.current;
    const { selected } = props;
    const target = poses[selected];
    let progress = 0;
    const blend = props.reduced ? 1 : 1 - Math.exp(-3.2 * Math.min(delta, .1));
    const railMove = rail.current;

    if (props.flight) {
      railMove.stop = -1;
      railMove.linked = false;
      railMove.eye.speed.set(0, 0, 0);
      railMove.focus.speed.set(0, 0, 0);
    }
    if (props.flight) {
      if (orbit) orbit.enabled = false;
      if (from.current?.flight !== props.flight) from.current = { flight: props.flight, eye: camera.position.clone(), focus: cameraFocus.current.clone() };
      const { target: at, inward, tangent } = poses[props.flight.index];
      progress = THREE.MathUtils.clamp((performance.now() - props.flight.started) / PORTAL_DURATION, 0, 1);
      const approach = at.clone().addScaledVector(inward, 2.4).addScaledVector(tangent, 1.15).addScaledVector(up, .48);
      const through = at.clone().addScaledVector(inward, -.42);
      const settle = THREE.MathUtils.smootherstep(progress, 0, 1);
      const a = scratch.eye.copy(from.current.eye).lerp(approach, settle);
      const b = scratch.aim.copy(approach).lerp(through, settle);
      camera.position.copy(a.lerp(b, settle));
      camera.position.setY(Math.max(1.70, camera.position.y));
      cameraFocus.current.copy(from.current.focus).lerp(at, THREE.MathUtils.smootherstep(progress, 0, .66)).addScaledVector(inward, -.92 * settle);
      camera.lookAt(cameraFocus.current);
    } else if (!shaking.current && !target && orbit?.enabled) {
      from.current = null;
      orbit.enableDamping = !props.reduced;
      orbit.update();
      cameraFocus.current.copy(orbit.target);
      (menuEye.current ??= new THREE.Vector3()).copy(camera.position);
    } else if (!shaking.current) {
      from.current = null;
      if (orbit) orbit.enabled = false;
      const nextEye = target?.eye ?? menuEye.current ?? full;
      const nextFocus = target?.focus ?? menuFocus;
      if (selected !== railMove.stop) {
        railMove.linked = Boolean(target) && railMove.stop >= 0;
        if (!railMove.linked) {
          railMove.eye.speed.set(0, 0, 0);
          railMove.focus.speed.set(0, 0, 0);
        }
        railMove.stop = selected;
      }
      const step = railMove.linked && !props.reduced
        ? glideBetweenWindows(camera.position, nextEye, delta, railMove.eye)
        : approachAlongRing(camera.position, nextEye, blend);
      if (railMove.linked) {
        const angleToGoal = Math.atan2(nextEye.x, nextEye.z) - Math.atan2(camera.position.x, camera.position.z);
        const focusAtThisBearing = scratch.aim.copy(nextFocus).applyAxisAngle(up, -angleToGoal);
        // Carry both the aim and its speed in the rotating frame.
        if (props.reduced) cameraFocus.current.copy(focusAtThisBearing);
        else {
          const focus = railMove.focus;
          focus.speed.applyAxisAngle(up, step);
          focus.offset.copy(cameraFocus.current).applyAxisAngle(up, step).sub(focusAtThisBearing);
          dampGlide(focus, delta);
          cameraFocus.current.copy(focusAtThisBearing).add(focus.offset);
        }
      } else {
        cameraFocus.current.lerp(nextFocus, blend);
      }
      if (!target && orbit && camera.position.distanceToSquared(nextEye) < .003 && cameraFocus.current.distanceToSquared(nextFocus) < .003) {
        camera.position.copy(nextEye);
        cameraFocus.current.copy(nextFocus);
        orbit.target.copy(nextFocus);
        orbit.enabled = true;
      }
      camera.lookAt(cameraFocus.current);
    }
    const viewGoal = target ? 1 : 0;
    const overlay = props.interfaceRef.current;
    if (overlay && !props.flight && !shaking.current && viewAmount.current !== viewGoal) {
      // Advance with the same per-frame blend as the overview camera.
      const amount = THREE.MathUtils.lerp(viewAmount.current, viewGoal, blend);
      viewAmount.current = Math.abs(amount - viewGoal) < .005 ? viewGoal : amount;
      const menu = 1 - THREE.MathUtils.smoothstep(viewAmount.current, .04, .60);
      const preview = THREE.MathUtils.smoothstep(viewAmount.current, .51, .94);
      overlay.style.setProperty("--sundial-menu-opacity", menu.toFixed(3));
      overlay.style.setProperty("--sundial-preview-opacity", preview.toFixed(3));
      overlay.toggleAttribute("data-menu-fading", menu < .15);
      overlay.toggleAttribute("data-preview-fading", preview < .15);
    }
    previewAtRef.current = !props.flight && target
      && camera.position.distanceToSquared(target.eye) < .25 && cameraFocus.current.distanceToSquared(target.focus) < .05
      ? selected : -1;
    if (selected < 0 && props.titleLightRef.current) {
      updateTitleLight(props.titleLightRef.current, camera.quaternion, optics.keyRay.value, optics.ray.value,
        optics.daylight.value, optics.moonlight.value);
    }

    if (fx) {
      fx.scatter?.setPreview(selected);
      const screen = scratch.screen.copy(cameraFocus.current).project(camera);
      fx.pass.uniforms.origin.value.set(.5 + screen.x * .5, .5 + screen.y * .5);
      fx.pass.uniforms.sceneDepth.value = fx.composer.readBuffer.depthTexture;
      fx.pass.uniforms.focusDistance.value = camera.position.distanceTo(cameraFocus.current);
      if (camera instanceof THREE.PerspectiveCamera) {
        fx.pass.uniforms.nearPlane.value = camera.near;
        fx.pass.uniforms.farPlane.value = camera.far;
      }
      fx.pass.uniforms.flight.value = progress;
      fx.pass.uniforms.sharpness.value = props.reduced ? 0 : target ? .74 : .22;
      fx.composer.render(delta);
      if (!firstFrame.current && !gl.getContext().isContextLost()) {
        firstFrame.current = true;
        props.onReady();
      }
    } else {
      gl.render(scene, camera);
    }
  }, 1);
  return null;
}

function SundialContents(props: SundialSceneProps) {
  const images = useLoader(THREE.TextureLoader, textures);
  const layout = useMemo(() => sundialLayout(props.entries), [props.entries]);
  const floor = useMemo(() => makeSundialFloor(layout.plate - SUNDIAL_PAVING_INSET), [layout.plate]);
  const inlay = useMemo(() => sundialInlay(layout), [layout]);
  const optics = useMemo(() => sundialLighting(images, props.entries, layout.windows), [images, props.entries, layout]);
  const light = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const elapsed = useRef(0);
  const lightGlide = useRef(createLightGlide(props.lightLocation));
  const heldLight = useMemo(() => worldLightSnapshot(new Date(props.lightClock.time)).at(props.lightLocation),
    [props.lightClock.time, props.lightLocation]);
  const cherryTargets = useRef<THREE.Group>(null);
  const shake = useMemo(() => createCherryMotion(), []);
  const dragging = useRef(false);
  const previewAtRef = useRef(-1);
  const geometry = useWindowGeometry();
  const { gl, invalidate } = useThree();
  const { onUnavailable } = props;
  useEffect(() => () => floor.dispose(), [floor]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onUnavailable);
    return () => canvas.removeEventListener("webglcontextlost", onUnavailable);
  }, [gl, onUnavailable]);
  useEffect(() => {
    gl.domElement.toggleAttribute("data-window-hover", props.hoverIndex >= 0 && !dragging.current && !props.flight);
    invalidate();
  }, [gl, invalidate, props.hoverIndex, props.flight, props.selected]);
  useEffect(() => () => {
    optics.art.value.dispose();
    optics.facets.value.dispose();
    optics.transmission.value.dispose();
    optics.paneIds.value.dispose();
    optics.panePaths.texture.value.dispose();
    optics.tracery.texture.value.dispose();
  }, [optics]);

  useFrame(({ scene }, delta) => {
    if (!props.reduced) elapsed.current += Math.min(delta, .067);
    const time = elapsed.current;
    optics.setTime(time);
    const target = props.lightClock.runningSince === null ? heldLight
      : worldLightSnapshot(new Date(sundialTimeAt(props.lightClock, performance.now()))).at(props.lightLocation);
    const glide = lightGlide.current;
    if (glide.location !== props.lightLocation) {
      glide.location = props.lightLocation;
      glide.time = optics.ray.value.lengthSq() > 0 ? 0 : lightGlideSeconds;
      glide.sunFrom.copy(optics.ray.value);
      glide.moonFrom.copy(optics.moonRay.value);
    }
    if (props.reduced || glide.time >= lightGlideSeconds) {
      optics.ray.value.set(...target.sun);
      optics.moonRay.value.set(...target.moon);
    } else {
      glide.time = Math.min(lightGlideSeconds, glide.time + Math.min(delta, .1));
      const mix = THREE.MathUtils.smootherstep(glide.time, 0, lightGlideSeconds);
      glide.turn.setFromUnitVectors(glide.sunFrom, glide.goal.set(...target.sun));
      optics.ray.value.copy(glide.sunFrom).applyQuaternion(glide.turn.slerp(noLightTurn, 1 - mix));
      glide.turn.setFromUnitVectors(glide.moonFrom, glide.goal.set(...target.moon));
      optics.moonRay.value.copy(glide.moonFrom).applyQuaternion(glide.turn.slerp(noLightTurn, 1 - mix));
    }
    const sunHeight = lightElevation(optics.ray.value.y);
    const moonHeight = lightElevation(optics.moonRay.value.y);
    const clearNoon = THREE.MathUtils.smoothstep(sunHeight, 18, 27.5);
    const daylight = THREE.MathUtils.smoothstep(sunHeight, 0, 7);
    const dark = 1 - THREE.MathUtils.smoothstep(sunHeight, -12, 1);
    const west = 1 - THREE.MathUtils.smoothstep(optics.ray.value.x, -.18, .18);
    const sunset = west * (1 - THREE.MathUtils.smoothstep(sunHeight, 1, 15));
    const sunrise = (1 - west) * (1 - THREE.MathUtils.smoothstep(sunHeight, 5, 20));
    const moonPhase = (1 - optics.ray.value.dot(optics.moonRay.value)) / 2;
    const moonlight = THREE.MathUtils.smoothstep(moonHeight, 0, 26)
      * (1 - THREE.MathUtils.smoothstep(sunHeight, -7, 0)) * moonPhase * (.5 + .5 * moonPhase);
    const lamps = 1 - THREE.MathUtils.smoothstep(sunHeight, -10, -1);
    const lunarDisc = THREE.MathUtils.smoothstep(moonHeight, -.5, 5) * (.28 + .72 * dark);
    optics.setExteriorLight(daylight, moonlight, lamps, clearNoon, lunarDisc);
    scene.environmentIntensity = THREE.MathUtils.lerp(.45, .17, dark);
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(.16, .065, dark);
    if (hemisphere.current) {
      hemisphere.current.intensity = THREE.MathUtils.lerp(.64, .25, dark);
      hemisphere.current.color.copy(dayFill).lerp(morningFill, .48 * sunrise).lerp(nightFill, dark);
    }
    optics.keyRay.value.copy(daylight > 0 ? optics.ray.value : optics.moonRay.value);
    if (light.current) {
      light.current.position.copy(optics.keyRay.value).multiplyScalar(layout.island * 3.8);
      light.current.shadow.radius = THREE.MathUtils.lerp(2.4, 1.85, clearNoon);
      if (daylight <= 0) {
        // Keep the long shadows legible while the moon grazes the stone at the end of twilight.
        const highMoon = THREE.MathUtils.smoothstep(moonHeight, 18, 43);
        light.current.intensity = THREE.MathUtils.lerp(.93, .63, highMoon) * moonlight;
        light.current.color.copy(moonColor);
      } else {
        light.current.intensity = (2.50 + .62 * clearNoon) * daylight * (1 + .10 * clearNoon);
        const elevation = THREE.MathUtils.lerp(optics.ray.value.y, .81, clearNoon);
        const gold = (1 - sunset) * (1 - .55 * sunrise) * (1 - .5 * THREE.MathUtils.smoothstep(elevation, .53, .81));
        light.current.color.setRGB(1,
          .877 + .070 * elevation - .078 * sunset - .105 * sunrise - .010 * gold,
          .739 + .18 * elevation - .115 * sunset + .042 * sunrise - .034 * gold).lerp(noonSunColor, clearNoon);
      }
    }
    optics.activation.advance(props.flight ? -1 : props.hoverIndex, props.selected >= 0, props.reduced, delta, inlay.lengths);
  }, -1);

  return (
    <>
      <StudioEnvironment />
      <SundialSky islandRadius={layout.island} optics={optics} />
      <ambientLight ref={ambient} color="#eee9e2" intensity={.16} />
      <hemisphereLight ref={hemisphere} color="#f4f1ef" groundColor="#8294ba" intensity={.64} />
      <directionalLight ref={light} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-layout.island * 1.24} shadow-camera-right={layout.island * 1.24}
        shadow-camera-top={layout.island * 1.24} shadow-camera-bottom={-layout.island * 1.24}
        shadow-camera-far={layout.island * 6.6} shadow-normalBias={.021} shadow-bias={-.00018} shadow-radius={2.4} />
      <SundialIsland layout={layout} optics={optics} floor={floor} inlay={inlay} />
      <CherryTree elapsed={elapsed} reduced={props.reduced} optics={optics} floor={floor} shake={shake} targets={cherryTargets} />
      {layout.windows.map((slot, index) => <SundialWindow key={props.entries[index].id} slot={slot} index={index} optics={optics}
        geometry={geometry} hover={props.onHover} activate={(index) => props.onActivateWindow(index, previewAtRef.current === index)} drag={dragging} />)}
      {layout.spare.filter(({ ring }) => ring === 1).map((slot) => (
        <SundialEmptyWindow key={slot.id} slot={slot} seed={layout.slots.indexOf(slot)} geometry={geometry} clearHover={props.onHover} />
      ))}
      <SceneCamera props={props} layout={layout} dragging={dragging} previewAtRef={previewAtRef} optics={optics} light={light}
        treeTargets={cherryTargets} shake={shake} elapsed={elapsed} />
    </>
  );
}

export default function SundialScene(props: SundialSceneProps) {
  const radius = useMemo(() => sundialLayout(props.entries).island, [props.entries]);
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.65]}
      camera={{ position: overview(radius), fov: 38, near: .08, far: radius * 13 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: SUNDIAL_EXPOSURE,
      }}
      fallback={<div className="playground-scene-loading" />}>
      <color attach="background" args={["#948c82"]} />
      <fogExp2 attach="fog" args={["#948c82", .0055]} />
      <Suspense fallback={null}><SundialContents {...props} /></Suspense>
    </Canvas>
  );
}
