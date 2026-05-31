import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { getDataset, saveModel, getModel, listModels, deleteModel } from "../lib/storage.js";
import {
  imputeMissing,
  encodeCategorical,
  extractMatrix,
  standardize,
  applyScaling,
  trainTestSplit,
  computeMetrics,
} from "../lib/ml/preprocessing.js";
import { MultipleLinearRegression } from "../lib/ml/linear-regression.js";
import { DecisionTreeRegressor } from "../lib/ml/decision-tree.js";
import { RandomForestRegressor } from "../lib/ml/random-forest.js";

const router: IRouter = Router();

router.get("/models", (_req, res) => {
  const all = listModels().map((m) => ({
    modelId: m.modelId,
    datasetId: m.datasetId,
    modelType: m.modelType,
    targetColumn: m.targetColumn,
    metrics: m.metrics,
    trainedAt: m.trainedAt,
  }));
  res.json(all);
});

router.post("/models/train", (req, res) => {
  const { datasetId, modelType, targetColumn, featureColumns, testSplitRatio = 0.2 } = req.body;

  if (!datasetId || !modelType || !targetColumn || !featureColumns?.length) {
    res.status(400).json({ error: "Missing required fields: datasetId, modelType, targetColumn, featureColumns" });
    return;
  }

  const dataset = getDataset(datasetId);
  if (!dataset) {
    res.status(400).json({ error: "Dataset not found" });
    return;
  }

  const validModels = ["linear_regression", "random_forest", "decision_tree"];
  if (!validModels.includes(modelType)) {
    res.status(400).json({ error: "Invalid modelType" });
    return;
  }

  const allCols = [...featureColumns, targetColumn];
  const missingCols = allCols.filter((c: string) => !dataset.columns.find((col) => col.name === c));
  if (missingCols.length > 0) {
    res.status(400).json({ error: `Columns not found: ${missingCols.join(", ")}` });
    return;
  }

  try {
    let processedRows = imputeMissing(dataset.rows, targetColumn, featureColumns);
    const { rows: encodedRows, encodings } = encodeCategorical(processedRows, featureColumns);
    processedRows = encodedRows;

    const X = extractMatrix(processedRows, featureColumns);
    const y = processedRows.map((r) => (typeof r[targetColumn] === "number" ? (r[targetColumn] as number) : 0));

    if (X.length < 10) {
      res.status(400).json({ error: "Not enough rows to train (minimum 10 required)" });
      return;
    }

    const { XTrain, XTest, yTrain, yTest } = trainTestSplit(X, y, testSplitRatio);

    let scaledTrain = XTrain;
    let scaledTest = XTest;
    let means: number[] = [];
    let stds: number[] = [];
    let featureImportances: number[] = new Array(featureColumns.length).fill(0);

    let predictions: number[];

    if (modelType === "linear_regression") {
      const { scaled, means: m, stds: s } = standardize(XTrain);
      scaledTrain = scaled;
      scaledTest = applyScaling(XTest, m, s);
      means = m;
      stds = s;

      const model = new MultipleLinearRegression();
      model.train(scaledTrain, yTrain);
      predictions = model.predict(scaledTest);

      const coeffs = model.getCoefficients();
      const absSum = coeffs.reduce((a, b) => a + Math.abs(b), 0) || 1;
      featureImportances = coeffs.map((c) => Math.abs(c) / absSum);
    } else if (modelType === "decision_tree") {
      const dt = new DecisionTreeRegressor(8, 5);
      dt.train(XTrain, yTrain);
      predictions = dt.predict(XTest);
      featureImportances = dt.featureImportances;
    } else {
      const rf = new RandomForestRegressor(30);
      rf.train(XTrain, yTrain);
      predictions = rf.predict(XTest);
      featureImportances = rf.featureImportances;
    }

    const metrics = computeMetrics(yTest, predictions);
    const actualVsPredicted = yTest.map((actual, i) => ({
      index: i,
      actual: parseFloat(actual.toFixed(4)),
      predicted: parseFloat(predictions[i].toFixed(4)),
    }));

    const importance = featureColumns.map((f: string, i: number) => ({
      feature: f,
      importance: parseFloat((featureImportances[i] ?? 0).toFixed(4)),
    }));

    const modelId = randomUUID();
    saveModel({
      modelId,
      datasetId,
      modelType,
      targetColumn,
      featureColumns,
      trainRows: XTrain.length,
      testRows: XTest.length,
      metrics: {
        r2: parseFloat(metrics.r2.toFixed(4)),
        mae: parseFloat(metrics.mae.toFixed(4)),
        mse: parseFloat(metrics.mse.toFixed(4)),
        rmse: parseFloat(metrics.rmse.toFixed(4)),
      },
      actualVsPredicted,
      featureImportance: importance,
      trainedAt: new Date().toISOString(),
      trainedModel: null,
      featureMeans: means,
      featureStds: stds,
      categoryEncodings: encodings,
    });

    res.json({
      modelId,
      datasetId,
      modelType,
      targetColumn,
      featureColumns,
      trainRows: XTrain.length,
      testRows: XTest.length,
      metrics: {
        r2: parseFloat(metrics.r2.toFixed(4)),
        mae: parseFloat(metrics.mae.toFixed(4)),
        mse: parseFloat(metrics.mse.toFixed(4)),
        rmse: parseFloat(metrics.rmse.toFixed(4)),
      },
      actualVsPredicted,
      featureImportance: importance,
      trainedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Training failed";
    res.status(400).json({ error: msg });
  }
});

router.get("/models/:modelId", (req, res) => {
  const model = getModel(req.params.modelId);
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.json({
    modelId: model.modelId,
    datasetId: model.datasetId,
    modelType: model.modelType,
    targetColumn: model.targetColumn,
    featureColumns: model.featureColumns,
    trainRows: model.trainRows,
    testRows: model.testRows,
    metrics: model.metrics,
    actualVsPredicted: model.actualVsPredicted,
    featureImportance: model.featureImportance,
    trainedAt: model.trainedAt,
  });
});

router.delete("/models/:modelId", (req, res) => {
  const ok = deleteModel(req.params.modelId);
  if (!ok) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.json({ success: true, message: "Model deleted" });
});

router.post("/models/:modelId/predict", (req, res) => {
  const model = getModel(req.params.modelId);
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  const { features } = req.body;
  if (!features || typeof features !== "object") {
    res.status(400).json({ error: "Missing features object" });
    return;
  }

  const row = model.featureColumns.map((col: string) => {
    const val = features[col];
    if (val === undefined || val === null) return 0;
    if (model.categoryEncodings.has(col)) {
      return model.categoryEncodings.get(col)!.get(String(val)) ?? 0;
    }
    return Number(val) || 0;
  });

  let inputRow = [row];

  if (model.modelType === "linear_regression" && model.featureMeans.length > 0) {
    inputRow = applyScaling(inputRow, model.featureMeans, model.featureStds);
  }

  const dataset = getDataset(model.datasetId);
  if (!dataset) {
    res.status(400).json({ error: "Associated dataset no longer available" });
    return;
  }

  const { rows: encodedRows } = encodeCategorical(dataset.rows.slice(0, 1), model.featureColumns);
  void encodedRows;

  const processedRows = imputeMissing(dataset.rows, model.targetColumn, model.featureColumns);
  const { rows: encoded } = encodeCategorical(processedRows, model.featureColumns);
  const X = extractMatrix(encoded, model.featureColumns);
  const y = encoded.map((r) => (typeof r[model.targetColumn] === "number" ? (r[model.targetColumn] as number) : 0));
  const { XTrain, yTrain } = trainTestSplit(X, y, 0.2);

  let prediction = 0;

  if (model.modelType === "linear_regression") {
    const { scaled, means, stds } = standardize(XTrain);
    const scaledRow = applyScaling(inputRow, means, stds);
    const lr = new MultipleLinearRegression();
    lr.train(scaled, yTrain);
    prediction = lr.predict(scaledRow)[0];
  } else if (model.modelType === "decision_tree") {
    const dt = new DecisionTreeRegressor(8, 5);
    dt.train(XTrain, yTrain);
    prediction = dt.predict(inputRow)[0];
  } else {
    const rf = new RandomForestRegressor(30);
    rf.train(XTrain, yTrain);
    prediction = rf.predict(inputRow)[0];
  }

  res.json({
    prediction: parseFloat(prediction.toFixed(4)),
    modelType: model.modelType,
    targetColumn: model.targetColumn,
    inputFeatures: features,
  });
});

router.get("/models/:modelId/predictions/export", (req, res) => {
  const model = getModel(req.params.modelId);
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  const lines = ["index,actual,predicted"];
  for (const row of model.actualVsPredicted) {
    lines.push(`${row.index},${row.actual},${row.predicted}`);
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="predictions-${model.modelId.slice(0, 8)}.csv"`
  );
  res.send(lines.join("\n"));
});

router.post("/models/compare", (req, res) => {
  const { modelIds } = req.body;
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    res.status(400).json({ error: "modelIds must be a non-empty array" });
    return;
  }

  const models = modelIds
    .map((id: string) => getModel(id))
    .filter(Boolean)
    .map((m) => ({
      modelId: m!.modelId,
      modelType: m!.modelType,
      targetColumn: m!.targetColumn,
      metrics: m!.metrics,
    }));

  res.json({ models });
});

export default router;
