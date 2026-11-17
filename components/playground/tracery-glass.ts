import * as THREE from "three";
import { panel } from "@/assets-src/playground/louvre-panel.mjs";
import { paneNetwork } from "@/assets-src/playground/pane-network.mjs";
import palettes from "@/content/playground/tracery-palettes.json";
import { traceryOpenings, traceryRoundelCenter } from "./france-window-frame";
import { WINDOW_SCALE, type TravelWindow } from "./sundial-layout";

type Tessera = [x: number, y: number, swatch: number];

const left: Tessera[] = [[-1.19, 6.20, 3], [-1.04, 6.45, 2], [-.87, 6.70, 4], [-.68, 6.94, 1], [-.57, 7.24, 0]];
const petal: Tessera[] = [[.116, .116, 2], [0, .275, 1], [0, .408, 0]];
const roundel: Tessera[] = [[0, traceryRoundelCenter, 3]];
for (const [x, y, swatch] of petal) {
  for (const [u, v] of [[x, y], [-y, x], [-x, -y], [y, -x]]) {
    roundel.push([u, traceryRoundelCenter + v, swatch]);
  }
}
const tesserae: Tessera[][] = [
  roundel,
  left,
  left.map(([x, y, swatch]) => [-x, y + .023, swatch]),
];

const bounds = { left: -1.32, bottom: 5.90, width: 2.64, height: 2.01 };
const pixelWidth = 432;
const pixelHeight = 328;
const colorChannels = ["r", "g", "b"] as const;

function inside(points: THREE.Vector2[], x: number, y: number) {
  let inOpening = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)) {
      inOpening = !inOpening;
    }
  }
  return inOpening;
}

export function createTraceryAtlas(entries: TravelWindow[]) {
  const swatches = palettes as Record<string, string[]>;
  const slots = entries.filter(({ assetId }) => swatches[assetId]);
  const columns = Math.max(1, slots.length);
  const atlasWidth = pixelWidth * columns;
  const pixels = new Uint8Array(atlasWidth * pixelHeight * 4);
  const piecesByPixel = new Int32Array(pixelWidth * pixelHeight);
  const openings = traceryOpenings();
  const colors = slots.map(({ assetId }) => swatches[assetId].map((color) => new THREE.Color(color).convertLinearToSRGB()));
  const lead = new THREE.Color("#52494a").convertLinearToSRGB();

  for (let row = 0; colors.length > 0 && row < pixelHeight; row++) {
    const y = bounds.bottom + (row + .5) * bounds.height / pixelHeight;
    for (let col = 0; col < pixelWidth; col++) {
      const x = bounds.left + (col + .5) * bounds.width / pixelWidth;
      const opening = openings.findIndex((points) => inside(points, x, y));
      if (opening < 0) continue;
      const pieces = tesserae[opening];
      const distance = (i: number) => (x - pieces[i][0]) ** 2 + (y - pieces[i][1]) ** 2;
      let first = 0, second = 1;
      if (distance(second) < distance(first)) [first, second] = [second, first];
      for (let i = 2; i < pieces.length; i++) {
        if (distance(i) < distance(first)) [first, second] = [i, first];
        else if (distance(i) < distance(second)) second = i;
      }
      const a = pieces[first], b = pieces[second];
      const seam = (distance(second) - distance(first)) / (2 * Math.hypot(a[0] - b[0], a[1] - b[1]));
      const glass = THREE.MathUtils.smoothstep(seam, .004, .013);
      const piece = opening * 16 + first;
      piecesByPixel[row * pixelWidth + col] = 2 + piece;
      const localX = x - a[0], localY = y - a[1];
      const roll = localX * 25 + localY * 19 + .91 * piece;
      const ribbon = Math.sin(roll + 1.25 * Math.sin(localY * 33 - localX * 13));
      const grain = 1 + .095 * ribbon + .060 * Math.sin(roll * 2.4 + Math.sin(y * 64) * 1.8)
        + .018 * Math.sin(x * 120 - y * 93);
      const stain = .30 * THREE.MathUtils.smoothstep(-ribbon, .08, .96);
      colors.forEach((palette, layer) => {
        const offset = 4 * (row * atlasWidth + layer * pixelWidth + col);
        const color = palette[a[2]];
        const shadow = palette[5];
        colorChannels.forEach((channel, index) => {
          const glassColor = THREE.MathUtils.lerp(color[channel], shadow[channel], stain) * grain;
          const value = THREE.MathUtils.lerp(lead[channel], glassColor, glass);
          pixels[offset + index] = Math.round(255 * THREE.MathUtils.clamp(value, 0, 1));
        });
        // Alpha stores a piece ID. Zero is outside the frame and one is lead.
        pixels[offset + 3] = glass < .48 ? 1 : 2 + piece;
      });
    }
  }
  const texture = new THREE.DataTexture(pixels, atlasWidth, pixelHeight);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return {
    texture: { value: texture },
    layers: { value: entries.map((entry) => slots.indexOf(entry)) },
    columns,
    enabled: slots.length > 0,
    network: paneNetwork(piecesByPixel, pixelWidth, pixelHeight),
  };
}

export function makeTraceryGlass() {
  const geometry = new THREE.ShapeGeometry(traceryOpenings().map((points) => new THREE.Shape(points)));
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) - bounds.left) / bounds.width, (position.getY(i) - bounds.bottom) / bounds.height);
  }
  return geometry;
}

export function tracerySampling(columns: number) {
  return /* glsl */ `
    uniform sampler2D traceryMap;
    vec2 traceryUV(vec2 point) {
      return (point / ${WINDOW_SCALE.toFixed(5)} - vec2(${bounds.left}, ${bounds.bottom})) / vec2(${bounds.width}, ${bounds.height});
    }
    vec4 tracerySample(vec2 uv, float layer) {
      if (any(lessThan(uv, vec2(0.0))) || any(greaterThanEqual(uv, vec2(1.0)))) return vec4(0.0);
      vec2 at = vec2((uv.x + layer) / ${columns.toFixed(1)}, uv.y);
      ivec2 size = textureSize(traceryMap, 0);
      ivec2 pixel = min(ivec2(at * vec2(size)), size - 1);
      // Keep the lead and phase IDs exact while filtering the visible color.
      return vec4(texture2D(traceryMap, at).rgb, texelFetch(traceryMap, pixel, 0).a);
    }
    vec3 traceryFacet(float id) {
      vec3 detail = fract(id * vec3(.3747, .5731, .7323));
      return vec3(.23, .27, .51) + detail * vec3(.53, .45, .28);
    }
    vec2 traceryPaneUV(vec2 uv) {
      vec2 point = vec2(${bounds.left}, ${bounds.bottom}) + uv * vec2(${bounds.width}, ${bounds.height});
      return point / vec2(${panel.width}, ${(panel.height * panel.heightScale).toFixed(6)})
        + vec2(.5, -${(panel.bottom / panel.height).toFixed(7)});
    }
  `;
}
