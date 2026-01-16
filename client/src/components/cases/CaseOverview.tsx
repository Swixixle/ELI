import { cn } from "@/lib/utils";
import { 
  Target, 
  Clock, 
  Users, 
  FileText, 
  Shield, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Edit2,
  Gavel,
  Upload,
  Calendar,
  FileCheck
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import type { Case } from "@shared/schema";
import type { DecisionReadiness } from "@/lib/types";

interface CaseOverviewProps {
  caseData: Case;
  readiness: DecisionReadiness;
  documentCount: number;
  viewMode: "builder" | "audit";
  onSetDecisionTarget: () => void;
  onNavigateToTab: (tab: string) => void;
}

type PrerequisiteStatus = "present" | "missing" | "partial";

interface Prerequisite {
  id: string;
  name: string;
  shortName: string;
  status: PrerequisiteStatus;
  action?: string;
}

function getStatusBadge(totalSatisfied: number): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (totalSatisfied >= 5) return { label: "Robust", variant: "default" };
  if (totalSatisfied >= 4) return { label: "Strong", variant: "default" };
  if (totalSatisfied >= 3) return { label: "Permitted", variant: "secondary" };
  return { label: "Blocked", variant: "destructive" };
}

function getPrerequisites(readiness: DecisionReadiness): Prerequisite[] {
  const hasTarget = readiness.conditions.find(c => c.id === "decision_target")?.status === "satisfied";
  const temporalCat = readiness.categories.find(c => c.name === "Temporal Verification");
  const independentCat = readiness.categories.find(c => c.name === "Independent Verification");
  const policyCat = readiness.categories.find(c => c.name === "Policy Application");
  const contextCat = readiness.categories.find(c => c.name === "Contextual Constraints");

  return [
    {
      id: "target",
      name: "Decision Target",
      shortName: "Target",
      status: hasTarget ? "present" : "missing",
      action: hasTarget ? undefined : "Set decision target"
    },
    {
      id: "temporal",
      name: "Temporal Verification",
      shortName: "Time",
      status: temporalCat ? (temporalCat.satisfied === temporalCat.total ? "present" : temporalCat.satisfied > 0 ? "partial" : "missing") : "missing",
      action: temporalCat && temporalCat.satisfied < temporalCat.total ? "Add timestamped evidence" : undefined
    },
    {
      id: "independent",
      name: "Independent Verification",
      shortName: "Independent",
      status: independentCat ? (independentCat.satisfied === independentCat.total ? "present" : "missing") : "missing",
      action: independentCat && independentCat.satisfied === 0 ? "Add third-party verification" : undefined
    },
    {
      id: "policy",
      name: "Policy Application",
      shortName: "Policy",
      status: policyCat ? (policyCat.satisfied === policyCat.total ? "present" : "missing") : "missing",
      action: policyCat && policyCat.satisfied === 0 ? "Attach governing policy" : undefined
    },
    {
      id: "context",
      name: "Contextual Constraints",
      shortName: "Constraints",
      status: contextCat ? (contextCat.satisfied === contextCat.total ? "present" : "missing") : "missing",
      action: contextCat && contextCat.satisfied === 0 ? "Document constraints" : undefined
    }
  ];
}

function getNextAction(prerequisites: Prerequisite[], viewMode: string): { action: string; target: string } | null {
  if (viewMode === "audit") return null;
  
  const priority = ["target", "temporal", "policy", "independent", "context"];
  for (const id of priority) {
    const prereq = prerequisites.find(p => p.id === id);
    if (prereq && prereq.status !== "present" && prereq.action) {
      return { action: prereq.action, target: id };
    }
  }
  return null;
}

export function CaseOverview({ 
  caseData, 
  readiness, 
  documentCount,
  viewMode,
  onSetDecisionTarget,
  onNavigateToTab
}: CaseOverviewProps) {
  const statusBadge = getStatusBadge(readiness.totalSatisfied);
  const prerequisites = getPrerequisites(readiness);
  const nextAction = getNextAction(prerequisites, viewMode);

  const handleNextAction = () => {
    if (!nextAction) return;
    if (nextAction.target === "target") {
      onSetDecisionTarget();
    } else {
      onNavigateToTab("build");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Decision Target Card */}
      <div className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              caseData.decisionTarget ? "bg-primary/10" : "bg-amber-100"
            )}>
              <Target className={cn(
                "w-6 h-6",
                caseData.decisionTarget ? "text-primary" : "text-amber-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground mb-1">Decision Target</h3>
              {caseData.decisionTarget ? (
                <p className="text-muted-foreground leading-relaxed">{caseData.decisionTarget}</p>
              ) : (
                <p className="text-amber-700 text-sm">
                  No decision target set. Define what decision this case is trying to support.
                </p>
              )}
            </div>
          </div>
          {viewMode === "builder" && (
            <button
              onClick={onSetDecisionTarget}
              className={cn(
                "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                caseData.decisionTarget 
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              data-testid="button-set-target"
            >
              {caseData.decisionTarget ? (
                <span className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </span>
              ) : (
                "Set Decision Target"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Procedural Readiness Strip */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-foreground">Procedural Prerequisites</h3>
          <Badge variant={statusBadge.variant} className="text-xs">
            {readiness.totalSatisfied}/{readiness.totalRequired} — {statusBadge.label}
          </Badge>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {prerequisites.map((prereq) => (
            <button
              key={prereq.id}
              onClick={() => onNavigateToTab("evaluate")}
              className={cn(
                "flex flex-col items-center p-3 rounded-lg border transition-all hover:shadow-sm",
                prereq.status === "present" && "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
                prereq.status === "partial" && "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
                prereq.status === "missing" && "bg-muted/50 border-border"
              )}
              data-testid={`prereq-${prereq.id}`}
            >
              {prereq.status === "present" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 mb-1" />
              ) : prereq.status === "partial" ? (
                <AlertCircle className="w-5 h-5 text-amber-600 mb-1" />
              ) : (
                <AlertCircle className="w-5 h-5 text-muted-foreground mb-1" />
              )}
              <span className={cn(
                "text-xs font-medium text-center",
                prereq.status === "present" && "text-emerald-700 dark:text-emerald-300",
                prereq.status === "partial" && "text-amber-700 dark:text-amber-300",
                prereq.status === "missing" && "text-muted-foreground"
              )}>
                {prereq.shortName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Case Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <FileText className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">{documentCount}</div>
          <div className="text-xs text-muted-foreground">Documents</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">
            {caseData.decisionTime ? "Set" : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Decision Time</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Shield className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">
            {readiness.totalSatisfied}
          </div>
          <div className="text-xs text-muted-foreground">Prerequisites Met</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Gavel className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">0</div>
          <div className="text-xs text-muted-foreground">Determinations</div>
        </div>
      </div>

      {/* Next Best Action */}
      {nextAction && viewMode === "builder" && (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Next Step</h4>
                <p className="text-sm text-muted-foreground">{nextAction.action}</p>
              </div>
            </div>
            <button
              onClick={handleNextAction}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-next-action"
            >
              {nextAction.target === "target" ? "Set Target" : "Go to Build"}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onNavigateToTab("build")}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all group"
          data-testid="button-go-to-build"
        >
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-foreground">Build Case</h4>
            <p className="text-xs text-muted-foreground">Add documents and evidence</p>
          </div>
        </button>
        <a
          href={`/cases/${caseData.id}/printouts`}
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all group"
          data-testid="button-go-to-printouts"
        >
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
            <FileCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-foreground">Judgment Records</h4>
            <p className="text-xs text-muted-foreground">View or issue printouts</p>
          </div>
        </a>
      </div>
    </div>
  );
}
