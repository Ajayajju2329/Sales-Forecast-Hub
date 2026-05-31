import { DecisionTreeRegressor } from "./decision-tree.js";

export class RandomForestRegressor {
  private trees: DecisionTreeRegressor[] = [];
  private nEstimators: number;
  private maxFeatures: number | null;
  featureImportances: number[] = [];

  constructor(nEstimators = 50, maxFeatures: number | null = null) {
    this.nEstimators = nEstimators;
    this.maxFeatures = maxFeatures;
  }

  train(X: number[][], y: number[]): void {
    const n = X.length;
    const nFeatures = X[0]?.length ?? 0;
    const maxF = this.maxFeatures ?? Math.max(1, Math.round(Math.sqrt(nFeatures)));
    this.trees = [];
    this.featureImportances = new Array(nFeatures).fill(0);

    for (let t = 0; t < this.nEstimators; t++) {
      const bootstrapIdx: number[] = Array.from({ length: n }, () =>
        Math.floor(Math.random() * n)
      );
      const featIdx = sampleFeatures(nFeatures, maxF);

      const XBoot = bootstrapIdx.map((i) => featIdx.map((f) => X[i][f]));
      const yBoot = bootstrapIdx.map((i) => y[i]);

      const tree = new DecisionTreeRegressor(6, 3);
      tree.train(XBoot, yBoot);
      this.trees.push({ tree, featIdx } as unknown as DecisionTreeRegressor);

      for (let f = 0; f < featIdx.length; f++) {
        this.featureImportances[featIdx[f]] += tree.featureImportances[f] ?? 0;
      }
    }

    const total = this.featureImportances.reduce((a, b) => a + b, 0);
    if (total > 0) this.featureImportances = this.featureImportances.map((v) => v / total);
  }

  predict(X: number[][]): number[] {
    return X.map((row) => {
      const preds = this.trees.map((entry) => {
        const { tree, featIdx } = entry as unknown as { tree: DecisionTreeRegressor; featIdx: number[] };
        const subRow = featIdx.map((f) => row[f]);
        return tree.predict([subRow])[0];
      });
      return preds.reduce((a, b) => a + b, 0) / preds.length;
    });
  }
}

function sampleFeatures(total: number, k: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, k).sort((a, b) => a - b);
}
