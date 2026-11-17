import { MathUtils, Vector4 } from "three";

export function createSundialHover(count: number) {
  const inlay = { value: Array.from({ length: count }, () => new Vector4()) };
  const illumination = { value: new Float32Array(count) };
  const windows = Array.from({ length: count }, () => ({ opacity: 0, preview: false, inlayTravel: 0 }));

  function advance(target: number, preview: boolean, reduced: boolean, delta: number, pathLengths: number[]) {
    const step = Math.min(delta, .075);
    windows.forEach((window, index) => {
      const active = target === index;
      const strip = inlay.value[index];
      if (active && window.preview !== preview) {
        window.inlayTravel = 0;
        window.opacity = 0;
        window.preview = preview;
        strip.y = 0;
      }

      const length = pathLengths[index] ?? 0;
      const inlayTime = length ? (window.preview ? .28 + .010 * length : .38 + .030 * length) : 0;
      // Reverse the same path from its current position, fading only at the planter.
      const direction = active ? step / (inlayTime || 1) : -step / .56;
      window.inlayTravel = !length ? 0 : reduced ? Number(active) : MathUtils.clamp(window.inlayTravel + direction, 0, 1);
      const travel = MathUtils.smoothstep(window.inlayTravel, 0, 1);
      const distance = MathUtils.lerp(-.39, length + .68, travel);
      const level = window.preview ? .29 : 1;
      const previousTail = MathUtils.smoothstep(strip.x, -.23, .98);
      const tail = MathUtils.smoothstep(distance, -.23, .98);
      // Apply the change in the fade, so leaving a partial sweep keeps its current brightness.
      const retreat = strip.y * tail / Math.max(.0001, previousTail);
      const intensity = window.inlayTravel === 0 ? 0 : reduced ? level : active ? MathUtils.damp(strip.y, level, 17, step) : retreat;
      const head = 1 - MathUtils.smoothstep(window.inlayTravel, .92, 1);
      strip.set(distance, intensity, Number(!window.preview), head);

      const arrival = length ? MathUtils.smoothstep(distance, Math.max(0, length - 1.9), length + .35) : 1;
      const received = active ? arrival : 0;
      window.opacity = reduced ? Number(active) : MathUtils.damp(window.opacity, received, active ? 6 : 10, step);
      if (window.opacity < .003) window.opacity = 0;
      illumination.value[index] = MathUtils.smoothstep(window.opacity, 0, 1) * (window.preview ? .44 : 1);
    });
  }

  return { inlay, illumination, advance };
}
