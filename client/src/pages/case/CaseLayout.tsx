import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCaseOverview, useArchiveCase } from "@/lib/casesApi";
import { Loader2, FolderOpen, LayoutDashboard, Wrench, CheckCircle, Gavel, AlertTriangle, ArrowRight, ChevronLeft, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseLifecycle } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { mapApiError } from "@/lib/errorMapping";

interface CaseLayoutProps {
  children: React.ReactNode;
  activeTab: "overview" | "build" | "evaluate" | "audit";
}

export function CaseLayout({ children, activeTab }: CaseLayoutProps) {
  const [, params] = useRoute("/cases/:caseId/:tab?");
  const [, navigate] = useLocation();
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const caseId = params?.caseId;
  
  const { data: overview, isLoading, error } = useCaseOverview(caseId || null);
  const archiveMutation = useArchiveCase();
  
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
            Return to Cases
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
  
  const handleArchive = async (reasonCode: "COMPLETED" | "DUPLICATE" | "ENTERED_IN_ERROR" | "CANCELLED") => {
    setArchiveError(null);
    try {
      await archiveMutation.mutateAsync({ id: caseId, params: { reasonCode } });
      setShowArchiveModal(false);
      navigate("/");
    } catch (err: any) {
      const errorCode = err?.message || "ARCHIVE_FAILED";
      const mapped = mapApiError(errorCode);
      setArchiveError(mapped.message);
    }
  };
  
  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Case Chrome - Always visible header */}
        <div className="bg-muted/30 border-b px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Breadcrumbs + Back */}
            <div className="flex items-center gap-2 text-sm">
              <Link 
                href="/" 
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-back-to-cases"
              >
                <ChevronLeft className="w-4 h-4" />
                Cases
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium truncate max-w-[200px]">{overview.caseTitle}</span>
              {isArchived ? (
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded-full font-mono ml-2">
                  Archived
                </span>
              ) : (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono ml-2">
                  Active
                </span>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              {!isArchived && (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-md hover:bg-muted transition-colors"
                  data-testid="button-close-case"
                >
                  <Archive className="w-4 h-4" />
                  Close Case
                </button>
              )}
              <NextActionButton lifecycle={lifecycle} caseId={caseId} isArchived={isArchived} />
            </div>
          </div>
        </div>
        
        {/* Main Case Header */}
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between px-8 py-4 border-b bg-background">
            <div>
              <h2 className="text-lg font-semibold font-display text-foreground flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                {overview.caseTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Stage: {lifecycle.case_stage.replace(/_/g, " ")} · {lifecycle.prerequisites_met}/{lifecycle.prerequisites_total} prerequisites met
              </p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-b bg-background">
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
          
          {/* Archived Banner */}
          {isArchived && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <div className="text-sm">
                    <strong>This case is archived.</strong> All records are preserved but editing is disabled.
                  </div>
                </div>
                <Link
                  href="/"
                  className="text-sm text-amber-800 dark:text-amber-200 hover:underline font-medium"
                  data-testid="link-archived-back"
                >
                  Back to Cases
                </Link>
              </div>
            </div>
          )}
        </div>
        
        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden max-w-5xl mx-auto w-full">
          {children}
        </div>
      </div>
      
      {/* Archive Modal */}
      <ArchiveModal
        open={showArchiveModal}
        onOpenChange={(open) => {
          setShowArchiveModal(open);
          if (!open) setArchiveError(null);
        }}
        onArchive={handleArchive}
        isPending={archiveMutation.isPending}
        error={archiveError}
      />
    </AppLayout>
  );
}

type ArchiveReasonCode = "COMPLETED" | "DUPLICATE" | "ENTERED_IN_ERROR" | "CANCELLED";

function ArchiveModal({ 
  open, 
  onOpenChange, 
  onArchive, 
  isPending,
  error
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onArchive: (reasonCode: ArchiveReasonCode) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [selectedReason, setSelectedReason] = useState<ArchiveReasonCode | null>(null);
  
  const reasons: Array<{ code: ArchiveReasonCode; label: string; description: string }> = [
    { code: "COMPLETED", label: "Completed", description: "Case review is finished" },
    { code: "DUPLICATE", label: "Duplicate", description: "This case duplicates another" },
    { code: "ENTERED_IN_ERROR", label: "Entered in Error", description: "Case was created by mistake" },
    { code: "CANCELLED", label: "Cancelled", description: "Case review was cancelled" },
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Close Case
          </DialogTitle>
          <DialogDescription>
            Closing a case preserves all records but prevents further editing. Select a reason:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {reasons.map((reason) => (
            <button
              key={reason.code}
              onClick={() => setSelectedReason(reason.code)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selectedReason === reason.code
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
              data-testid={`archive-reason-${reason.code.toLowerCase()}`}
            >
              <div className="font-medium text-sm">{reason.label}</div>
              <div className="text-xs text-muted-foreground">{reason.description}</div>
            </button>
          ))}
        </div>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            data-testid="button-cancel-archive"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedReason && onArchive(selectedReason)}
            disabled={!selectedReason || isPending}
            className={cn(
              "px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
              selectedReason 
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            data-testid="button-confirm-archive"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Close Case
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NextActionButton({ lifecycle, caseId, isArchived }: { lifecycle: CaseLifecycle; caseId: string; isArchived: boolean }) {
  const [, navigate] = useLocation();
  const { next_action } = lifecycle;
  
  if (isArchived) {
    return (
      <Link
        href={`/cases/${caseId}/audit`}
        className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
        data-testid="button-view-records"
      >
        View Records
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }
  
  const handleClick = () => {
    if (next_action.action_type === "navigation") {
      navigate(next_action.route);
    } else if (next_action.action_type === "modal") {
      navigate(`${next_action.route}?open=${next_action.anchor}`);
    } else if (next_action.action_type === "api_call") {
      navigate(next_action.route);
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
