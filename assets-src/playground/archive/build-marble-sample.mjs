import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Color, surface normals and roughness share the same marble vein field.
const destination = new URL("../../../generated/playground/archive-marble/", import.meta.url);
await mkdir(destination, { recursive: true });
const size = 2048;
const color = Buffer.alloc(size * size * 3);
const relief = Buffer.alloc(size * size);
const roughness = Buffer.alloc(size * size);
const normal = Buffer.alloc(size * size * 3);
const fade = (v) => v * v * (3 - 2 * v);
function hash(x, y) {
  const n = Math.imul(x + 849, 374761393) + Math.imul(y + 19, 668265263);
  return ((Math.imul(n ^ (n >>> 13), 1274126177) ^ (n >>> 7)) >>> 0) / 4294967295;
}
function noise(x, y) {
  const u = Math.floor(x), v = Math.floor(y), fx = fade(x - u), fy = fade(y - v);
  const a = hash(u, v) * (1 - fx) + hash(u + 1, v) * fx;
  const b = hash(u, v + 1) * (1 - fx) + hash(u + 1, v + 1) * fx;
  return a * (1 - fy) + b * fy;
}
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const index = y * size + x;
    const u = x / size, v = y / size;
    const cloud = noise(u * 8.1, v * 8.1);
    const fine = noise(u * 244, v * 244);
    const bend = .43 * noise(u * 4.1, v * 4.3) + .083 * noise(u * 22, v * 22) + .021 * noise(u * 59, v * 59);
    const ribbon = Math.abs(Math.sin((u * 4.6 - v * 3.7 + bend * 5.9) * Math.PI));
    const vein = (.68 * Math.exp(-ribbon * 25) + .32 * Math.exp(-ribbon * 6)) * (.32 + .68 * cloud);
    const white = 239 + (cloud - .5) * 12 + (fine - .5) * 4 - vein * 30;
    color[index * 3] = white + 2;
    color[index * 3 + 1] = white - 1 - vein * 3;
    color[index * 3 + 2] = white - 7 - vein * 5;
    relief[index] = 128 + 24 * (fine - .5) - vein * 22;
    roughness[index] = 161 + (fine - .5) * 24 + (cloud - .5) * 11 + vein * 23;
  }
}
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const index = y * size + x;
    const dx = (relief[y * size + Math.min(x + 2, size - 1)] - relief[y * size + Math.max(0, x - 2)]) * .026;
    const dy = (relief[Math.min(y + 2, size - 1) * size + x] - relief[Math.max(0, y - 2) * size + x]) * .026;
    const length = Math.hypot(dx, dy, 1);
    normal[index * 3] = Math.round(127.5 * (1 - dx / length));
    normal[index * 3 + 1] = Math.round(127.5 * (1 + dy / length));
    normal[index * 3 + 2] = Math.round(127.5 * (1 + 1 / length));
  }
}
const save = (name, data, channels, options) => sharp(data, { raw: { width: size, height: size, channels } })
  .webp(options).toFile(fileURLToPath(new URL(name, destination)));
await Promise.all([
  save("marble.webp", color, 3, { quality: 94 }),
  save("marble-normal.webp", normal, 3, { nearLossless: true, quality: 80 }),
  save("marble-roughness.webp", roughness, 1, { quality: 89 }),
]);
