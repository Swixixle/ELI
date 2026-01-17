import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCaseOverview } from "@/lib/casesApi";
import { Loader2, FolderOpen, LayoutDashboard, Wrench, CheckCircle, Gavel, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseLifecycle } from "@shared/schema";

interface CaseLayoutProps {
  children: React.ReactNode;
  activeTab: "overview" | "build" | "evaluate" | "audit";
}

export function CaseLayout({ children, activeTab }: CaseLayoutProps) {
  const [, params] = useRoute("/cases/:caseId/:tab?");
  const [, navigate] = useLocation();
  const caseId = params?.caseId;
  
  const { data: overview, isLoading, error } = useCaseOverview(caseId || null);
  
  if (!caseId) {
    navigate("/");
    return null;
  }
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  
  if (error || !overview) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">Case not found</h2>
          <Link href="/" className="text-primary hover:underline">
            Return to home
          </Link>
        </div>
      </AppLayout>
    );
  }
  
  const lifecycle = overview.lifecycle;
  const isArchived = overview.phase === "closure";
  
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, path: `/cases/${caseId}/overview` },
    { id: "build", label: "Build", icon: Wrench, path: `/cases/${caseId}/build` },
    { id: "evaluate", label: "Evaluate", icon: CheckCircle, path: `/cases/${caseId}/evaluate` },
    { id: "audit", label: "Audit", icon: Gavel, path: `/cases/${caseId}/audit` },
  ];
  
  return (
    <AppLayout>
      <div className="flex flex-col h-screen max-w-5xl mx-auto">
        <div className="flex items-center justify-between px-8 py-4 border-b bg-background/95 backdrop-blur z-10 sticky top-0">
          <div>
            <h2 className="text-lg font-semibold font-display text-foreground flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              {overview.caseTitle}
              {isArchived ? (
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded-full font-mono">
                  Archived
                </span>
              ) : (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                  {lifecycle.case_stage.replace(/_/g, " ")}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lifecycle.prerequisites_met}/{lifecycle.prerequisites_total} prerequisites met
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <NextActionButton lifecycle={lifecycle} caseId={caseId} />
          </div>
        </div>
        
        <div className="border-b bg-muted/30">
          <div className="flex gap-0 px-8">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        
        {isArchived && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-3">
            <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <div className="text-sm">
                <strong>This case is archived.</strong> All records are preserved but editing is disabled.
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

function NextActionButton({ lifecycle, caseId }: { lifecycle: CaseLifecycle; caseId: string }) {
  const [, navigate] = useLocation();
  const { next_action } = lifecycle;
  
  const handleClick = () => {
    if (next_action.action_type === "navigation") {
      navigate(next_action.route);
    } else if (next_action.action_type === "modal") {
      navigate(`${next_action.route}?open=${next_action.anchor}`);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      data-testid="button-next-action"
    >
      {next_action.label}
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
