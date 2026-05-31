import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListDatasetsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  BarChart2,
  Brain,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

type ColumnInfo = {
  name: string;
  type: string;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  sampleValues: string[];
};

type DatasetInfo = {
  id: string;
  filename: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnInfo[];
  preview: Record<string, unknown>[];
  uploadedAt: string;
};

const typeColors: Record<string, string> = {
  numeric: "bg-chart-1/15 text-chart-1 border-chart-1/20",
  categorical: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  datetime: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  unknown: "bg-muted text-muted-foreground",
};

export default function UploadPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DatasetInfo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Only CSV files are supported");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/datasets/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data);
      qc.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [qc]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Dataset</h1>
        <p className="text-muted-foreground mt-1">Upload a CSV file to begin analysis and forecasting.</p>
      </div>

      {!result ? (
        <>
          {/* Drop zone */}
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer
              ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <CardContent className="p-12 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors
                ${dragOver ? "bg-primary/20" : "bg-muted"}`}>
                <Upload className={`w-8 h-8 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {uploading ? "Uploading..." : dragOver ? "Drop to upload" : "Drop your CSV file here"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {uploading ? "Parsing and analyzing your data..." : "or click to browse files"}
              </p>
              {!uploading && (
                <Button variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                  <FileText className="w-4 h-4" /> Browse Files
                </Button>
              )}
              {uploading && (
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-48 mx-auto">
                  <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
                </div>
              )}
            </CardContent>
          </Card>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }} />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tips */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Format", desc: "CSV with comma separator, first row as headers" },
              { title: "Size", desc: "Up to 50MB, any number of rows and columns" },
              { title: "Columns", desc: "Mix of numeric and categorical columns supported" },
            ].map(({ title, desc }) => (
              <Card key={title} className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-1">{title}</h4>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Success */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-chart-2/10 border border-chart-2/20">
            <CheckCircle className="w-5 h-5 text-chart-2 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{result.filename} uploaded successfully</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {result.rowCount.toLocaleString()} rows · {result.columnCount} columns detected
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setResult(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Column overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Column Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {result.columns.map((col) => (
                  <div key={col.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{col.name}</p>
                        <Badge className={`text-xs border ${typeColors[col.type] ?? typeColors.unknown} shrink-0`} variant="outline">
                          {col.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {col.uniqueCount} unique
                        {col.missingCount > 0 && ` · ${col.missingPercent.toFixed(1)}% missing`}
                      </p>
                      {col.sampleValues.length > 0 && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          {col.sampleValues.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Data Preview (first 10 rows)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {result.columns.map((c) => (
                        <th key={c.name} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        {result.columns.map((c) => (
                          <td key={c.name} className="px-4 py-2 whitespace-nowrap font-mono text-foreground/80">
                            {row[c.name] === null || row[c.name] === undefined
                              ? <span className="text-muted-foreground/50">—</span>
                              : String(row[c.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Link href={`/analyze/${result.id}`}>
              <Button className="gap-2">
                <BarChart2 className="w-4 h-4" /> Analyze Dataset
              </Button>
            </Link>
            <Link href={`/train/${result.id}`}>
              <Button variant="outline" className="gap-2">
                <Brain className="w-4 h-4" /> Train Model <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setResult(null)} className="gap-2">
              <Upload className="w-4 h-4" /> Upload Another
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
