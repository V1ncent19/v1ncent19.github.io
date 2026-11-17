import { sourceBounds } from "./louvre-panel.mjs";

// Source bounds are measured just inside each illustration's painted border.
// Coordinates follow the original image pixels, from top to bottom.
const portoBounds = [
  [40, 439, 504], [100, 365, 579], [175, 294, 648], [275, 221, 717],
  [375, 169, 766], [475, 134, 804], [575, 113, 829], [700, 106, 837],
  [1100, 106, 838], [1596, 106, 838],
];
const fuegoBounds = [
  [40, 355, 452], [125, 249, 550], [225, 165, 630], [325, 105, 690],
  [425, 65, 731], [525, 44, 753], [625, 28, 766], [750, 22, 771],
  [1100, 21, 772], [1650, 21, 774], [1900, 21, 774],
];
const stationBounds = [
  [40, 400, 481], [125, 300, 577], [225, 220, 656], [325, 153, 717],
  [425, 106, 765], [525, 70, 801], [625, 45, 828], [750, 27, 850],
  [900, 22, 859], [1300, 22, 861], [1734, 22, 862],
];

/** @param {number[][]} rows @param {number} y */
function interpolateBounds(rows, y) {
  const upperIndex = rows.findIndex(([at]) => at >= y);
  if (upperIndex <= 0) return rows[upperIndex === 0 ? 0 : rows.length - 1].slice(1);
  const [y0, left0, right0] = rows[upperIndex - 1];
  const [y1, left1, right1] = rows[upperIndex];
  const t = (y - y0) / (y1 - y0);
  return [left0 + (left1 - left0) * t, right0 + (right1 - right0) * t];
}

export const windows = [
  {
    id: "france",
    file: "france-louvre-a.png", top: 39, bottom: 1732, bounds: sourceBounds,
  },
  {
    id: "ptes",
    file: "ptes-porto.png", top: 40, bottom: 1596, bounds: (y) => interpolateBounds(portoBounds, y),
  },
  {
    id: "guatemala",
    file: "guatemala-fuego-b.png", top: 40, bottom: 1900, bounds: (y) => interpolateBounds(fuegoBounds, y),
  },
  {
    id: "anitabi",
    file: "anitabi-station.png", top: 40, bottom: 1734, bounds: (y) => interpolateBounds(stationBounds, y),
  },
];

