import { useParams, Link } from "wouter";
import {
  useGetDataset,
  getGetDatasetQueryKey,
  useAnalyzeDataset,
  getAnalyzeDatasetQueryKey,
  useGetCorrelationMatrix,
  getGetCorrelationMatrixQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import { Brain, ArrowLeft, AlertCircle, TrendingUp } from "lucide-react";

function MetricCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-muted/40 rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-mono font-semibold text-sm">{value}</p>
    </div>
  );
}

function correlationColor(v: number): string {
  const abs = Math.abs(v);
  if (v > 0) {
    const l = Math.round(30 + (1 - abs) * 40);
    return `hsl(243, 75%, ${l}%)`;
  } else {
    const l = Math.round(30 + (1 - abs) * 40);
    return `hsl(0, 72%, ${l}%)`;
  }
}

export default function AnalyzePage() {
  const params = useParams<{ datasetId: string }>();
  const datasetId = params.datasetId;

  const { data: dataset, isLoading: loadingDS, error: dsError } = useGetDataset(datasetId, {
    query: { queryKey: getGetDatasetQueryKey(datasetId), enabled: !!datasetId },
  });
  const { data: analysis, isLoading: loadingAn } = useAnalyzeDataset(datasetId, {
    query: { queryKey: getAnalyzeDatasetQueryKey(datasetId), enabled: !!datasetId },
  });
  const { data: corr, isLoading: loadingCorr } = useGetCorrelationMatrix(datasetId, {
    query: { queryKey: getGetCorrelationMatrixQueryKey(datasetId), enabled: !!datasetId },
  });

  if (dsError) {
    return (
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Dataset not found. It may have been deleted.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {loadingDS ? <Skeleton className="h-7 w-48 inline-block" /> : `Analyze: ${dataset?.filename}`}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Statistical analysis and data exploration
          </p>
        </div>
        {datasetId && (
          <Link href={`/train/${datasetId}`}>
            <Button size="sm" className="gap-2">
              <Brain className="w-4 h-4" /> Train Model
            </Button>
          </Link>
        )}
      </div>

      {/* Dataset overview */}
      {loadingAn ? (
        <div className="grid sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : analysis && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold font-mono">{analysis.totalRows.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">Total Rows</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold font-mono">{analysis.totalColumns}</p><p className="text-xs text-muted-foreground mt-1">Columns</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold font-mono text-chart-1">{analysis.numericColumns.length}</p><p className="text-xs text-muted-foreground mt-1">Numeric Columns</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold font-mono text-chart-2">{analysis.categoricalColumns.length}</p><p className="text-xs text-muted-foreground mt-1">Categorical Columns</p></CardContent></Card>
        </div>
      )}

      {/* Missing values */}
      {analysis && analysis.missingValueSummary.some((m) => m.missing > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-chart-3" /> Missing Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.missingValueSummary
                .filter((m) => m.missing > 0)
                .sort((a, b) => b.percent - a.percent)
                .map((m) => (
                  <div key={m.column} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate shrink-0">{m.column}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-chart-3"
                        style={{ width: `${Math.min(100, m.percent)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-20 text-right shrink-0">
                      {m.missing} ({m.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column stats */}
      {loadingAn ? (
        <Skeleton className="h-64" />
      ) : analysis && analysis.columnStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Column</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Mean</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Median</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Std</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Min</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Max</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Q25</th>
                    <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Q75</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.columnStats.map((s) => (
                    <tr key={s.column} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4 font-medium">{s.column}</td>
                      {[s.mean, s.median, s.std, s.min, s.max, s.q25, s.q75].map((v, i) => (
                        <td key={i} className="py-2 px-3 text-right font-mono text-muted-foreground text-xs">
                          {v === null ? "—" : Number(v).toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histograms */}
      {analysis && analysis.columnStats.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Distributions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.columnStats.slice(0, 6).map((s) => (
              <Card key={s.column}>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{s.column}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-2">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={s.histogram} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="bin" tick={false} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                        formatter={(v: number) => [v, "count"]}
                      />
                      <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sales trend */}
      {analysis && analysis.salesTrend && analysis.salesTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-1" /> Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analysis.salesTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Correlation heatmap */}
      {loadingCorr ? (
        <Skeleton className="h-64" />
      ) : corr && corr.columns.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Correlation Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div style={{ display: "inline-block", minWidth: "100%" }}>
                {/* Header row */}
                <div className="flex">
                  <div style={{ width: 120 }} />
                  {corr.columns.map((col) => (
                    <div key={col} style={{ width: 60, flexShrink: 0 }}
                      className="text-xs text-muted-foreground text-center pb-1 overflow-hidden">
                      <span className="block truncate px-1" title={col}>{col}</span>
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {corr.columns.map((rowCol, i) => (
                  <div key={rowCol} className="flex items-center">
                    <div style={{ width: 120 }} className="text-xs text-muted-foreground text-right pr-2 truncate shrink-0" title={rowCol}>
                      {rowCol}
                    </div>
                    {corr.values[i].map((v, j) => (
                      <div
                        key={j}
                        style={{
                          width: 60, height: 40, flexShrink: 0,
                          background: correlationColor(v),
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        title={`${rowCol} vs ${corr.columns[j]}: ${v.toFixed(3)}`}
                      >
                        <span className="text-white text-xs font-mono font-semibold" style={{ fontSize: 10 }}>
                          {v.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {/* Legend */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-3 rounded" style={{ background: "linear-gradient(to right, hsl(0,72%,30%), hsl(0,72%,70%))" }} />
                    <span className="text-xs text-muted-foreground">Negative correlation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-3 rounded" style={{ background: "linear-gradient(to right, hsl(243,75%,70%), hsl(243,75%,30%))" }} />
                    <span className="text-xs text-muted-foreground">Positive correlation</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
