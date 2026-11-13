import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { cameraBearing, compassDirection, panBounds } from "./gallery-layout";

const center = new THREE.Vector3(-.3, 2.72, 2.1);
const forward = compassDirection(cameraBearing);
const view = new THREE.Vector3(-forward.x * 25.4, 15.1, -forward.z * 25.4);
const baseDistance = view.length();
const direction = view.clone().normalize();
const back = new THREE.Vector2(direction.x, direction.z).normalize();
const right = new THREE.Vector2(back.y, -back.x);
const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(43 / 2));
export const initialCameraPosition: [number, number, number] = center.clone().add(view).toArray();

function distanceForAspect(aspect: number) {
  return Math.max(baseDistance, 30 / Math.max(.40, aspect));
}

export default function GardenPanCamera({ suppressClick }: { suppressClick: RefObject<boolean> }) {
  const canvas = useThree(({ gl }) => gl.domElement);
  const pan = useRef(new THREE.Vector2());

  useEffect(() => {
    const aim = pan.current;
    let drag: { id: number; x: number; y: number; startX: number; startZ: number; scale: number } | null = null;

    function moveTo(x: number, z: number) {
      aim.set(THREE.MathUtils.clamp(x, panBounds.minX, panBounds.maxX), THREE.MathUtils.clamp(z, panBounds.minZ, panBounds.maxZ));
    }

    function start(event: PointerEvent) {
      if (event.button !== 0 || !event.isPrimary || drag) return;
      const height = Math.max(1, canvas.clientHeight);
      const scale = viewHeight * distanceForAspect(canvas.clientWidth / height) / height;
      suppressClick.current = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: aim.x, startZ: aim.y, scale };
      canvas.setPointerCapture(event.pointerId);
    }

    function move(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!suppressClick.current && dx * dx + dy * dy < 36) return;
      suppressClick.current = true;
      canvas.setAttribute("data-dragging", "");
      const horizontal = dx * drag.scale;
      const depth = dy * drag.scale / direction.y;
      moveTo(drag.startX - horizontal * right.x - depth * back.x, drag.startZ - horizontal * right.y - depth * back.y);
    }

    function finish(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      canvas.removeAttribute("data-dragging");
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }

    function keydown(event: KeyboardEvent) {
      const offset = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!offset) return;
      event.preventDefault();
      moveTo(aim.x + (right.x * offset[0] + back.x * offset[1]) * 1.3,
        aim.y + (right.y * offset[0] + back.y * offset[1]) * 1.3);
    }

    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("aria-label", "Stained-glass garden. Drag or use the arrow keys to pan.");
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    canvas.addEventListener("lostpointercapture", finish);
    canvas.addEventListener("keydown", keydown);
    return () => {
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", finish);
      canvas.removeEventListener("pointercancel", finish);
      canvas.removeEventListener("lostpointercapture", finish);
      canvas.removeEventListener("keydown", keydown);
      canvas.removeAttribute("data-dragging");
      canvas.removeAttribute("data-window-hover");
    };
  }, [canvas, suppressClick]);

  useFrame(({ camera, size }) => {
    const targetX = center.x + pan.current.x;
    const targetZ = center.z + pan.current.y;
    const distance = distanceForAspect(size.width / Math.max(1, size.height));
    camera.position.set(targetX + direction.x * distance, center.y + direction.y * distance, targetZ + direction.z * distance);
    // The eye and its target translate by the same offset, so yaw and pitch stay fixed.
    camera.lookAt(targetX, center.y, targetZ);
  });
  return null;
}
