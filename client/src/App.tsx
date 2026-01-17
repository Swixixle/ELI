import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import CanonLibrary from "@/pages/CanonLibrary";
import DocumentViewer from "@/pages/DocumentViewer";
import About from "@/pages/About";
import PrintoutView from "@/pages/PrintoutView";
import PrintoutsList from "@/pages/PrintoutsList";
import ValueImaging from "@/pages/ValueImaging";
import CaseOverviewPage from "@/pages/case/CaseOverviewPage";
import CaseBuildPage from "@/pages/case/CaseBuildPage";
import CaseEvaluatePage from "@/pages/case/CaseEvaluatePage";
import CaseAuditPage from "@/pages/case/CaseAuditPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/canon" component={CanonLibrary} />
      <Route path="/canon/document/:documentId" component={DocumentViewer} />
      <Route path="/about" component={About} />
      <Route path="/cases/:caseId/overview" component={CaseOverviewPage} />
      <Route path="/cases/:caseId/build" component={CaseBuildPage} />
      <Route path="/cases/:caseId/evaluate" component={CaseEvaluatePage} />
      <Route path="/cases/:caseId/audit" component={CaseAuditPage} />
      <Route path="/cases/:caseId/printouts" component={PrintoutsList} />
      <Route path="/cases/:caseId/printouts/:printoutId" component={PrintoutView} />
      <Route path="/value-imaging" component={ValueImaging} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
