import { useRoute, useLocation, Link } from "wouter";
import { CaseLayout } from "./CaseLayout";
import { useCaseOverview } from "@/lib/casesApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, Play, ArrowRight, Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CaseEvaluatePage() {
  const [, params] = useRoute("/cases/:caseId/evaluate");
  const [, navigate] = useLocation();
  const caseId = params?.caseId;
  
  const { data: overview } = useCaseOverview(caseId || null);
  
  if (!caseId) {
    navigate("/");
    return null;
  }
  
  const lifecycle = overview?.lifecycle;
  const canEvaluate = lifecycle?.review_permission === "permitted";
  const hasEvaluation = lifecycle?.prereq_status.has_evaluation_for_current_context;
  
  return (
    <CaseLayout activeTab="evaluate">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          {!canEvaluate ? (
            <BlockedEvaluationView 
              caseId={caseId}
              lifecycle={lifecycle}
            />
          ) : hasEvaluation ? (
            <EvaluationResultsView 
              caseId={caseId}
              overview={overview}
            />
          ) : (
            <ReadyToEvaluateView 
              caseId={caseId}
              lifecycle={lifecycle}
            />
          )}
        </div>
      </ScrollArea>
    </CaseLayout>
  );
}

function BlockedEvaluationView({ caseId, lifecycle }: { caseId: string; lifecycle: any }) {
  const blockers = lifecycle?.what_is_missing || [];
  const nextAction = lifecycle?.next_action;
  
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold">Evaluation Blocked</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          This case does not yet meet the minimum prerequisites for procedural evaluation.
          Complete the following steps to unlock evaluation.
        </p>
      </div>
      
      <div className="border rounded-xl p-5 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4" />
          Missing Prerequisites
        </h3>
        <ul className="space-y-3">
          {blockers.map((blocker: string, i: number) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              {blocker}
            </li>
          ))}
        </ul>
      </div>
      
      {nextAction && (
        <div className="border-2 border-primary/30 rounded-xl p-5 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{nextAction.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{nextAction.description}</p>
            </div>
            <Link
              href={nextAction.route}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-fix-blocker"
            >
              Fix This
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadyToEvaluateView({ caseId, lifecycle }: { caseId: string; lifecycle: any }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold">Ready for Evaluation</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          All minimum prerequisites are satisfied. Run the evaluation to generate a procedural assessment.
        </p>
      </div>
      
      <div className="border rounded-xl p-5 bg-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Prerequisites Summary
        </h3>
        <div className="text-sm text-muted-foreground">
          <p>{lifecycle?.prerequisites_met}/{lifecycle?.prerequisites_total} prerequisites met</p>
          <p className="mt-1">Review permission: <strong>{lifecycle?.review_permission}</strong></p>
        </div>
      </div>
      
      <button
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg"
        data-testid="button-run-evaluation"
      >
        <Play className="w-5 h-5" />
        Run Evaluation
      </button>
    </div>
  );
}

function EvaluationResultsView({ caseId, overview }: { caseId: string; overview: any }) {
  const [, navigate] = useLocation();
  
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold">Evaluation Complete</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          The procedural evaluation has been completed for the current decision context.
        </p>
      </div>
      
      <div className="border rounded-xl p-5 bg-card">
        <h3 className="font-semibold mb-4">Evaluation Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Risk Tier</span>
            <span className="font-medium">{overview?.currentRiskTier || "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prerequisites Met</span>
            <span className="font-medium">{overview?.prerequisitesMet}/{overview?.prerequisitesTotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Evaluation</span>
            <span className="font-medium">
              {overview?.lastEvaluationAt 
                ? new Date(overview.lastEvaluationAt).toLocaleString()
                : "Unknown"}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          className="flex items-center justify-center gap-2 px-4 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
          data-testid="button-re-evaluate"
        >
          <Play className="w-4 h-4" />
          Re-evaluate
        </button>
        <button
          onClick={() => navigate(`/cases/${caseId}/audit`)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-seal-artifact"
        >
          Seal Artifact
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
