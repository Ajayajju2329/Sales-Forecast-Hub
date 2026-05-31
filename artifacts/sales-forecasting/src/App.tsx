import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout";
import HomePage from "@/pages/home";
import UploadPage from "@/pages/upload";
import AnalyzePage from "@/pages/analyze";
import TrainPage from "@/pages/train";
import ResultsPage from "@/pages/results";
import PredictPage from "@/pages/predict";
import ComparePage from "@/pages/compare";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/upload" component={UploadPage} />
        <Route path="/analyze/:datasetId" component={AnalyzePage} />
        <Route path="/train/:datasetId" component={TrainPage} />
        <Route path="/results/:modelId" component={ResultsPage} />
        <Route path="/predict/:modelId" component={PredictPage} />
        <Route path="/compare" component={ComparePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="sfs-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
