import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetModel, getGetModelQueryKey, usePredict } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Zap, AlertCircle, TrendingUp, RotateCcw } from "lucide-react";

function modelTypeLabel(t: string) {
  if (t === "linear_regression") return "Linear Regression";
  if (t === "random_forest") return "Random Forest";
  if (t === "decision_tree") return "Decision Tree";
  return t;
}

export default function PredictPage() {
  const params = useParams<{ modelId: string }>();
  const modelId = params.modelId;

  const { data: model, isLoading } = useGetModel(modelId, {
    query: { queryKey: getGetModelQueryKey(modelId), enabled: !!modelId },
  });
  const predictMut = usePredict();

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePredict() {
    if (!model) return;
    setError(null);
    const features: Record<string, number> = {};
    for (const col of model.featureColumns) {
      const v = inputs[col];
      if (v === undefined || v === "") {
        setError(`Please enter a value for "${col}"`);
        return;
      }
      features[col] = Number(v) || 0;
    }
    predictMut.mutate(
      { modelId, data: { features } },
      {
        onSuccess: (res) => setPrediction(res.prediction),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : "Prediction failed"),
      }
    );
  }

  function handleReset() {
    setInputs({});
    setPrediction(null);
    setError(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!model) {
    return (
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Model not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/results/${modelId}`}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to Results
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Prediction</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            <Badge variant="secondary" className="mr-2">{modelTypeLabel(model.modelType)}</Badge>
            Predicting: <span className="font-medium text-foreground">{model.targetColumn}</span>
          </p>
        </div>
      </div>

      {/* Input form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Feature Values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {model.featureColumns.map((col) => (
              <div key={col} className="space-y-1.5">
                <Label htmlFor={`input-${col}`} className="text-sm font-medium">
                  {col}
                </Label>
                <Input
                  id={`input-${col}`}
                  type="number"
                  placeholder="Enter value"
                  value={inputs[col] ?? ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [col]: e.target.value }))}
                  className="font-mono"
                />
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              className="gap-2 flex-1"
              onClick={handlePredict}
              disabled={predictMut.isPending}
            >
              {predictMut.isPending ? (
                <><span className="animate-spin">⏳</span> Computing...</>
              ) : (
                <><Zap className="w-4 h-4" /> Generate Prediction</>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {prediction !== null && (
        <Card className="border-chart-1/30 bg-chart-1/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-chart-1/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-chart-1" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Predicted {model.targetColumn}</p>
                <p className="text-4xl font-bold font-mono text-chart-1">
                  {prediction.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated by {modelTypeLabel(model.modelType)} · R² {model.metrics.r2.toFixed(3)} on test set
                </p>
              </div>
            </div>

            {/* Input summary */}
            <div className="mt-5 pt-5 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-3">Input Values Used</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {model.featureColumns.map((col) => (
                  <div key={col} className="p-2.5 rounded-lg bg-background/60">
                    <p className="text-xs text-muted-foreground truncate">{col}</p>
                    <p className="font-mono text-sm font-semibold">{inputs[col] ?? "0"}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: "R²", value: model.metrics.r2.toFixed(3) },
              { label: "MAE", value: model.metrics.mae.toFixed(3) },
              { label: "RMSE", value: model.metrics.rmse.toFixed(3) },
              { label: "Test Rows", value: model.testRows },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-lg font-bold font-mono">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
