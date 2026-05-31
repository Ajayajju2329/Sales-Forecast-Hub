export class MultipleLinearRegression {
  private weights: number[] = [];

  train(X: number[][], y: number[]): void {
    const n = X.length;
    const p = X[0].length;
    const Xb = X.map((row) => [1, ...row]);
    const cols = p + 1;

    const XtX: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
    const Xty: number[] = new Array(cols).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < cols; j++) {
        Xty[j] += Xb[i][j] * y[i];
        for (let k = 0; k < cols; k++) {
          XtX[j][k] += Xb[i][j] * Xb[i][k];
        }
      }
    }

    const ridge = 1e-6;
    for (let j = 0; j < cols; j++) XtX[j][j] += ridge;

    this.weights = solveLinearSystem(XtX, Xty);
  }

  predict(X: number[][]): number[] {
    return X.map((row) => {
      let val = this.weights[0];
      for (let j = 0; j < row.length; j++) {
        val += this.weights[j + 1] * row[j];
      }
      return val;
    });
  }

  getCoefficients(): number[] {
    return this.weights.slice(1);
  }
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivotRow][col])) pivotRow = row;
    }
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= M[i][j] * x[j];
    }
    x[i] /= M[i][i] || 1;
  }
  return x;
}
