/** @typedef {{ x: number, y: number, area: number, neighbors: number[] }} GlassPiece */

/** Extract edge-sharing neighbors from a raster of piece IDs. Zero is lead or exterior.
 * @param {Int32Array} ids @param {number} width @param {number} height
 * @returns {(GlassPiece | null)[]}
 */
export function paneNetwork(ids, width, height) {
  /** @type {{ x: number, y: number, pixels: number, edges: Map<number, number> }[]} */
  const regions = [];
  let total = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = y * width + x;
      const id = ids[at];
      if (id <= 0) continue;
      const region = regions[id] ??= { x: 0, y: 0, pixels: 0, edges: new Map() };
      region.x += x;
      region.y += y;
      region.pixels++;
      total++;
      for (const other of [x + 1 < width ? ids[at + 1] : 0, y + 1 < height ? ids[at + width] : 0]) {
        if (other > 0 && other !== id) region.edges.set(other, (region.edges.get(other) ?? 0) + 1);
      }
    }
  }
  regions.forEach((region, id) => region.edges.forEach((pixels, other) => {
    if (other === id) return;
    // A boundary is counted once in the raster, across either pixel axis.
    if (other > id) {
      const reverse = regions[other].edges.get(id) ?? 0;
      region.edges.set(other, pixels + reverse);
      regions[other].edges.set(id, pixels + reverse);
    } else if (!regions[other].edges.has(id)) regions[other].edges.set(id, pixels);
  }));
  const round = (/** @type {number} */ value) => Number(value.toFixed(6));
  return Array.from(regions, (region) => {
    if (!region) return null;
    return {
      x: round(region.x / region.pixels / width), y: round(1 - region.y / region.pixels / height), area: round(region.pixels / total),
      neighbors: [...region.edges].filter(([other, length]) => length >= Math.max(3, Math.min(10, .13 * Math.sqrt(Math.min(region.pixels, regions[other].pixels)))))
        .map(([other]) => other).sort((a, b) => a - b),
    };
  });
}
