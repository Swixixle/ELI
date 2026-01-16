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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/canon" component={CanonLibrary} />
      <Route path="/canon/document/:documentId" component={DocumentViewer} />
      <Route path="/about" component={About} />
      <Route path="/cases/:caseId/printouts" component={PrintoutsList} />
      <Route path="/cases/:caseId/printouts/:printoutId" component={PrintoutView} />
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
