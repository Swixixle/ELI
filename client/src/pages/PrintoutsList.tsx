import { AppLayout } from "@/components/layout/AppLayout";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, FileText, CheckCircle, AlertTriangle, Clock, Plus, ArrowLeft, Gavel, Lock, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PrintoutSummary {
  id: string;
  caseId: string;
  printoutNumber: number;
  title: string;
  summary: string;
  prerequisitesMet: number;
  prerequisitesTotal: number;
  admissibilityStatus: string;
  issuedAt: string;
}

interface CaseData {
  id: string;
  name: string;
  description: string | null;
  decisionTarget: string | null;
  decisionTime: string | null;
  phase: string;
}

interface Determination {
  id: string;
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const isPermitted = status === "REVIEW_PERMITTED";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
      isPermitted ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
    )}>
      {isPermitted ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function PrintoutsList() {
  const { caseId } = useParams<{ caseId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");

  const { data: caseData, isLoading: caseLoading } = useQuery<CaseData>({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error("Failed to load case");
      return res.json();
    },
    enabled: !!caseId,
  });

  const { data: printouts = [], isLoading: printoutsLoading } = useQuery<PrintoutSummary[]>({
    queryKey: ["printouts", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/printouts`);
      if (!res.ok) throw new Error("Failed to load printouts");
      return res.json();
    },
    enabled: !!caseId,
  });

  const { data: latestDetermination } = useQuery<Determination | null>({
    queryKey: ["determination", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/receipt/latest`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load determination");
      return res.json();
    },
    enabled: !!caseId,
  });

  const createPrintoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/printouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create printout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["printouts", caseId] });
      setIsCreating(false);
      setTitle("");
      navigate(`/cases/${caseId}/printouts/${data.id}`);
    },
  });

  const handleCreate = () => {
    createPrintoutMutation.mutate();
  };

  if (caseLoading || printoutsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-2xl font-bold font-display flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              Judgment Records
            </h1>
            <p className="text-muted-foreground mt-1">
              {caseData?.name || "Case"} - Immutable judgment printouts
            </p>
          </div>
        </div>

        {!latestDetermination && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">No Determination Available</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You need to create a determination before you can issue a judgment printout.
                  Go to the case evaluation and run the procedural prerequisites check first.
                </p>
              </div>
            </div>
          </div>
        )}

        {latestDetermination && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full mb-6 p-4 border-2 border-dashed border-primary/30 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-3 text-primary"
            data-testid="button-issue-printout"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Issue New Judgment Printout</span>
          </button>
        )}

        {isCreating && (
          <div className="bg-card border rounded-xl p-6 mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Gavel className="w-5 h-5 text-primary" />
              Issue Judgment Printout
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will create an immutable, cryptographically signed record of the current judgment.
              Once issued, this record cannot be modified or deleted.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Final Judgment - Q3 Review"
                className="w-full px-3 py-2 border rounded-lg bg-background"
                data-testid="input-printout-title"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={createPrintoutMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                data-testid="button-confirm-issue"
              >
                {createPrintoutMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Issue Immutable Printout
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                data-testid="button-cancel"
              >
                Cancel
              </button>
            </div>
            {createPrintoutMutation.isError && (
              <p className="text-sm text-destructive mt-3">
                {createPrintoutMutation.error.message}
              </p>
            )}
          </div>
        )}

        {printouts.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-muted/20">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Printouts Yet</h3>
            <p className="text-muted-foreground">
              {latestDetermination
                ? "Issue your first judgment printout using the button above."
                : "Complete a determination first to enable printouts."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {printouts.map((printout) => (
              <div
                key={printout.id}
                className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/cases/${caseId}/printouts/${printout.id}`)}
                data-testid={`printout-item-${printout.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{printout.printoutNumber}</span>
                      <StatusBadge status={printout.admissibilityStatus} />
                    </div>
                    <h3 className="font-semibold truncate">{printout.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{printout.summary}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(printout.issuedAt), "PPp")}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {printout.prerequisitesMet}/{printout.prerequisitesTotal} prerequisites
                      </span>
                    </div>
                  </div>
                  <button
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/cases/${caseId}/printouts/${printout.id}`);
                    }}
                    data-testid={`button-view-${printout.id}`}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
