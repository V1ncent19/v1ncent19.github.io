import * as THREE from "three";
import type { paneNetwork } from "@/assets-src/playground/pane-network.mjs";
import networks from "@/generated/playground/pane-networks.json";

type Pieces = ReturnType<typeof paneNetwork>;
type Pulse = { pane: number; at: number; rise: number; hold: number; fall: number; peak: number };

function makeTrack(pieces: Pieces, row: number, decorative: boolean) {
  let seed = (row + 1) * 7919;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const minArea = decorative ? .005 : .00068;
  const maxArea = decorative ? .25 : .025;
  const starts = pieces.flatMap((piece, id) => piece && piece.area >= minArea && piece.area <= maxArea
    && piece.neighbors.length > 1 ? [id] : []);
  const lanes = Array.from({ length: starts.length ? decorative ? 2 : 9 : 0 }, (_, index) => ({
    at: .09 + index * (decorative ? .24 : .17) + .25 * random(), origin: -1,
  }));
  let pulses: Pulse[] = [];
  const clockOffset = decorative ? .14 : 0;

  function startPath(at: number, old: number) {
    const candidates = starts.filter((id) => id !== old && !lanes.some((lane) => lane.origin === id));
    const pool = candidates.length ? candidates : starts;
    const root = pool[Math.floor(random() * pool.length)];
    const path = [root];
    const hops = decorative ? 3 + Math.floor(random() * 2) : 4 + Math.floor(random() * 3);
    let moment = at;
    for (let i = 0, id = root; i < hops; i++) {
      const piece = pieces[id]!;
      const previous = i > 0 ? pieces[path[i - 1]] : null;
      const scale = Math.max(.52, 1 - .45 * Math.max(0, (piece.area - .009) / .016));
      pulses.push({ pane: id, at: moment, rise: .24 + .18 * random(), hold: .27 + .21 * random(), fall: .57 + .24 * random(),
        peak: (.66 + .48 * random()) * scale });
      moment += .16 + .12 * random();
      let score = -1, next = -1;
      for (const candidate of piece.neighbors) {
        const neighbor = pieces[candidate];
        if (!neighbor || neighbor.area > maxArea || neighbor.area < minArea * .68 || path.includes(candidate)) continue;
        const visible = THREE.MathUtils.smoothstep(neighbor.area, minArea * .65, minArea * 4);
        const dx = neighbor.x - piece.x, dy = (neighbor.y - piece.y) * 2;
        const px = previous ? piece.x - previous.x : 0, py = previous ? (piece.y - previous.y) * 2 : 0;
        const alignment = (dx * px + dy * py) / Math.max(.000001, Math.hypot(dx, dy) * Math.hypot(px, py));
        const weight = random() + .22 * visible + .27 * alignment;
        if (weight > score) { score = weight; next = candidate; }
      }
      if (next < 0) break;
      id = next;
      path.push(id);
    }
    return root;
  }

  return (time: number, state: Float32Array, stride: number) => {
    for (const lane of lanes) {
      if (time < lane.at) continue;
      lane.origin = startPath(time + clockOffset, lane.origin);
      lane.at = time + (decorative ? 1.68 : 1.20) + 1.24 * random();
    }
    const rowStart = row * stride;
    pulses = pulses.filter(({ at, rise, hold, fall }) => time < at + rise + hold + fall + .34);
    for (const { pane, at, rise, hold, fall, peak } of pulses) {
      const age = time - at;
      const end = rise + hold + fall;
      const glow = THREE.MathUtils.smoothstep(age, 0, rise) * (1 - THREE.MathUtils.smoothstep(age, rise + hold, end));
      const recovery = THREE.MathUtils.smoothstep(age, end - .08, end + .11) * (1 - THREE.MathUtils.smoothstep(age, end + .11, end + .34));
      const value = peak * (glow - .19 * recovery);
      const index = rowStart + pane;
      if (value > 0 ? value > state[index] : state[index] <= 0 && value < state[index]) state[index] = value;
    }
  };
}

export function createPanePaths(tracery: Pieces) {
  const count = networks.length;
  const width = Math.max(tracery.length, 1, ...networks.map(({ pieces }) => pieces.length));
  const state = new Float32Array(width * count * 2);
  const texture = new THREE.DataTexture(state, width, count * 2, THREE.RedFormat, THREE.FloatType);
  texture.needsUpdate = true;
  const tracks = networks.flatMap(({ pieces }, index) => [makeTrack(pieces, index, false), makeTrack(tracery, count + index, true)]);
  let lastTime = 0;
  function advance(time: number) {
    if (lastTime === time) return;
    lastTime = time;
    state.fill(0);
    tracks.forEach((track) => track(time, state, width));
    texture.needsUpdate = true;
  }
  return { texture: { value: texture }, advance };
}

export const sundialPanePaths = /* glsl */ `
  uniform sampler2D paneIds;
  uniform sampler2D panePathState;
  const vec3 glassLuma = vec3(.2126, .7152, .0722);

  int mainPaneId(vec2 at) {
    ivec2 size = textureSize(paneIds, 0);
    ivec2 pixel = clamp(ivec2(at * vec2(size)), ivec2(0), size - 1);
    ivec2 code = ivec2(floor(texelFetch(paneIds, pixel, 0).rg * 255.0 + .5));
    return code.x + 256 * code.y;
  }

  vec3 panePathColor(vec3 color, int id, float layer, bool decorative) {
    if (id < (decorative ? 2 : 1)) return color;
    int row = int(layer) + (decorative ? ${networks.length} : 0);
    float signal = texelFetch(panePathState, ivec2(id, row), 0).r;
    float deep = clamp(signal, 0.0, 1.16);
    float recovery = max(0.0, -signal);
    float luma = dot(color, glassLuma);
    vec3 stained = max(vec3(0.0), mix(vec3(luma), color, 1.0 + .41 * deep));
    return stained * (1.0 - .53 * deep + .12 * recovery);
  }
`;
