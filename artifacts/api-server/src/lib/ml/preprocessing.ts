import type { ParsedRow } from "../storage.js";

export function imputeMissing(
  rows: ParsedRow[],
  targetCol: string,
  featureCols: string[]
): ParsedRow[] {
  const allCols = [...featureCols, targetCol];
  const colMeans: Record<string, number> = {};

  for (const col of allCols) {
    const nums = rows.map((r) => r[col]).filter((v): v is number => typeof v === "number");
    colMeans[col] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  }

  return rows.map((row) => {
    const newRow = { ...row };
    for (const col of allCols) {
      if (newRow[col] === null || newRow[col] === undefined) {
        newRow[col] = colMeans[col] ?? 0;
      }
    }
    return newRow;
  });
}

export function encodeCategorical(
  rows: ParsedRow[],
  featureCols: string[]
): { rows: ParsedRow[]; encodings: Map<string, Map<string, number>> } {
  const encodings = new Map<string, Map<string, number>>();

  const result = rows.map((row) => ({ ...row }));

  for (const col of featureCols) {
    const sample = rows[0]?.[col];
    if (typeof sample === "string") {
      const uniqueVals = Array.from(new Set(rows.map((r) => String(r[col] ?? ""))));
      const mapping = new Map<string, number>();
      uniqueVals.forEach((v, i) => mapping.set(v, i));
      encodings.set(col, mapping);
      for (const row of result) {
        row[col] = mapping.get(String(row[col] ?? "")) ?? 0;
      }
    }
  }

  return { rows: result, encodings };
}

export function extractMatrix(
  rows: ParsedRow[],
  cols: string[]
): number[][] {
  return rows.map((row) => cols.map((c) => (typeof row[c] === "number" ? (row[c] as number) : 0)));
}

export function standardize(
  matrix: number[][]
): { scaled: number[][]; means: number[]; stds: number[] } {
  if (matrix.length === 0) return { scaled: [], means: [], stds: [] };
  const nFeatures = matrix[0].length;
  const means: number[] = new Array(nFeatures).fill(0);
  const stds: number[] = new Array(nFeatures).fill(1);

  for (let j = 0; j < nFeatures; j++) {
    const col = matrix.map((r) => r[j]);
    means[j] = col.reduce((a, b) => a + b, 0) / col.length;
    const variance = col.reduce((sum, v) => sum + (v - means[j]) ** 2, 0) / col.length;
    stds[j] = Math.sqrt(variance) || 1;
  }

  const scaled = matrix.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
  return { scaled, means, stds };
}

export function applyScaling(matrix: number[][], means: number[], stds: number[]): number[][] {
  return matrix.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));
}

export function trainTestSplit(
  X: number[][],
  y: number[],
  testRatio = 0.2
): { XTrain: number[][]; XTest: number[][]; yTrain: number[]; yTest: number[] } {
  const n = X.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const splitAt = Math.floor(n * (1 - testRatio));
  const trainIdx = indices.slice(0, splitAt);
  const testIdx = indices.slice(splitAt);

  return {
    XTrain: trainIdx.map((i) => X[i]),
    XTest: testIdx.map((i) => X[i]),
    yTrain: trainIdx.map((i) => y[i]),
    yTest: testIdx.map((i) => y[i]),
  };
}

export function computeMetrics(actual: number[], predicted: number[]) {
  const n = actual.length;
  const mae = actual.reduce((sum, a, i) => sum + Math.abs(a - predicted[i]), 0) / n;
  const mse = actual.reduce((sum, a, i) => sum + (a - predicted[i]) ** 2, 0) / n;
  const rmse = Math.sqrt(mse);
  const meanActual = actual.reduce((a, b) => a + b, 0) / n;
  const ssTot = actual.reduce((sum, a) => sum + (a - meanActual) ** 2, 0);
  const ssRes = actual.reduce((sum, a, i) => sum + (a - predicted[i]) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { r2, mae, mse, rmse };
}
