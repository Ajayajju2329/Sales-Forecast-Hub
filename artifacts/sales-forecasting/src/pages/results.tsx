import { useParams, Link } from "wouter";
import { useGetModel, getGetModelQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { ArrowLeft, Download, Zap, AlertCircle, Brain, TrendingUp, Target } from "lucide-react";

function modelTypeLabel(t: string) {
  if (t === "linear_regression") return "Linear Regression";
  if (t === "random_forest") return "Random Forest";
  if (t === "decision_tree") return "Decision Tree";
  return t;
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${color ?? ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ResultsPage() {
  const params = useParams<{ modelId: string }>();
  const modelId = params.modelId;

  const { data: model, isLoading, error } = useGetModel(modelId, {
    query: { queryKey: getGetModelQueryKey(modelId), enabled: !!modelId },
  });

  function handleExport() {
    window.open(`/api/models/${modelId}/predictions/export`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !model) {
    return (
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Model not found.</AlertDescription>
      </Alert>
    );
  }

  const r2Color = model.metrics.r2 >= 0.8 ? "text-chart-2" : model.metrics.r2 >= 0.5 ? "text-chart-3" : "text-destructive";

  const sortedImportance = [...model.featureImportance].sort((a, b) => b.importance - a.importance);
  const maxImportance = sortedImportance[0]?.importance ?? 1;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 mt-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Model Results</h1>
            <Badge variant="secondary">{modelTypeLabel(model.modelType)}</Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Target: <span className="font-medium text-foreground">{model.targetColumn}</span>
            {" · "}{model.trainRows} train / {model.testRows} test rows
            {" · "}Trained {new Date(model.trainedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/predict/${modelId}`}>
            <Button size="sm" className="gap-2">
              <Zap className="w-4 h-4" /> Predict
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="R² Score"
          value={model.metrics.r2.toFixed(4)}
          sub={model.metrics.r2 >= 0.8 ? "Excellent fit" : model.metrics.r2 >= 0.5 ? "Moderate fit" : "Poor fit"}
          color={r2Color}
        />
        <MetricCard label="MAE" value={model.metrics.mae.toFixed(4)} sub="Mean Absolute Error" />
        <MetricCard label="MSE" value={model.metrics.mse.toFixed(4)} sub="Mean Squared Error" />
        <MetricCard label="RMSE" value={model.metrics.rmse.toFixed(4)} sub="Root Mean Squared Error" color="text-chart-1" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Actual vs Predicted scatter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-chart-1" /> Actual vs Predicted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="actual"
                  name="Actual"
                  type="number"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Actual", position: "insideBottom", offset: -4, fontSize: 11 }}
                />
                <YAxis
                  dataKey="predicted"
                  name="Predicted"
                  type="number"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Predicted", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                  formatter={(v: number) => v.toFixed(3)}
                />
                <Scatter
                  data={model.actualVsPredicted.slice(0, 200)}
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Perfect predictions would lie on the diagonal. Shown: {Math.min(200, model.actualVsPredicted.length)} points.
            </p>
          </CardContent>
        </Card>

        {/* Feature importance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-2" /> Feature Importance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedImportance.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={sortedImportance}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" domain={[0, maxImportance * 1.1]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    width={90}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                    formatter={(v: number) => [v.toFixed(4), "importance"]}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {sortedImportance.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(243, 75%, ${Math.round(45 + (i / sortedImportance.length) * 25)}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Feature importance not available for this model.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-chart-3" /> Model Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Model Type</p>
              <p className="text-sm font-medium">{modelTypeLabel(model.modelType)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Target Column</p>
              <p className="text-sm font-medium font-mono">{model.targetColumn}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Features Used</p>
              <p className="text-sm font-medium">{model.featureColumns.length} columns</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Model ID</p>
              <p className="text-xs font-mono text-muted-foreground truncate">{model.modelId}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Feature Columns</p>
            <div className="flex flex-wrap gap-2">
              {model.featureColumns.map((f) => (
                <Badge key={f} variant="secondary" className="font-mono text-xs">{f}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
