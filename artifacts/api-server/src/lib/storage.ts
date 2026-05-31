import { randomUUID } from "crypto";

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ColumnInfo {
  name: string;
  type: "numeric" | "categorical" | "datetime" | "unknown";
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface StoredDataset {
  id: string;
  filename: string;
  rows: ParsedRow[];
  columns: ColumnInfo[];
  uploadedAt: string;
}

export interface StoredModel {
  modelId: string;
  datasetId: string;
  modelType: "linear_regression" | "random_forest" | "decision_tree";
  targetColumn: string;
  featureColumns: string[];
  trainRows: number;
  testRows: number;
  metrics: { r2: number; mae: number; mse: number; rmse: number };
  actualVsPredicted: { index: number; actual: number; predicted: number }[];
  featureImportance: { feature: string; importance: number }[];
  trainedAt: string;
  trainedModel: unknown;
  featureMeans: number[];
  featureStds: number[];
  categoryEncodings: Map<string, Map<string, number>>;
}

const datasets = new Map<string, StoredDataset>();
const models = new Map<string, StoredModel>();

export function createDataset(filename: string, rows: ParsedRow[], columns: ColumnInfo[]): StoredDataset {
  const id = randomUUID();
  const dataset: StoredDataset = { id, filename, rows, columns, uploadedAt: new Date().toISOString() };
  datasets.set(id, dataset);
  return dataset;
}

export function getDataset(id: string): StoredDataset | undefined {
  return datasets.get(id);
}

export function listDatasets(): StoredDataset[] {
  return Array.from(datasets.values());
}

export function deleteDataset(id: string): boolean {
  return datasets.delete(id);
}

export function saveModel(model: StoredModel): void {
  models.set(model.modelId, model);
}

export function getModel(modelId: string): StoredModel | undefined {
  return models.get(modelId);
}

export function listModels(): StoredModel[] {
  return Array.from(models.values());
}

export function deleteModel(modelId: string): boolean {
  return models.delete(modelId);
}
