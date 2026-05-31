import { useState } from "react";
import { Link } from "wouter";
import {
  useListModels,
  useCompareModels,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from "recharts";
import { ArrowLeft, GitCompare, AlertCircle, Brain } from "lucide-react";

function modelTypeLabel(t: string) {
  if (t === "linear_regression") return "Linear Reg.";
  if (t === "random_forest") return "Random Forest";
  if (t === "decision_tree") return "Decision Tree";
  return t;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function ComparePage() {
  const { data: models, isLoading } = useListModels();
  const compareMut = useCompareModels();
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<{ modelId: string; modelType: string; targetColumn: string; metrics: { r2: number; mae: number; mse: number; rmse: number } }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleCompare() {
    if (selected.length < 2) { setError("Select at least 2 models to compare"); return; }
    setError(null);
    compareMut.mutate(
      { data: { modelIds: selected } },
      {
        onSuccess: (res) => setResults(res.models as typeof results),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : "Comparison failed"),
      }
    );
  }

  const r2Data = results?.map((m, i) => ({
    name: `${modelTypeLabel(m.modelType)} (${m.targetColumn})`,
    r2: m.metrics.r2,
    fill: COLORS[i % COLORS.length],
  }));

  const rmseData = results?.map((m, i) => ({
    name: `${modelTypeLabel(m.modelType)} (${m.targetColumn})`,
    rmse: m.metrics.rmse,
    mae: m.metrics.mae,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model Comparison</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Compare performance metrics across trained models</p>
        </div>
      </div>

      {/* Select models */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-chart-1" /> Select Models to Compare
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !models?.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-4">No trained models yet.</p>
              <Link href="/upload">
                <Button size="sm" variant="outline">Upload a dataset to get started</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {models.map((m, i) => (
                  <label
                    key={m.modelId}
                    className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors border
                      ${selected.includes(m.modelId) ? "bg-primary/10 border-primary/30" : "bg-muted/40 border-transparent hover:bg-muted/70"}`}
                  >
                    <Checkbox
                      checked={selected.includes(m.modelId)}
                      onCheckedChange={() => toggleSelect(m.modelId)}
                    />
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{m.targetColumn}</span>
                        <Badge variant="secondary" className="text-xs">{modelTypeLabel(m.modelType)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        R² {m.metrics.r2.toFixed(3)} · RMSE {m.metrics.rmse.toFixed(3)} · MAE {m.metrics.mae.toFixed(3)}
                      </p>
                    </div>
                    <Link href={`/results/${m.modelId}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={(e) => e.stopPropagation()}>
                        View
                      </Button>
                    </Link>
                  </label>
                ))}
              </div>

              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="gap-2"
                onClick={handleCompare}
                disabled={selected.length < 2 || compareMut.isPending}
              >
                <GitCompare className="w-4 h-4" />
                {compareMut.isPending ? "Comparing..." : `Compare ${selected.length > 0 ? selected.length : ""} Models`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && results.length > 0 && (
        <>
          {/* Metrics table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Model</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Target</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">R²</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">MAE</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">MSE</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">RMSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((m, i) => (
                      <tr key={m.modelId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="font-medium">{modelTypeLabel(m.modelType)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">{m.targetColumn}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          <span className={m.metrics.r2 >= 0.8 ? "text-chart-2" : m.metrics.r2 >= 0.5 ? "text-chart-3" : "text-destructive"}>
                            {m.metrics.r2.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{m.metrics.mae.toFixed(4)}</td>
                        <td className="py-3 px-4 text-right font-mono">{m.metrics.mse.toFixed(4)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">{m.metrics.rmse.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* R² chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">R² Score (higher is better)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={r2Data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                      formatter={(v: number) => [v.toFixed(4), "R²"]}
                    />
                    <Bar dataKey="r2" radius={[4, 4, 0, 0]}>
                      {r2Data?.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* RMSE / MAE chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Error Metrics (lower is better)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rmseData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                      formatter={(v: number) => v.toFixed(4)}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="rmse" name="RMSE" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mae" name="MAE" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
