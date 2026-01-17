import { useRoute, useLocation } from "wouter";
import { CaseLayout } from "./CaseLayout";
import { useCaseOverview } from "@/lib/casesApi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, ArrowRight, FileText, Clock, Shield, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function CaseOverviewPage() {
  const [, params] = useRoute("/cases/:caseId/overview");
  const [, navigate] = useLocation();
  const caseId = params?.caseId;
  
  const { data: overview, isLoading } = useCaseOverview(caseId || null);
  
  if (!caseId) {
    navigate("/");
    return null;
  }
  
  return (
    <CaseLayout activeTab="overview">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          {overview && (
            <>
              <LifecycleStageCard 
                stage={overview.lifecycle.case_stage}
                reviewPermission={overview.lifecycle.review_permission}
              />
              
              <PrerequisitesPanel prereqs={overview.lifecycle.prereq_status} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KnowledgeCard 
                  title="What We Know"
                  items={overview.lifecycle.what_we_know}
                  variant="success"
                />
                <KnowledgeCard 
                  title="What's Missing"
                  items={overview.lifecycle.what_is_missing}
                  variant="warning"
                />
              </div>
              
              <CaseSummaryCard overview={overview} />
              
              <NextActionCard 
                nextAction={overview.lifecycle.next_action}
                caseId={caseId}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </CaseLayout>
  );
}

function LifecycleStageCard({ stage, reviewPermission }: { stage: string; reviewPermission: string }) {
  const stageLabels: Record<string, { label: string; description: string; color: string }> = {
    "INTAKE_EMPTY": { 
      label: "Intake - Empty", 
      description: "Upload documents to begin building the case",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    },
    "TARGET_REQUIRED": { 
      label: "Target Required", 
      description: "Set the decision target to define what this case is evaluating",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    },
    "TIME_REQUIRED": { 
      label: "Decision Time Required", 
      description: "Anchor the decision time to establish temporal boundaries",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    },
    "POLICY_REQUIRED": { 
      label: "Policy Required", 
      description: "Attach the governing policy or standard",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    },
    "CONSTRAINTS_REQUIRED": { 
      label: "Constraints Required", 
      description: "Document the contextual constraints",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
    },
    "READY_FOR_EVALUATION": { 
      label: "Ready for Evaluation", 
      description: "All prerequisites met - run the evaluation",
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
    },
    "EVALUATED": { 
      label: "Evaluated", 
      description: "Evaluation complete - seal the artifact when ready",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
    },
    "SEALED": { 
      label: "Sealed", 
      description: "Immutable judgment record created",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
    }
  };
  
  const info = stageLabels[stage] || { label: stage, description: "", color: "bg-gray-100" };
  
  return (
    <div className={cn("rounded-xl p-5 border", info.color)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{info.label}</h3>
          <p className="text-sm opacity-80 mt-1">{info.description}</p>
        </div>
        <div className="text-right">
          <span className={cn(
            "inline-flex px-2 py-1 rounded text-xs font-medium",
            reviewPermission === "permitted" ? "bg-green-200 text-green-800" :
            reviewPermission === "advisory_only" ? "bg-amber-200 text-amber-800" :
            "bg-red-200 text-red-800"
          )}>
            {reviewPermission === "permitted" ? "Review Permitted" :
             reviewPermission === "advisory_only" ? "Advisory Only" : "Blocked"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PrerequisitesPanel({ prereqs }: { prereqs: any }) {
  const items = [
    { key: "has_documents", label: "Documents", met: prereqs.has_documents },
    { key: "has_target", label: "Decision Target", met: prereqs.has_target },
    { key: "has_decision_time", label: "Decision Time", met: prereqs.has_decision_time || prereqs.decision_time_mode === "live" },
    { key: "has_policy", label: "Governing Policy", met: prereqs.has_policy },
    { key: "has_constraints", label: "Constraints", met: prereqs.has_constraints },
    { key: "has_independent_verification", label: "Independent Verification", met: prereqs.has_independent_verification },
  ];
  
  return (
    <div className="border rounded-xl p-5 bg-card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Prerequisite Status
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <div 
            key={item.key}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border text-sm",
              item.met 
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                : "bg-muted/30 border-border text-muted-foreground"
            )}
          >
            {item.met ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnowledgeCard({ title, items, variant }: { title: string; items: string[]; variant: "success" | "warning" }) {
  const Icon = variant === "success" ? CheckCircle : AlertCircle;
  
  return (
    <div className={cn(
      "border rounded-xl p-5",
      variant === "success" 
        ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
        : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
    )}>
      <h3 className={cn(
        "font-semibold mb-3 flex items-center gap-2",
        variant === "success" ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"
      )}>
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">None</p>
      )}
    </div>
  );
}

function CaseSummaryCard({ overview }: { overview: any }) {
  return (
    <div className="border rounded-xl p-5 bg-card">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Case Summary
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Decision Target</span>
          <p className="font-medium mt-1">{overview.decisionTarget || "Not set"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Decision Time</span>
          <p className="font-medium mt-1">
            {overview.decisionTime 
              ? format(new Date(overview.decisionTime), "MMM d, yyyy HH:mm")
              : "Live (current time)"}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Documents</span>
          <p className="font-medium mt-1">{overview.canonDocumentCount} attached</p>
        </div>
        <div>
          <span className="text-muted-foreground">Timeline Events</span>
          <p className="font-medium mt-1">{overview.evidenceItemCount} recorded</p>
        </div>
      </div>
    </div>
  );
}

function NextActionCard({ nextAction, caseId }: { nextAction: any; caseId: string }) {
  const [, navigate] = useLocation();
  
  const handleClick = () => {
    if (nextAction.action_type === "navigation") {
      navigate(nextAction.route);
    } else if (nextAction.action_type === "modal") {
      navigate(`${nextAction.route}?open=${nextAction.anchor}`);
    }
  };
  
  return (
    <div className="border-2 border-primary/30 rounded-xl p-5 bg-primary/5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{nextAction.label}</h3>
          <p className="text-sm text-muted-foreground mt-1">{nextAction.description}</p>
        </div>
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-overview-next-action"
        >
          Go
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
