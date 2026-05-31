import { Router, type IRouter } from "express";
import multer from "multer";
import { parseCSV } from "../lib/csv-parser.js";
import {
  createDataset,
  getDataset,
  listDatasets,
  deleteDataset,
} from "../lib/storage.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/datasets", (_req, res) => {
  const all = listDatasets().map((d) => ({
    id: d.id,
    filename: d.filename,
    rowCount: d.rows.length,
    columnCount: d.columns.length,
    uploadedAt: d.uploadedAt,
  }));
  res.json(all);
});

router.post("/datasets/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  if (!req.file.originalname.endsWith(".csv")) {
    res.status(400).json({ error: "Only CSV files are supported" });
    return;
  }
  try {
    const { rows, columns } = parseCSV(req.file.buffer);
    const dataset = createDataset(req.file.originalname, rows, columns);
    res.json({
      id: dataset.id,
      filename: dataset.filename,
      rowCount: dataset.rows.length,
      columnCount: dataset.columns.length,
      columns: dataset.columns,
      preview: dataset.rows.slice(0, 10),
      uploadedAt: dataset.uploadedAt,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse CSV";
    res.status(400).json({ error: msg });
  }
});

router.get("/datasets/:datasetId", (req, res) => {
  const dataset = getDataset(req.params.datasetId);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }
  res.json({
    id: dataset.id,
    filename: dataset.filename,
    rowCount: dataset.rows.length,
    columnCount: dataset.columns.length,
    columns: dataset.columns,
    preview: dataset.rows.slice(0, 10),
    uploadedAt: dataset.uploadedAt,
  });
});

router.delete("/datasets/:datasetId", (req, res) => {
  const ok = deleteDataset(req.params.datasetId);
  if (!ok) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }
  res.json({ success: true, message: "Dataset deleted" });
});

router.get("/datasets/:datasetId/analyze", (req, res) => {
  const dataset = getDataset(req.params.datasetId);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }
  const { rows, columns } = dataset;
  const numericCols = columns.filter((c) => c.type === "numeric").map((c) => c.name);
  const categoricalCols = columns.filter((c) => c.type === "categorical").map((c) => c.name);

  const missingValueSummary = columns.map((c) => ({
    column: c.name,
    missing: c.missingCount,
    percent: parseFloat(c.missingPercent.toFixed(2)),
  }));

  const columnStats = numericCols.map((colName) => {
    const vals = rows
      .map((r) => r[colName])
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) {
      return {
        column: colName,
        mean: null,
        median: null,
        std: null,
        min: null,
        max: null,
        q25: null,
        q75: null,
        histogram: [] as { bin: string; count: number }[],
      };
    }
    const sorted = [...vals].sort((a, b) => a - b);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = quantile(sorted, 0.5);
    const q25 = quantile(sorted, 0.25);
    const q75 = quantile(sorted, 0.75);

    const nBins = Math.min(20, Math.ceil(Math.sqrt(vals.length)));
    const binSize = (max - min) / nBins || 1;
    const bins = Array.from({ length: nBins }, (_, i) => {
      const lo = min + i * binSize;
      const hi = lo + binSize;
      const count = vals.filter((v) => v >= lo && (i === nBins - 1 ? v <= hi : v < hi)).length;
      return { bin: `${lo.toFixed(1)}-${hi.toFixed(1)}`, count };
    });

    return {
      column: colName,
      mean: parseFloat(mean.toFixed(4)),
      median: parseFloat(median.toFixed(4)),
      std: parseFloat(std.toFixed(4)),
      min: parseFloat(min.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      q25: parseFloat(q25.toFixed(4)),
      q75: parseFloat(q75.toFixed(4)),
      histogram: bins,
    };
  });

  const dateColCandidate = columns.find(
    (c) => c.type === "datetime" || c.name.toLowerCase().includes("date") || c.name.toLowerCase().includes("month") || c.name.toLowerCase().includes("year")
  );

  let salesTrend: Record<string, unknown>[] = [];
  if (dateColCandidate && numericCols.length > 0) {
    const targetNumeric = numericCols[0];
    salesTrend = rows
      .filter((r) => r[dateColCandidate.name] !== null && r[targetNumeric] !== null)
      .slice(0, 100)
      .map((r) => ({ date: String(r[dateColCandidate.name]), value: r[targetNumeric] }));
  }

  res.json({
    datasetId: dataset.id,
    totalRows: rows.length,
    totalColumns: columns.length,
    numericColumns: numericCols,
    categoricalColumns: categoricalCols,
    missingValueSummary,
    columnStats,
    salesTrend,
  });
});

router.get("/datasets/:datasetId/correlation", (req, res) => {
  const dataset = getDataset(req.params.datasetId);
  if (!dataset) {
    res.status(404).json({ error: "Dataset not found" });
    return;
  }
  const { rows, columns } = dataset;
  const numericCols = columns.filter((c) => c.type === "numeric").map((c) => c.name);

  const colData = numericCols.map((col) =>
    rows.map((r) => (typeof r[col] === "number" ? (r[col] as number) : 0))
  );

  const n = numericCols.length;
  const values: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      values[i][j] = parseFloat(pearsonCorr(colData[i], colData[j]).toFixed(4));
    }
  }

  res.json({ columns: numericCols, values });
});

function quantile(sorted: number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function pearsonCorr(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    da = 0,
    db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

export default router;
