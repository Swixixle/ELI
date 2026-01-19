import { useRoute, useLocation } from "wouter";
import { CaseLayout } from "./CaseLayout";
import { useCaseOverview, useCaseDocuments } from "@/lib/casesApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Target, Clock, Shield, Settings, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState(currentTarget || "");
  const queryClient = useQueryClient();

  const saveTarget = useMutation({
    mutationFn: async (newTarget: string) => {
      const res = await fetch(`/api/cases/${caseId}/decision-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTarget }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save target");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-overview", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setIsOpen(false);
    },
  });

  const handleOpen = () => {
    setTarget(currentTarget || "");
    setIsOpen(true);
  };
  
  return (
    <>
      <div className="border rounded-xl p-5 bg-card" id="target">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Decision Target
            {hasTarget && <span className="text-green-600 text-xs font-normal">(Set)</span>}
          </h3>
          <button
            onClick={handleOpen}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Decision Target</DialogTitle>
            <DialogDescription>
              What procedural determination are you asking for? This should be a specific yes/no governance question.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target">Decision Target</Label>
              <Textarea
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Example: Was the decision at 03:14 procedurally defensible given information available at that time?"
                className="min-h-[100px]"
                data-testid="input-decision-target"
              />
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Good targets</strong> are specific, answerable, and focus on procedural compliance rather than outcomes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveTarget.mutate(target)}
              disabled={!target.trim() || saveTarget.isPending}
              data-testid="button-save-target"
            >
              {saveTarget.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Target"
              )}
            </Button>
          </DialogFooter>

          {saveTarget.isError && (
            <p className="text-sm text-destructive mt-2">
              {saveTarget.error instanceof Error ? saveTarget.error.message : "Failed to save"}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DecisionTimeSection({ caseId, decisionTime, mode }: { caseId: string; decisionTime?: Date | null; mode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [timestamp, setTimestamp] = useState("");
  const [timeMode, setTimeMode] = useState<"live" | "explicit">(mode === "fixed" ? "explicit" : "live");
  const queryClient = useQueryClient();

  const saveTime = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/decision-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: timeMode,
          timestamp: timeMode === "explicit" ? timestamp : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save decision time");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-overview", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setIsOpen(false);
    },
  });

  const handleOpen = () => {
    setTimeMode(mode === "fixed" ? "explicit" : "live");
    if (decisionTime) {
      setTimestamp(new Date(decisionTime).toISOString().slice(0, 16));
    }
    setIsOpen(true);
  };
  
  return (
    <>
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
            onClick={handleOpen}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Decision Time</DialogTitle>
            <DialogDescription>
              Set when the decision was made. This determines what evidence was "knowable" at decision time.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Mode</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={timeMode === "live"}
                    onChange={() => setTimeMode("live")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Live (current time)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={timeMode === "explicit"}
                    onChange={() => setTimeMode("explicit")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Fixed (specific time)</span>
                </label>
              </div>
            </div>

            {timeMode === "explicit" && (
              <div className="space-y-2">
                <Label htmlFor="timestamp">Decision Timestamp</Label>
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  data-testid="input-decision-time"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveTime.mutate()}
              disabled={saveTime.isPending || (timeMode === "explicit" && !timestamp)}
              data-testid="button-save-time"
            >
              {saveTime.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>

          {saveTime.isError && (
            <p className="text-sm text-destructive mt-2">
              {saveTime.error instanceof Error ? saveTime.error.message : "Failed to save"}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
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
  const [isOpen, setIsOpen] = useState(false);
  const [constraints, setConstraints] = useState({
    timePressure: "moderate",
    workload: "normal",
    guidelineCoherence: "clear",
    irreversibility: "moderate",
    notes: "",
  });
  const queryClient = useQueryClient();

  const saveConstraints = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "constraints_documented",
          description: `Constraints documented: Time pressure (${constraints.timePressure}), Workload (${constraints.workload}), Guidelines (${constraints.guidelineCoherence}), Irreversibility (${constraints.irreversibility})${constraints.notes ? `. Notes: ${constraints.notes}` : ""}`,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save constraints");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-overview", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setIsOpen(false);
    },
  });

  return (
    <>
      <div className="border rounded-xl p-5 bg-card" id="constraints">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Contextual Constraints
            {hasConstraints && <span className="text-green-600 text-xs font-normal">(Documented)</span>}
          </h3>
          <button
            onClick={() => setIsOpen(true)}
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document Contextual Constraints</DialogTitle>
            <DialogDescription>
              Record the operational constraints the decision-maker faced. This prevents judging decisions without understanding the context.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Time Pressure</Label>
              <select
                value={constraints.timePressure}
                onChange={(e) => setConstraints({ ...constraints, timePressure: e.target.value })}
                className="w-full p-2 border rounded-lg bg-background"
                data-testid="select-time-pressure"
              >
                <option value="none">None - ample time available</option>
                <option value="low">Low - some time pressure</option>
                <option value="moderate">Moderate - typical pressure</option>
                <option value="high">High - significant time constraints</option>
                <option value="critical">Critical - emergency/urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Workload</Label>
              <select
                value={constraints.workload}
                onChange={(e) => setConstraints({ ...constraints, workload: e.target.value })}
                className="w-full p-2 border rounded-lg bg-background"
                data-testid="select-workload"
              >
                <option value="light">Light - below normal capacity</option>
                <option value="normal">Normal - typical workload</option>
                <option value="heavy">Heavy - above normal capacity</option>
                <option value="surge">Surge - emergency staffing</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Guideline Coherence</Label>
              <select
                value={constraints.guidelineCoherence}
                onChange={(e) => setConstraints({ ...constraints, guidelineCoherence: e.target.value })}
                className="w-full p-2 border rounded-lg bg-background"
                data-testid="select-guideline-coherence"
              >
                <option value="clear">Clear - unambiguous guidelines</option>
                <option value="moderate">Moderate - some interpretation needed</option>
                <option value="conflicting">Conflicting - contradictory guidance</option>
                <option value="absent">Absent - no applicable guidelines</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Irreversibility</Label>
              <select
                value={constraints.irreversibility}
                onChange={(e) => setConstraints({ ...constraints, irreversibility: e.target.value })}
                className="w-full p-2 border rounded-lg bg-background"
                data-testid="select-irreversibility"
              >
                <option value="low">Low - easily reversible</option>
                <option value="moderate">Moderate - some consequences</option>
                <option value="high">High - difficult to reverse</option>
                <option value="critical">Critical - irreversible</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                value={constraints.notes}
                onChange={(e) => setConstraints({ ...constraints, notes: e.target.value })}
                placeholder="Any additional context about constraints..."
                className="min-h-[60px]"
                data-testid="input-constraint-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveConstraints.mutate()}
              disabled={saveConstraints.isPending}
              data-testid="button-save-constraints"
            >
              {saveConstraints.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Constraints"
              )}
            </Button>
          </DialogFooter>

          {saveConstraints.isError && (
            <p className="text-sm text-destructive mt-2">
              {saveConstraints.error instanceof Error ? saveConstraints.error.message : "Failed to save"}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
