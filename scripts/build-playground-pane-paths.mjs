import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { paneNetwork } from "../assets-src/playground/pane-network.mjs";
import { windows } from "../assets-src/playground/window-gallery.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function buildPanePaths() {
  const assets = path.join(root, "public/assets/playground/glass");
  const output = path.join(root, "generated/playground");
  const { data: optics, info } = await sharp(path.join(assets, "gallery-window-optics.png"))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width / windows.length;
  const { height } = info;
  if (!Number.isInteger(width)) throw new Error("The optics atlas does not have equal-width windows");
  const encoded = Buffer.alloc(info.width * height * 3);
  const networks = windows.map(({ id }, layer) => {
    const ids = new Int32Array(width * height);
    const byFacet = new Map();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = y * info.width + layer * width + x;
        const at = pixel * 4;
        if (!optics[at + 3]) continue;
        // The existing optics atlas assigns one RGB facet key to each segmented piece.
        const key = (optics[at] << 16) | (optics[at + 1] << 8) | optics[at + 2];
        let pane = byFacet.get(key);
        if (pane === undefined) {
          pane = byFacet.size + 1;
          byFacet.set(key, pane);
        }
        ids[y * width + x] = pane;
        encoded[pixel * 3] = pane & 255;
        encoded[pixel * 3 + 1] = pane >> 8;
      }
    }
    if (!byFacet.size || byFacet.size > 65535) throw new Error(`Invalid pane count for ${id}`);
    const pieces = paneNetwork(ids, width, height);
    console.log(`[playground] ${id}: ${byFacet.size} panes, ${pieces.filter((piece) => piece?.neighbors.length).length} with neighbors`);
    return { id, pieces };
  });
  await mkdir(output, { recursive: true });
  await Promise.all([
    sharp(encoded, { raw: { width: info.width, height, channels: 3 } }).png({ compressionLevel: 9, palette: false })
      .toFile(path.join(assets, "gallery-window-pane-ids.png")),
    writeFile(path.join(output, "pane-networks.json"), `${JSON.stringify(networks)}\n`),
  ]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPanePaths();
