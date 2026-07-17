import { describe, expect, it } from "vitest";
import { hardMatrix } from "./example-matrix";
import { type BinaryCell, generateMaximalSquareTrace } from "./trace";

const containsOnlyOnes = (matrix: readonly (readonly BinaryCell[])[], top: number, left: number, size: number): boolean =>
  Array.from({ length: size }, (_, rowOffset) =>
    Array.from({ length: size }, (_, colOffset) => matrix[top + rowOffset]?.[left + colOffset] === "1").every(Boolean),
  ).every(Boolean);

const bruteForceArea = (matrix: readonly (readonly BinaryCell[])[]): number => {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  let bestArea = 0;

  for (let top = 0; top < rows; top += 1) {
    for (let left = 0; left < cols; left += 1) {
      const maxSize = Math.min(rows - top, cols - left);
      for (let size = 1; size <= maxSize; size += 1) {
        if (containsOnlyOnes(matrix, top, left, size)) bestArea = Math.max(bestArea, size * size);
      }
    }
  }

  return bestArea;
};

const matrixFromMask = (rows: number, cols: number, mask: number): BinaryCell[][] =>
  Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ((mask & (1 << (row * cols + col))) === 0 ? "0" : "1")),
  );

describe("generateMaximalSquareTrace", () => {
  it("finds the 3x3 square and exposes the exact growth dependencies", () => {
    const trace = generateMaximalSquareTrace(hardMatrix);

    expect(trace.result).toEqual({ maxSide: 3, area: 9 });

    const growth = trace.steps.find(
      (step) => step.phase === "record" && step.row === 3 && step.col === 4,
    );

    expect(growth).toMatchObject({
      codeLine: 26,
      cell: "1",
      top: 2,
      left: 2,
      diagonal: 2,
      nextValue: 3,
      maxSide: 3,
    });
  });

  it("rejects a ragged matrix instead of inventing missing cells", () => {
    expect(() =>
      generateMaximalSquareTrace([
        ["1", "1"],
        ["1"],
      ]),
    ).toThrow("Все строки матрицы должны иметь одинаковую длину");
  });

  it("matches a brute-force oracle for every binary matrix up to 3x3", () => {
    let checkedMatrices = 0;

    for (let rows = 1; rows <= 3; rows += 1) {
      for (let cols = 1; cols <= 3; cols += 1) {
        const combinations = 2 ** (rows * cols);
        for (let mask = 0; mask < combinations; mask += 1) {
          const matrix = matrixFromMask(rows, cols, mask);
          expect(generateMaximalSquareTrace(matrix).result.area).toBe(bruteForceArea(matrix));
          checkedMatrices += 1;
        }
      }
    }

    expect(checkedMatrices).toBe(682);
  });
});
