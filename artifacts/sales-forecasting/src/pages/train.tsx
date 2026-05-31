import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetDataset, getGetDatasetQueryKey, useTrainModel, getListModelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Brain, AlertCircle, CheckCircle, Target, Layers } from "lucide-react";

const MODEL_TYPES = [
  { value: "linear_regression", label: "Linear Regression", desc: "Fast, interpretable — good baseline for linear relationships" },
  { value: "random_forest", label: "Random Forest", desc: "Ensemble of trees — handles non-linear patterns, feature importance" },
  { value: "decision_tree", label: "Decision Tree", desc: "Single tree — easy to interpret, prone to overfitting without tuning" },
] as const;

type ModelType = "linear_regression" | "random_forest" | "decision_tree";

export default function TrainPage() {
  const params = useParams<{ datasetId: string }>();
  const datasetId = params.datasetId;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: dataset, isLoading } = useGetDataset(datasetId, {
    query: { queryKey: getGetDatasetQueryKey(datasetId), enabled: !!datasetId },
  });

  const trainModel = useTrainModel();
  const [targetCol, setTargetCol] = useState<string>("");
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [modelType, setModelType] = useState<ModelType>("random_forest");
  const [testRatio, setTestRatio] = useState(0.2);
  const [error, setError] = useState<string | null>(null);

  const numericCols = dataset?.columns.filter((c) => c.type === "numeric").map((c) => c.name) ?? [];
  const allCols = dataset?.columns.map((c) => c.name) ?? [];

  function toggleFeature(col: string) {
    setFeatureCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function handleTrain() {
    setError(null);
    if (!targetCol) { setError("Select a target column"); return; }
    if (featureCols.length === 0) { setError("Select at least one feature column"); return; }
    if (featureCols.includes(targetCol)) { setError("Target column cannot be a feature"); return; }

    trainModel.mutate(
      { data: { datasetId, modelType, targetColumn: targetCol, featureColumns: featureCols, testSplitRatio: testRatio } },
      {
        onSuccess: (result) => {
          qc.invalidateQueries({ queryKey: getListModelsQueryKey() });
          navigate(`/results/${result.modelId}`);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Training failed";
          setError(msg);
        },
      }
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={datasetId ? `/analyze/${datasetId}` : "/"}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Train Model</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {isLoading ? <Skeleton className="h-4 w-48 inline-block" /> : dataset?.filename}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : dataset ? (
        <>
          {/* Target column */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-chart-1" /> Target Column (What to Predict)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Select the numeric column you want the model to predict. Only numeric columns are valid targets.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {numericCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      setTargetCol(col);
                      setFeatureCols((prev) => prev.filter((c) => c !== col));
                    }}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors border
                      ${targetCol === col
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-foreground border-transparent hover:border-border hover:bg-muted"
                      }`}
                  >
                    {col}
                  </button>
                ))}
                {numericCols.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-3">No numeric columns found in this dataset.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Feature columns */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-chart-2" /> Feature Columns (Inputs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Select the columns to use as model inputs. Categorical columns will be label-encoded automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allCols
                  .filter((c) => c !== targetCol)
                  .map((col) => {
                    const colInfo = dataset.columns.find((dc) => dc.name === col);
                    return (
                      <label key={col} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors">
                        <Checkbox
                          checked={featureCols.includes(col)}
                          onCheckedChange={() => toggleFeature(col)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{col}</span>
                          {colInfo && (
                            <Badge variant="outline" className="ml-2 text-xs">{colInfo.type}</Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
              {featureCols.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {featureCols.length} feature{featureCols.length > 1 ? "s" : ""} selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Model type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-chart-3" /> Model Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MODEL_TYPES.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setModelType(value)}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-colors border
                      ${modelType === value
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-muted/40 border-transparent hover:border-border hover:bg-muted"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${modelType === value ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-5">{desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Test split */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Train / Test Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    min={0.1}
                    max={0.4}
                    step={0.05}
                    value={[testRatio]}
                    onValueChange={([v]) => setTestRatio(v)}
                  />
                </div>
                <div className="text-sm font-mono w-32 text-right shrink-0">
                  <span className="text-chart-1">{Math.round((1 - testRatio) * 100)}% train</span>
                  {" / "}
                  <span className="text-chart-4">{Math.round(testRatio * 100)}% test</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            size="lg"
            className="gap-2 w-full sm:w-auto"
            onClick={handleTrain}
            disabled={trainModel.isPending || !targetCol || featureCols.length === 0}
          >
            {trainModel.isPending ? (
              <>
                <span className="animate-spin">⏳</span> Training...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" /> Train Model
              </>
            )}
          </Button>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Dataset not found.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
