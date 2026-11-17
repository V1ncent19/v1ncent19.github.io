import { MathUtils, Vector2 } from "three";

export const CHERRY_ANCHOR = .36;
const trunkTrim = .26;
export const CHERRY_CROWN_HEIGHT = 3.88 - trunkTrim;
const SHAKE_FREQUENCY = 8.2;
const SHAKE_DAMPING = 3.8;
export const CHERRY_REBOUND_START = Math.atan(SHAKE_FREQUENCY / SHAKE_DAMPING) / SHAKE_FREQUENCY;

export function cherryTreeHeight(height: number) {
  return height - trunkTrim * MathUtils.smoothstep(height, CHERRY_ANCHOR, 1.66);
}

export function cherryFlex(height: number) {
  return MathUtils.smoothstep(height, CHERRY_ANCHOR, CHERRY_CROWN_HEIGHT);
}

export function createCherryMotion() {
  const impulses: { id: number; time: number; x: number; z: number; strength: number }[] = [];
  const bend = new Vector2();
  let nextId = 0;

  function push(time: number, x: number, z: number, strength: number) {
    impulses.push({ id: ++nextId, time, x, z, strength });
    if (impulses.length > 8) impulses.shift();
  }

  function sample(time: number, output: Vector2) {
    let x = 0, z = 0;
    for (const pulse of impulses) {
      const age = time - pulse.time;
      if (age < 0 || age > 1.45) continue;
      const sway = .29 * pulse.strength * Math.exp(-SHAKE_DAMPING * age) * Math.sin(SHAKE_FREQUENCY * age);
      x += sway * pulse.x;
      z += sway * pulse.z;
    }
    return output.set(x, z).clampLength(0, .22);
  }

  function reset() {
    impulses.length = 0;
    bend.set(0, 0);
  }

  return { bend, impulses, push, sample, reset };
}

export type CherryMotion = ReturnType<typeof createCherryMotion>;

export function createCherrySwipe(x: number, y: number, time: number) {
  const anchor = new Vector2(x, y);
  const last = anchor.clone();
  const direction = new Vector2();
  const delta = new Vector2();
  let started = time;
  let moved = time;
  let fired = -Infinity;

  return (nextX: number, nextY: number, now: number) => {
    if (now - moved > 130) {
      anchor.copy(last);
      direction.set(0, 0);
      started = now;
    }
    moved = now;
    last.set(nextX, nextY);
    delta.subVectors(last, anchor);
    const distance = delta.length();
    const continuing = direction.dot(delta);
    if (continuing > 0) {
      anchor.copy(last);
      started = now;
      return;
    }
    if (distance < 9 || now - fired < 115 || continuing > -.28 * distance && direction.lengthSq() > 0) return;
    const speed = distance / Math.max(25, now - started);
    const strength = .29 + .71 * MathUtils.smoothstep(speed, .07, .60);
    direction.copy(delta).divideScalar(distance);
    anchor.copy(last);
    started = fired = now;
    return { direction, strength };
  };
}
