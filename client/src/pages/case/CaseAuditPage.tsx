import { useRoute, useLocation, Link } from "wouter";
import { CaseLayout } from "./CaseLayout";
import { useCaseOverview } from "@/lib/casesApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Lock, Clock, CheckCircle, ArrowRight, Download, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function CaseAuditPage() {
  const [, params] = useRoute("/cases/:caseId/audit");
  const [, navigate] = useLocation();
  const caseId = params?.caseId;
  
  const { data: overview } = useCaseOverview(caseId || null);
  
  if (!caseId) {
    navigate("/");
    return null;
  }
  
  const lifecycle = overview?.lifecycle;
  const hasSeals = lifecycle?.prereq_status.has_seal;
  const canSeal = lifecycle?.prereq_status.has_evaluation_for_current_context;
  
  return (
    <CaseLayout activeTab="audit">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold">Audit Trail</h2>
            <p className="text-muted-foreground text-sm mt-1">
              View sealed artifacts, event history, and provenance records
            </p>
          </div>
          
          <SealedArtifactsSection 
            caseId={caseId}
            hasSeals={hasSeals || false}
            canSeal={canSeal || false}
            printoutCount={overview?.printoutCount || 0}
          />
          
          <EventLogSection caseId={caseId} />
          
          <ProvenanceSection overview={overview} />
        </div>
      </ScrollArea>
    </CaseLayout>
  );
}

function SealedArtifactsSection({ 
  caseId, 
  hasSeals, 
  canSeal,
  printoutCount 
}: { 
  caseId: string; 
  hasSeals: boolean; 
  canSeal: boolean;
  printoutCount: number;
}) {
  return (
    <div className="border rounded-xl p-5 bg-card" id="seal">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Sealed Artifacts ({printoutCount})
        </h3>
        {canSeal && (
          <Link
            href={`/cases/${caseId}/printouts`}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid="button-issue-printout"
          >
            Issue Printout
          </Link>
        )}
      </div>
      
      {hasSeals ? (
        <div className="space-y-3">
          <Link
            href={`/cases/${caseId}/printouts`}
            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            data-testid="link-view-printouts"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <span className="font-medium">Judgment Records</span>
                <p className="text-xs text-muted-foreground">{printoutCount} sealed printout(s)</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      ) : canSeal ? (
        <div className="text-center py-6 text-muted-foreground">
          <Lock className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No sealed artifacts yet</p>
          <p className="text-xs mt-1">Issue a printout to create an immutable judgment record</p>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Lock className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Evaluation required before sealing</p>
          <p className="text-xs mt-1">Complete the evaluation to enable artifact sealing</p>
        </div>
      )}
    </div>
  );
}

function EventLogSection({ caseId }: { caseId: string }) {
  return (
    <div className="border rounded-xl p-5 bg-card" id="events">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="w-4 h-4" />
          Event Log
        </h3>
        <button
          className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          data-testid="button-export-events"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
      
      <div className="text-center py-6 text-muted-foreground">
        <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Event log will display case timeline</p>
        <p className="text-xs mt-1">All actions and changes are recorded here</p>
      </div>
    </div>
  );
}

function ProvenanceSection({ overview }: { overview: any }) {
  return (
    <div className="border rounded-xl p-5 bg-card" id="provenance">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <CheckCircle className="w-4 h-4" />
        Provenance
      </h3>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Case ID</span>
          <span className="font-mono text-xs">{overview?.caseId}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Current Stage</span>
          <span className="font-medium">{overview?.lifecycle?.case_stage?.replace(/_/g, " ")}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Last Evaluation</span>
          <span className="font-medium">
            {overview?.lastEvaluationAt 
              ? format(new Date(overview.lastEvaluationAt), "MMM d, yyyy HH:mm")
              : "Not evaluated"}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-muted-foreground">Last Printout</span>
          <span className="font-medium">
            {overview?.lastPrintoutAt 
              ? format(new Date(overview.lastPrintoutAt), "MMM d, yyyy HH:mm")
              : "No printouts"}
          </span>
        </div>
      </div>
    </div>
  );
}
