import { parse } from "csv-parse/sync";
import type { ParsedRow, ColumnInfo } from "./storage.js";

function isNumeric(val: string): boolean {
  if (val === "" || val === null || val === undefined) return false;
  return !isNaN(Number(val)) && val.trim() !== "";
}

function isDateLike(val: string): boolean {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime()) && val.length > 4;
}

export function parseCSV(buffer: Buffer): { rows: ParsedRow[]; columns: ColumnInfo[] } {
  const content = buffer.toString("utf-8");
  const rawRows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (rawRows.length === 0) {
    throw new Error("CSV file is empty or has no data rows");
  }

  const colNames = Object.keys(rawRows[0]);
  const columns: ColumnInfo[] = colNames.map((name) => {
    const values = rawRows.map((r) => r[name] ?? "");
    const nonEmpty = values.filter((v) => v !== "" && v !== null && v !== undefined);
    const missingCount = values.length - nonEmpty.length;
    const uniqueValues = Array.from(new Set(nonEmpty));
    const numericCount = nonEmpty.filter(isNumeric).length;
    const dateCount = nonEmpty.filter((v) => !isNumeric(v) && isDateLike(v)).length;

    let type: ColumnInfo["type"] = "unknown";
    if (nonEmpty.length > 0) {
      if (numericCount / nonEmpty.length > 0.8) type = "numeric";
      else if (dateCount / nonEmpty.length > 0.5) type = "datetime";
      else if (uniqueValues.length < nonEmpty.length * 0.5 || uniqueValues.length <= 20) type = "categorical";
      else type = "unknown";
    }

    return {
      name,
      type,
      missingCount,
      missingPercent: values.length > 0 ? (missingCount / values.length) * 100 : 0,
      uniqueCount: uniqueValues.length,
      sampleValues: uniqueValues.slice(0, 5).map(String),
    };
  });

  const rows: ParsedRow[] = rawRows.map((r) => {
    const row: ParsedRow = {};
    for (const col of columns) {
      const v = r[col.name];
      if (v === "" || v === undefined || v === null) {
        row[col.name] = null;
      } else if (col.type === "numeric") {
        row[col.name] = isNumeric(v) ? Number(v) : null;
      } else {
        row[col.name] = v;
      }
    }
    return row;
  });

  return { rows, columns };
}
