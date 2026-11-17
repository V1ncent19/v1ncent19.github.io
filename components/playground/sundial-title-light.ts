import { Color, MathUtils, Quaternion, Vector3 } from "three";

const dawn = new Color("#ffb8d0");
const dusk = new Color("#ffc18e");
const day = new Color("#fff0cb");
const moon = new Color("#a6caff");

export function createSundialTitleLight() {
  const cameraInverse = new Quaternion();
  const screen = new Vector3();
  const tint = new Color();
  let previous = "";

  return (title: HTMLElement, orientation: Quaternion, keyRay: Vector3, sunRay: Vector3, daylight: number, moonlight: number) => {
    // Project the same incoming light as the courtyard into the heading's screen plane.
    screen.copy(keyRay).applyQuaternion(cameraInverse.copy(orientation).invert());
    const lowSun = 1 - MathUtils.smoothstep(sunRay.y, .22, .64);
    const sunlit = daylight > 0;
    const spread = sunlit ? MathUtils.lerp(10, 18, lowSun) : 14;
    const strength = sunlit ? daylight * MathUtils.lerp(.26, .72, lowSun) : .54 * moonlight;
    const morning = MathUtils.smoothstep(sunRay.x, -.18, .18);
    if (sunlit) tint.copy(dusk).lerp(dawn, morning).lerp(day, 1 - lowSun);
    else tint.copy(moon);

    const angle = `${(Math.atan2(-screen.y, screen.x) * MathUtils.RAD2DEG).toFixed(1)}deg`;
    const reach = `${(1.85 * spread * Math.hypot(screen.x, screen.y)).toFixed(1)}px`;
    const opacity = strength.toFixed(3);
    const color = `#${tint.getHexString()}`;
    const current = `${angle} ${reach} ${opacity} ${color}`;
    if (current === previous) return;
    previous = current;
    title.style.setProperty("--vitrail-air-angle", angle);
    title.style.setProperty("--vitrail-air-reach", reach);
    title.style.setProperty("--vitrail-air-strength", opacity);
    title.style.setProperty("--vitrail-air-color", color);
  };
}
