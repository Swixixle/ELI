import { useRoute, useLocation } from "wouter";
import { CaseLayout } from "./CaseLayout";
import { useCaseOverview, useCaseDocuments } from "@/lib/casesApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Target, Clock, Shield, Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function CaseBuildPage() {
  const [, params] = useRoute("/cases/:caseId/build");
  const [, navigate] = useLocation();
  const caseId = params?.caseId;
  
  const { data: overview } = useCaseOverview(caseId || null);
  const { data: documents } = useCaseDocuments(caseId || null);
  
  if (!caseId) {
    navigate("/");
    return null;
  }
  
  return (
    <CaseLayout activeTab="build">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold">Build Your Case</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Add documents, set the decision target, and configure evaluation parameters
            </p>
          </div>
          
          <DocumentsSection caseId={caseId} documents={documents || []} />
          
          <DecisionTargetSection 
            caseId={caseId}
            currentTarget={overview?.decisionTarget}
            hasTarget={overview?.lifecycle.prereq_status.has_target || false}
          />
          
          <DecisionTimeSection
            caseId={caseId}
            decisionTime={overview?.decisionTime}
            mode={overview?.lifecycle.prereq_status.decision_time_mode || "live"}
          />
          
          <PolicySection
            caseId={caseId}
            hasPolicy={overview?.lifecycle.prereq_status.has_policy || false}
          />
          
          <ConstraintsSection
            caseId={caseId}
            hasConstraints={overview?.lifecycle.prereq_status.has_constraints || false}
          />
        </div>
      </ScrollArea>
    </CaseLayout>
  );
}

function DocumentsSection({ caseId, documents }: { caseId: string; documents: any[] }) {
  return (
    <div className="border rounded-xl p-5 bg-card" id="documents">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documents ({documents.length})
        </h3>
        <a
          href={`/canon?caseId=${caseId}`}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-upload-documents"
        >
          <Upload className="w-4 h-4" />
          Upload Documents
        </a>
      </div>
      
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="font-medium text-sm">{doc.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{doc.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No documents uploaded yet</p>
          <p className="text-xs mt-1">Upload governing policies or evidence documents to begin</p>
        </div>
      )}
    </div>
  );
}

function DecisionTargetSection({ caseId, currentTarget, hasTarget }: { caseId: string; currentTarget?: string | null; hasTarget: boolean }) {
  const [, navigate] = useLocation();
  
  return (
    <div className="border rounded-xl p-5 bg-card" id="target">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4" />
          Decision Target
          {hasTarget && <span className="text-green-600 text-xs font-normal">(Set)</span>}
        </h3>
        <button
          onClick={() => navigate(`/cases/${caseId}/overview?open=target-modal`)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            hasTarget 
              ? "bg-muted text-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          data-testid="button-set-target"
        >
          {hasTarget ? "Edit Target" : "Set Target"}
        </button>
      </div>
      
      {currentTarget ? (
        <p className="text-sm bg-muted/30 p-3 rounded-lg">{currentTarget}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No decision target set</p>
      )}
    </div>
  );
}

function DecisionTimeSection({ caseId, decisionTime, mode }: { caseId: string; decisionTime?: Date | null; mode: string }) {
  const [, navigate] = useLocation();
  
  return (
    <div className="border rounded-xl p-5 bg-card" id="time">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Decision Time
          <span className={cn(
            "text-xs font-normal px-2 py-0.5 rounded",
            mode === "fixed" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
          )}>
            {mode === "fixed" ? "Fixed" : "Live"}
          </span>
        </h3>
        <button
          onClick={() => navigate(`/cases/${caseId}/overview?open=time-modal`)}
          className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
          data-testid="button-set-time"
        >
          Configure
        </button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {mode === "fixed" && decisionTime 
          ? `Fixed at: ${new Date(decisionTime).toLocaleString()}`
          : "Using current time (live mode) - knowledge updates continuously"}
      </p>
    </div>
  );
}

function PolicySection({ caseId, hasPolicy }: { caseId: string; hasPolicy: boolean }) {
  return (
    <div className="border rounded-xl p-5 bg-card" id="policy">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Governing Policy
          {hasPolicy && <span className="text-green-600 text-xs font-normal">(Attached)</span>}
        </h3>
        <a
          href={`/canon?caseId=${caseId}&type=policy`}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            hasPolicy 
              ? "bg-muted text-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          data-testid="button-attach-policy"
        >
          {hasPolicy ? "Manage Policy" : "Attach Policy"}
        </a>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {hasPolicy 
          ? "Governing policy has been attached to this case"
          : "Upload or tag a document as the governing policy for this decision"}
      </p>
    </div>
  );
}

function ConstraintsSection({ caseId, hasConstraints }: { caseId: string; hasConstraints: boolean }) {
  return (
    <div className="border rounded-xl p-5 bg-card" id="constraints">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Contextual Constraints
          {hasConstraints && <span className="text-green-600 text-xs font-normal">(Documented)</span>}
        </h3>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            hasConstraints 
              ? "bg-muted text-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          data-testid="button-document-constraints"
        >
          {hasConstraints ? "Edit Constraints" : "Document Constraints"}
        </button>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {hasConstraints 
          ? "Contextual constraints have been documented"
          : "Record the constraints the decision-maker faced at decision time"}
      </p>
    </div>
  );
}
