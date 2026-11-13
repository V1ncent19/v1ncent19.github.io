// The visible bounds of the selected artwork, just inside its painted border.
const sourceRows = [
  [39, 439, 453], [60, 410, 478], [100, 356, 531], [150, 302, 580],
  [200, 259, 623], [250, 224, 657], [300, 194, 686], [350, 169, 710],
  [400, 148, 731], [450, 132, 745], [500, 120, 756], [550, 114, 764],
  [600, 109, 768], [650, 106, 769], [750, 105, 769], [900, 105, 770],
  [1200, 104, 772], [1500, 104, 772], [1700, 104, 772], [1732, 105, 772],
];

// The pane is inset behind the face of the stone opening. Its texture extends
// just underneath the reveal, so movement never exposes an empty outline.
export const panel = {
  width: 2.92, height: 5.68, bottom: .04, z: .235,
  baseY: .16, heightScale: 1.3,
  glassTop: 5.32, glassBottom: .53, spring: 3.80, halfWidth: 1.245,
  revealBackZ: -.71, revealHalfWidth: 1.29,
  revealBottom: .35, revealSpring: 3.7, revealControlY: 4.66, revealTop: 5.23,
};

/** @param {number} y */
export function sourceBounds(y) {
  const upperIndex = sourceRows.findIndex(([at]) => at >= y);
  if (upperIndex <= 0) return sourceRows[upperIndex === 0 ? 0 : sourceRows.length - 1].slice(1);
  const [lowerY, lowerX, lowerRight] = sourceRows[upperIndex - 1];
  const [upperY, upperX, upperRight] = sourceRows[upperIndex];
  const ratio = (y - lowerY) / (upperY - lowerY);
  return [lowerX + (upperX - lowerX) * ratio, lowerRight + (upperRight - lowerRight) * ratio];
}

/** @param {number} worldY */
export function panelHalfWidth(worldY) {
  const rise = Math.max(0, (worldY - panel.spring) / (panel.glassTop - panel.spring));
  const t = (1.8 - Math.sqrt(Math.max(0, 1.8 ** 2 - 4 * .35 * 1.45 * rise))) / .7;
  return panel.halfWidth * Math.max(0, 1 - t * t);
}

