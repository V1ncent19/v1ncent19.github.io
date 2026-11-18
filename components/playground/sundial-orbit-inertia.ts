import { MathUtils, Spherical, Vector2, Vector3, type Camera } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

const coastSeconds = .14;
const releaseWindowMs = 75;
const maxAngularSpeed = 1.4;
const dragSmoothingSeconds = .020;
const maxDragLag = MathUtils.degToRad(1.5);

function shortestTurn(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createOrbitInertia(orbit: OrbitControls) {
  const velocity = new Vector2();
  const offset = new Vector3();
  const displayed = new Spherical();
  const lag = new Vector2();
  let dragging = false;
  let lastSample: { time: number; azimuth: number; polar: number } | null = null;
  let releasedAt: number | null = null;
  let coastElapsed = 0;

  function stop() {
    dragging = false;
    lastSample = null;
    releasedAt = null;
    velocity.set(0, 0);
  }

  function follow(camera: Camera, delta: number) {
    if (dragging) {
      const azimuth = orbit.getAzimuthalAngle();
      const polar = orbit.getPolarAngle();
      displayed.setFromVector3(offset.copy(camera.position).sub(orbit.target));
      lag.set(shortestTurn(displayed.theta - azimuth), displayed.phi - polar)
        .multiplyScalar(Math.exp(-delta / dragSmoothingSeconds))
        .clampLength(0, maxDragLag);
      displayed.set(orbit.getDistance(), polar + lag.y, azimuth + lag.x);
      camera.position.copy(offset.setFromSpherical(displayed)).add(orbit.target);
    } else {
      camera.position.copy(orbit.object.position);
    }
    camera.lookAt(orbit.target);
  }

  function finishDrag(camera: Camera) {
    if (!dragging) return;
    // Start the coast at the displayed orientation, without snapping to the input.
    follow(camera, 0);
    orbit.object.position.copy(camera.position);
    orbit.update();
    dragging = false;
  }

  return {
    stop,
    follow,
    finishDrag,
    begin(time: number) {
      dragging = true;
      lastSample = { time, azimuth: orbit.getAzimuthalAngle(), polar: orbit.getPolarAngle() };
    },
    sample(time: number) {
      if (!dragging) return;
      const azimuth = orbit.getAzimuthalAngle();
      const polar = orbit.getPolarAngle();
      if (lastSample && time > lastSample.time) {
        const turn = azimuth - lastSample.azimuth;
        const dt = Math.max(time - lastSample.time, 4) / 1000;
        // Sample the unsmoothed input camera so release inertia keeps the same response.
        velocity.set(shortestTurn(turn) / dt, (polar - lastSample.polar) / dt);
        velocity.clampLength(0, maxAngularSpeed);
      }
      lastSample = { time, azimuth, polar };
    },
    release(camera: Camera, time: number) {
      finishDrag(camera);
      if (!lastSample || time - lastSample.time >= releaseWindowMs || velocity.lengthSq() < .0025) {
        stop();
        return;
      }
      velocity.multiplyScalar(1 - (time - lastSample.time) / releaseWindowMs);
      lastSample = null;
      releasedAt = time;
      coastElapsed = 0;
    },
    advance(time: number) {
      if (releasedAt === null) return;
      const next = Math.min((time - releasedAt) / 1000, coastSeconds);
      if (next <= coastElapsed) return;
      // Integrate linear deceleration over this frame so the coast has the same length at any refresh rate.
      const step = (next - coastElapsed) * (1 - (next + coastElapsed) / (2 * coastSeconds));
      if (velocity.x) orbit.rotateLeft(-velocity.x * step);
      if (velocity.y) orbit.rotateUp(-velocity.y * step);
      coastElapsed = next;
      if (next === coastSeconds) stop();
    },
  };
}
