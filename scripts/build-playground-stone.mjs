import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "assets-src/playground/cloister-limestone.png");
const output = path.join(root, "public/assets/playground");
const width = 768, height = 768;
const albedo = await sharp(source).removeAlpha().resize(width, height).toBuffer();
const detailSize = 512;
const luma = await sharp(albedo).resize(detailSize, detailSize).greyscale().raw().toBuffer();
const smooth = await sharp(luma, { raw: { width: detailSize, height: detailSize, channels: 1 } })
  .blur(2.1).greyscale().raw().toBuffer();
const detail = Buffer.alloc(detailSize * detailSize * 3);
for (let i = 0; i < luma.length; i++) {
  const relief = luma[i] - smooth[i];
  detail[i * 3] = Math.max(0, Math.min(255, Math.round(128 + relief * 3.7 + (smooth[i] - 180) * .26)));
  detail[i * 3 + 1] = Math.max(165, Math.min(253, Math.round(221 - relief * .38 + (smooth[i] - 180) * .32)));
  detail[i * 3 + 2] = 0;
}

await Promise.all([
  sharp(albedo).webp({ quality: 83, effort: 5 }).toFile(path.join(output, "cloister-stone.webp")),
  sharp(detail, { raw: { width: detailSize, height: detailSize, channels: 3 } })
    .webp({ lossless: true, effort: 5 }).toFile(path.join(output, "cloister-stone-detail.webp")),
]);
