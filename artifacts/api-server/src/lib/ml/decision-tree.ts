interface TreeNode {
  featureIndex?: number;
  threshold?: number;
  value?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export class DecisionTreeRegressor {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;
  public featureImportances: number[] = [];

  constructor(maxDepth = 8, minSamplesSplit = 5) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  train(X: number[][], y: number[]): void {
    const nFeatures = X[0]?.length ?? 0;
    this.featureImportances = new Array(nFeatures).fill(0);
    const totalVariance = variance(y) * y.length;
    this.root = this.buildTree(X, y, 0, this.featureImportances, totalVariance);
    const total = this.featureImportances.reduce((a, b) => a + b, 0);
    if (total > 0) this.featureImportances = this.featureImportances.map((v) => v / total);
  }

  private buildTree(
    X: number[][],
    y: number[],
    depth: number,
    importances: number[],
    totalVariance: number
  ): TreeNode {
    if (depth >= this.maxDepth || y.length < this.minSamplesSplit || variance(y) < 1e-10) {
      return { value: mean(y) };
    }

    const best = bestSplit(X, y);
    if (!best) return { value: mean(y) };

    const { featureIndex, threshold, leftIdx, rightIdx, impurityReduction } = best;
    importances[featureIndex] += impurityReduction;

    const leftX = leftIdx.map((i) => X[i]);
    const leftY = leftIdx.map((i) => y[i]);
    const rightX = rightIdx.map((i) => X[i]);
    const rightY = rightIdx.map((i) => y[i]);

    return {
      featureIndex,
      threshold,
      left: this.buildTree(leftX, leftY, depth + 1, importances, totalVariance),
      right: this.buildTree(rightX, rightY, depth + 1, importances, totalVariance),
    };
  }

  predict(X: number[][]): number[] {
    return X.map((row) => this.predictRow(row, this.root!));
  }

  private predictRow(row: number[], node: TreeNode): number {
    if (node.value !== undefined) return node.value;
    if (row[node.featureIndex!] <= node.threshold!) {
      return this.predictRow(row, node.left!);
    }
    return this.predictRow(row, node.right!);
  }
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
}

function bestSplit(
  X: number[][],
  y: number[]
): {
  featureIndex: number;
  threshold: number;
  leftIdx: number[];
  rightIdx: number[];
  impurityReduction: number;
} | null {
  const n = y.length;
  const nFeatures = X[0]?.length ?? 0;
  const parentVariance = variance(y);
  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeft: number[] = [];
  let bestRight: number[] = [];

  for (let f = 0; f < nFeatures; f++) {
    const sorted = y.map((_, i) => i).sort((a, b) => X[a][f] - X[b][f]);
    for (let i = 0; i < n - 1; i++) {
      if (X[sorted[i]][f] === X[sorted[i + 1]][f]) continue;
      const threshold = (X[sorted[i]][f] + X[sorted[i + 1]][f]) / 2;
      const leftIdx = sorted.slice(0, i + 1);
      const rightIdx = sorted.slice(i + 1);
      const leftY = leftIdx.map((idx) => y[idx]);
      const rightY = rightIdx.map((idx) => y[idx]);
      const gain =
        parentVariance -
        (leftY.length / n) * variance(leftY) -
        (rightY.length / n) * variance(rightY);
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = threshold;
        bestLeft = leftIdx;
        bestRight = rightIdx;
      }
    }
  }

  if (bestFeature === -1) return null;
  return {
    featureIndex: bestFeature,
    threshold: bestThreshold,
    leftIdx: bestLeft,
    rightIdx: bestRight,
    impurityReduction: bestGain * n,
  };
}
