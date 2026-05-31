import { Link } from "wouter";
import { useListDatasets, useListModels, useDeleteDataset, useDeleteModel, getListDatasetsQueryKey, getListModelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Brain,
  Upload,
  BarChart2,
  TrendingUp,
  Trash2,
  ArrowRight,
  Activity,
  Clock,
  GitCompare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function modelTypeLabel(t: string) {
  if (t === "linear_regression") return "Linear Regression";
  if (t === "random_forest") return "Random Forest";
  if (t === "decision_tree") return "Decision Tree";
  return t;
}

export default function HomePage() {
  const qc = useQueryClient();
  const { data: datasets, isLoading: loadingDS } = useListDatasets();
  const { data: models, isLoading: loadingMD } = useListModels();
  const delDataset = useDeleteDataset();
  const delModel = useDeleteModel();

  function handleDeleteDataset(id: string) {
    delDataset.mutate({ datasetId: id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListDatasetsQueryKey() }),
    });
  }

  function handleDeleteModel(id: string) {
    delModel.mutate({ modelId: id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListModelsQueryKey() }),
    });
  }

  const stats = [
    { label: "Datasets", value: datasets?.length ?? 0, icon: Database, color: "text-chart-1" },
    { label: "Trained Models", value: models?.length ?? 0, icon: Brain, color: "text-chart-2" },
    {
      label: "Best R²",
      value: models?.length
        ? Math.max(...models.map((m) => m.metrics.r2)).toFixed(3)
        : "—",
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      label: "Avg RMSE",
      value: models?.length
        ? (models.reduce((s, m) => s + m.metrics.rmse, 0) / models.length).toFixed(2)
        : "—",
      icon: Activity,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Forecasting System</h1>
        <p className="text-muted-foreground mt-1">
          Upload sales data, run machine learning models, and generate accurate predictions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${color} bg-muted rounded-lg p-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick start */}
      {!loadingDS && datasets?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-lg mb-2">Get started by uploading a dataset</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Upload a CSV file with your sales data to begin analysis and forecasting.
              The system supports any tabular CSV with numeric and categorical columns.
            </p>
            <Link href="/upload">
              <Button className="gap-2">
                <Upload className="w-4 h-4" /> Upload Dataset
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Workflow steps */}
      {!loadingDS && datasets?.length === 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Upload CSV", desc: "Upload your sales dataset in CSV format", icon: Upload },
              { step: "02", title: "Analyze Data", desc: "Explore statistics, correlations, and distributions", icon: BarChart2 },
              { step: "03", title: "Train Model", desc: "Select features and train a regression model", icon: Brain },
              { step: "04", title: "Predict", desc: "Generate forecasts and export results", icon: TrendingUp },
            ].map(({ step, title, desc, icon: Icon }) => (
              <Card key={step} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="absolute top-3 right-3 text-4xl font-black text-muted-foreground/10 font-mono">{step}</div>
                  <Icon className="w-5 h-5 text-primary mb-3" />
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Datasets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-chart-1" /> Datasets
              </CardTitle>
              <Link href="/upload">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                  <Upload className="w-3 h-3" /> Upload
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingDS ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : datasets?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No datasets yet</p>
            ) : (
              <div className="space-y-2">
                {datasets?.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group">
                    <Database className="w-4 h-4 text-chart-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.rowCount.toLocaleString()} rows · {d.columnCount} cols
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/analyze/${d.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <BarChart2 className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Link href={`/train/${d.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Brain className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDataset(d.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0 group-hover:hidden" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Models */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-chart-2" /> Trained Models
              </CardTitle>
              {(models?.length ?? 0) > 1 && (
                <Link href="/compare">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                    <GitCompare className="w-3 h-3" /> Compare
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingMD ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : models?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No models trained yet</p>
            ) : (
              <div className="space-y-2">
                {models?.map((m) => (
                  <div key={m.modelId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group">
                    <Brain className="w-4 h-4 text-chart-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.targetColumn}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">{modelTypeLabel(m.modelType)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        R² {m.metrics.r2.toFixed(3)} · RMSE {m.metrics.rmse.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/results/${m.modelId}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteModel(m.modelId)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
