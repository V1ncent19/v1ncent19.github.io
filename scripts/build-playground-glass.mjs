// Register the selected artwork to the window and derive matching material maps.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { panel, panelHalfWidth } from "../assets-src/playground/louvre-panel.mjs";
import { windows } from "../assets-src/playground/window-gallery.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(root, "assets-src/playground");
const output = path.join(root, "public/assets/playground");
const width = 887;
const height = 1774;
const pixels = width * height;

async function buildWindow(window) {
  const { data: source, info } = await sharp(path.join(input, window.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const artwork = Buffer.alloc(pixels * 4);
  const luminance = new Uint8Array(pixels);

  for (let y = 0; y < height; y++) {
    const worldY = panel.bottom + (1 - (y + .5) / height) * panel.height;
    if (worldY < panel.glassBottom || worldY > panel.glassTop) continue;
    const halfWidth = panelHalfWidth(worldY);
    const sourceY = window.top + (panel.glassTop - worldY) * (window.bottom - window.top) / (panel.glassTop - panel.glassBottom);
    const [left, right] = window.bounds(sourceY);
    const topRow = Math.floor(sourceY);
    const dy = sourceY - topRow;
    for (let x = 0; x < width; x++) {
      const worldX = ((x + .5) / width - .5) * panel.width;
      if (Math.abs(worldX) >= halfWidth) continue;
      const sourceX = left + (worldX / halfWidth + 1) * .5 * (right - left);
      const leftColumn = Math.floor(sourceX);
      const dx = sourceX - leftColumn;
      const at = (topRow * info.width + leftColumn) * 3;
      const nextRow = at + info.width * 3;
      const pixel = y * width + x;
      const out = pixel * 4;
      for (let channel = 0; channel < 3; channel++) {
        const upper = source[at + channel] * (1 - dx) + source[at + 3 + channel] * dx;
        const lower = source[nextRow + channel] * (1 - dx) + source[nextRow + 3 + channel] * dx;
        artwork[out + channel] = Math.round(upper * (1 - dy) + lower * dy);
      }
      artwork[out + 3] = 255;
      const red = artwork[out], green = artwork[out + 1], blue = artwork[out + 2];
      const luma = .213 * red + .715 * green + .072 * blue;
      // Dark saturated blue glass needs the blue channel to resolve its seams.
      luminance[pixel] = window.id === "guatemala" ? .42 * luma + .58 * Math.max(red, green, blue) : luma;
    }
  }

  // A lead seam is a narrow dark ridge with brighter glass on both sides.
  // Requiring both shoulders avoids treating whole dark roofs as opaque lead.
  const lead = new Uint8Array(pixels);
  const ridge = new Uint8Array(pixels);
  const directions = [1, width, width + 1, width - 1];
  for (let y = 9; y < height - 9; y++) {
    for (let x = 9; x < width - 9; x++) {
      const i = y * width + x;
      const center = luminance[i];
      if (!artwork[i * 4 + 3] || center > 182) continue;
      let contrast = 0;
      for (const d of directions) {
        const low = (luminance[i - d * 3] + luminance[i - d * 6]) * .5;
        const high = (luminance[i + d * 3] + luminance[i + d * 6]) * .5;
        contrast = Math.max(contrast, Math.min(low, high) - center);
      }
      const response = (contrast - center * .075 - 4) / 29;
      ridge[i] = Math.round(Math.max(0, Math.min(1, response)) * 255);
      if (response > .10) lead[i] = 1;
    }
  }

  function morphology(data, radius, expand) {
    const output = new Uint8Array(pixels);
    const horizontal = new Uint8Array(pixels);
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const i = y * width + x;
        let value = expand ? 0 : 1;
        for (let d = -radius; d <= radius; d++) {
          value = expand ? value | data[i + d] : value & data[i + d];
        }
        horizontal[i] = value;
      }
    }
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const i = y * width + x;
        let value = expand ? 0 : 1;
        for (let d = -radius; d <= radius; d++) {
          value = expand ? value | horizontal[i + d * width] : value & horizontal[i + d * width];
        }
        output[i] = value;
      }
    }
    return output;
  }

  const closed = morphology(morphology(lead, 4, true), 4, false);
  const labels = new Int32Array(pixels);
  const queue = new Int32Array(pixels);
  const offsets = [-1, 1, -width, width];
  const areas = [];
  for (let start = 0; start < pixels; start++) {
    if (labels[start] || closed[start] || !artwork[start * 4 + 3]) continue;
    const pane = areas.length + 1;
    let tail = 1;
    labels[start] = pane;
    queue[0] = start;
    for (let head = 0; head < tail; head++) {
      const at = queue[head];
      for (const offset of offsets) {
        const next = at + offset;
        if (labels[next] || closed[next] || !artwork[next * 4 + 3]) continue;
        labels[next] = pane;
        queue[tail++] = next;
      }
    }
    if (tail >= 85) areas.push(tail);
    else for (let index = 0; index < tail; index++) labels[queue[index]] = -1;
  }
  if (!areas.length) throw new Error(`No glass panes detected in ${window.file}`);

  // Extend each pane to its lead edge and absorb tiny flecks in the glass.
  let tail = 0;
  for (let i = 0; i < pixels; i++) {
    if (labels[i] > 0) queue[tail++] = i;
  }
  for (let head = 0; head < tail; head++) {
    const at = queue[head];
    for (const offset of offsets) {
      const next = at + offset;
      if (labels[next] > 0 || !artwork[next * 4 + 3]) continue;
      labels[next] = labels[at];
      queue[tail++] = next;
    }
  }

  const tilt = areas.map((_, i) => [
    Math.round(128 + Math.sin((i + 1) * 2.399) * 73),
    Math.round(128 + Math.cos((i + 1) * 1.737) * 62),
    Math.round(127 + (Math.sin((i + 1) * 1.194) * .5 + .5) * 83),
  ]);
  const optics = Buffer.alloc(pixels * 4);
  const transmission = Buffer.alloc(pixels * 4);
  const paneColours = areas.map(() => [0, 0, 0, 0]);
  for (let i = 0; i < pixels; i++) {
    const colour = paneColours[labels[i] - 1];
    if (!colour || ridge[i] > 120) continue;
    const out = i * 4;
    for (let channel = 0; channel < 3; channel++) colour[channel] += artwork[out + channel];
    colour[3]++;
  }
  for (let i = 0; i < pixels; i++) {
    const index = labels[i] - 1;
    const pane = tilt[index];
    if (!pane) continue;
    const out = i * 4;
    const atBoundary = offsets.some((offset) => labels[i + offset] !== labels[i]);
    const leadStrength = ridge[i] / 255 * (atBoundary ? .92 : .62);
    optics.set(pane, out);
    optics[out + 3] = Math.round(255 * (1 - leadStrength));
    const colour = paneColours[index];
    for (let channel = 0; channel < 3; channel++) {
      const average = colour[3] ? colour[channel] / colour[3] : artwork[out + channel];
      transmission[out + channel] = Math.round(.82 * average + .18 * artwork[out + channel]);
    }
    // Keep the projected seam visible while leaving softer texture ridges inside each pane.
    const nearBoundary = offsets.some((offset) => labels[i + 3 * offset] !== labels[i]);
    const boundaryShadow = atBoundary ? .62 : nearBoundary ? .40 : 0;
    const shadow = Math.max(leadStrength, boundaryShadow + ridge[i] / 255 * .24);
    transmission[out + 3] = Math.round(255 * (1 - shadow));
  }

  console.log("%s: %d glass regions (largest %s%%).", window.title, areas.length,
    (100 * Math.max(...areas) / areas.reduce((sum, area) => sum + area)).toFixed(1));
  return { artwork, optics, transmission };
}

const atlasWidth = width * windows.length;
const raw = { width: atlasWidth, height, channels: 4 };
const atlases = {
  artwork: Buffer.alloc(atlasWidth * height * 4),
  optics: Buffer.alloc(atlasWidth * height * 4),
  transmission: Buffer.alloc(atlasWidth * height * 4),
};
await mkdir(output, { recursive: true });
// One horizontal slot per window. All three maps use identical UVs.
for (const [index, window] of windows.entries()) {
  const maps = await buildWindow(window);
  for (const [name, atlas] of Object.entries(atlases)) {
    for (let row = 0; row < height; row++) {
      maps[name].copy(atlas, (row * atlasWidth + index * width) * 4,
        row * width * 4, (row + 1) * width * 4);
    }
  }
}
await Promise.all([
  sharp(atlases.artwork, { raw }).webp({ quality: 95, effort: 6 }).toFile(path.join(output, "gallery-window.webp")),
  sharp(atlases.optics, { raw }).png({ compressionLevel: 9 }).toFile(path.join(output, "gallery-window-optics.png")),
  sharp(atlases.transmission, { raw }).webp({ quality: 94, alphaQuality: 100 }).toFile(path.join(output, "gallery-window-light.webp")),
]);
