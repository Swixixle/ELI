import { cn } from "@/lib/utils";
import { 
  Target, 
  Clock, 
  FileText, 
  Shield, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Edit2,
  Gavel,
  Upload,
  FileCheck,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import type { Case, CaseOverview as CaseOverviewType, PrerequisiteStatusValue } from "@shared/schema";
import { useCaseOverview } from "@/lib/casesApi";

interface CaseOverviewProps {
  caseData: Case;
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
}

function mapStatus(status: PrerequisiteStatusValue): PrerequisiteStatus {
  if (status === "met") return "present";
  if (status === "partial") return "partial";
  return "missing";
}

function getImagingStatus(riskTier: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  switch (riskTier) {
    case "regulator_ready": return { label: "Regulator-Ready", variant: "default" };
    case "defensible": return { label: "Defensible", variant: "default" };
    case "high_risk": return { label: "Limited — High Risk", variant: "secondary" };
    case "unsafe": return { label: "Unsafe — Advisory Only", variant: "destructive" };
    default: return { label: "Unknown", variant: "outline" };
  }
}

function getPrerequisites(overview: CaseOverviewType): Prerequisite[] {
  const ps = overview.prerequisiteStatus;
  return [
    {
      id: "target",
      name: "Decision Target",
      shortName: "Target",
      status: mapStatus(ps.decisionTarget)
    },
    {
      id: "temporal",
      name: "Temporal Verification",
      shortName: "Time",
      status: mapStatus(ps.temporalVerification)
    },
    {
      id: "independent",
      name: "Independent Verification",
      shortName: "Independent",
      status: mapStatus(ps.independentVerification)
    },
    {
      id: "policy",
      name: "Policy Application",
      shortName: "Policy",
      status: mapStatus(ps.policyApplication)
    },
    {
      id: "context",
      name: "Contextual Constraints",
      shortName: "Constraints",
      status: mapStatus(ps.contextualConstraints)
    }
  ];
}

export function CaseOverview({ 
  caseData, 
  viewMode,
  onSetDecisionTarget,
  onNavigateToTab
}: CaseOverviewProps) {
  const { data: overview, isLoading, error } = useCaseOverview(caseData.id);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading case overview...</div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          Failed to load case overview
        </div>
      </div>
    );
  }

  const imagingStatus = getImagingStatus(overview.currentRiskTier);
  const prerequisites = getPrerequisites(overview);
  const nextAction = overview.nextActionHint;

  const handleNextAction = () => {
    if (!overview.decisionTarget) {
      onSetDecisionTarget();
    } else {
      onNavigateToTab("build");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Case Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            {overview.domain} — {overview.caseType}
          </div>
          <h2 className="text-xl font-semibold text-foreground">{overview.caseTitle}</h2>
        </div>
        <Badge variant={imagingStatus.variant} className="text-xs">
          {overview.prerequisitesMet}/{overview.prerequisitesTotal} — {imagingStatus.label}
        </Badge>
      </div>

      {/* Decision Target Card */}
      <div className="bg-card border-2 border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              overview.decisionTarget ? "bg-primary/10" : "bg-amber-100"
            )}>
              <Target className={cn(
                "w-6 h-6",
                overview.decisionTarget ? "text-primary" : "text-amber-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground mb-1">Decision Under Review</h3>
              {overview.decisionTarget ? (
                <p className="text-muted-foreground leading-relaxed">{overview.decisionTarget}</p>
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
                overview.decisionTarget 
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              data-testid="button-set-target"
            >
              {overview.decisionTarget ? (
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

      {/* Imaging Status Disclaimer */}
      <div className="bg-muted/50 border border-border rounded-lg px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          This output describes procedural readiness for review, not the quality or correctness of the decision.
        </p>
      </div>

      {/* Procedural Acquisition Strip */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-foreground">Imaging Acquisition Status</h3>
          <div className="flex items-center gap-2">
            {overview.reviewPermission === "permitted" ? (
              <Badge variant="secondary" className="text-xs">Review Permitted</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Advisory Only</Badge>
            )}
          </div>
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
                <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
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

      {/* What We Know / What's Missing */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <h4 className="font-semibold text-sm text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            What We Know
          </h4>
          <ul className="space-y-1">
            {overview.whatWeKnow.length > 0 ? overview.whatWeKnow.map((item, i) => (
              <li key={i} className="text-sm text-emerald-700 dark:text-emerald-300">• {item}</li>
            )) : (
              <li className="text-sm text-emerald-600/60 dark:text-emerald-400/60 italic">No verified information yet</li>
            )}
          </ul>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            What's Missing
          </h4>
          <ul className="space-y-1">
            {overview.whatsMissing.length > 0 ? overview.whatsMissing.map((item, i) => (
              <li key={i} className="text-sm text-amber-700 dark:text-amber-300">• {item}</li>
            )) : (
              <li className="text-sm text-amber-600/60 dark:text-amber-400/60 italic">All requirements satisfied</li>
            )}
          </ul>
        </div>
      </div>

      {/* Case Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <FileText className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">{overview.canonDocumentCount}</div>
          <div className="text-xs text-muted-foreground">Documents</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">
            {overview.decisionTime ? "Set" : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Decision Time</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Shield className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">
            {overview.prerequisitesMet}
          </div>
          <div className="text-xs text-muted-foreground">Prerequisites Met</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Gavel className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-bold text-foreground">{overview.printoutCount}</div>
          <div className="text-xs text-muted-foreground">Printouts</div>
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
                <p className="text-sm text-muted-foreground">{nextAction}</p>
              </div>
            </div>
            <button
              onClick={handleNextAction}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-next-action"
            >
              {!overview.decisionTarget ? "Set Target" : "Go to Build"}
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
