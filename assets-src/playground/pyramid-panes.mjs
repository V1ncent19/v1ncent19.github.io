/** @param {{apex: number[], left: number[], right: number[], rows: number}} pyramid */
export function pyramidPanes({ apex, left, right, rows }) {
  /** @param {number} row @param {number} col */
  const point = (row, col) => [
    apex[0] + (left[0] - apex[0]) * (row - col) / rows + (right[0] - apex[0]) * col / rows,
    apex[1] + (left[1] - apex[1]) * (row - col) / rows + (right[1] - apex[1]) * col / rows,
  ];
  const panes = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= row; col++) {
      panes.push([point(row, col), point(row + 1, col), point(row + 1, col + 1)]);
      if (col < row) panes.push([point(row, col), point(row, col + 1), point(row + 1, col + 1)]);
    }
  }
  return panes;
}
