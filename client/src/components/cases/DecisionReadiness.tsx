import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CheckCircle2, 
  XCircle, 
  Circle,
  Lock,
  Unlock,
  ArrowRight,
  Target,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import type { DecisionReadiness, CasePhase, RequirementCategory } from "@/lib/types";

const CRITERIA_EXPLAINER = [
  {
    name: "Temporal Verification",
    question: "When was the decision made?",
    why: "Without this, you cannot prevent hindsight bias, lock admissible evidence, or define what was knowable at the time."
  },
  {
    name: "Evidence Sufficiency",
    question: "What information was actually available at that time?",
    why: "This separates 'We knew X' from 'We learned X later.' Without this, outcomes rewrite memory."
  },
  {
    name: "Independent Verification",
    question: "Was any of that information independently corroborated?",
    why: "This prevents self-report bias, single-source hallucination, and narrative laundering. Every audit system requires this."
  },
  {
    name: "Policy Application",
    question: "What rule, policy, or standard governed the decision?",
    why: "Without this, decisions become ad hoc, power replaces process, and you cannot distinguish judgment from preference."
  },
  {
    name: "Contextual Constraints",
    question: "What constraints shaped the decision-maker's options?",
    why: "Time pressure, staffing, resources, emergency conditions. Without this, you punish people for not doing the impossible."
  }
];

const PHASE_CONFIG: Record<CasePhase, { label: string; description: string; order: number }> = {
  intake: { label: "Intake", description: "Get the case into a reviewable state", order: 1 },
  review: { label: "Review", description: "Determine whether a conclusion is permissible", order: 2 },
  decision: { label: "Decision", description: "Record a defensible determination", order: 3 },
  closure: { label: "Closure", description: "Preserve record for audit", order: 4 }
};

function PhaseIndicator({ currentPhase }: { currentPhase: CasePhase }) {
  const phases: CasePhase[] = ["intake", "review", "decision", "closure"];
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1 text-xs">
      {phases.map((phase, index) => {
        const config = PHASE_CONFIG[phase];
        const isActive = phase === currentPhase;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={phase} className="flex items-center">
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : isPast 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isPast && <CheckCircle2 className="h-3 w-3" />}
              <span className="font-medium">{config.label}</span>
            </div>
            {index < phases.length - 1 && (
              <ArrowRight className={`h-3 w-3 mx-1 ${isFuture ? "text-muted-foreground/50" : "text-muted-foreground"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequirementItem({ label, status, detail }: { label: string; status: "satisfied" | "missing" | "partial"; detail?: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {status === "satisfied" ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      ) : status === "partial" ? (
        <Circle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${status === "satisfied" ? "text-muted-foreground" : ""}`}>
          {label}
        </span>
        {detail && status !== "satisfied" && (
          <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: RequirementCategory }) {
  const allSatisfied = category.satisfied === category.total;

  return (
    <div className={`p-3 rounded-lg border ${allSatisfied ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{category.name}</h4>
        <Badge variant={allSatisfied ? "default" : "secondary"} className="text-xs">
          {category.satisfied}/{category.total}
        </Badge>
      </div>
      <div className="space-y-1">
        {category.requirements.map((req) => (
          <RequirementItem 
            key={req.id} 
            label={req.label} 
            status={req.status} 
            detail={req.detail}
          />
        ))}
      </div>
      {category.hint && !allSatisfied && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {category.hint}
        </p>
      )}
    </div>
  );
}

interface DecisionReadinessProps {
  readiness: DecisionReadiness;
  onSetDecisionTarget?: () => void;
}

export function DecisionReadinessPanel({ readiness, onSetDecisionTarget }: DecisionReadinessProps) {
  const progressPercent = readiness.totalRequired > 0 
    ? (readiness.totalSatisfied / readiness.totalRequired) * 100 
    : 0;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {readiness.permitted ? (
              <Unlock className="h-5 w-5 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 text-amber-500" />
            )}
            <CardTitle className="text-lg">Decision Readiness</CardTitle>
          </div>
          <Badge 
            variant={readiness.permitted ? "default" : "secondary"}
            className={readiness.permitted ? "bg-green-500" : ""}
            data-testid="permission-status"
          >
            {readiness.permitted ? "Review Eligible" : "Review Blocked"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {readiness.decisionTarget ? (
          <div className="p-3 bg-muted/50 rounded-lg border" data-testid="decision-target">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Decision Target
                </p>
                <p className="text-sm font-medium">{readiness.decisionTarget}</p>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={onSetDecisionTarget}
            className="w-full p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            data-testid="set-decision-target-btn"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  No decision target set
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  Click to define what decision this case is trying to support
                </p>
              </div>
            </div>
          </button>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Phase</span>
          </div>
          <PhaseIndicator currentPhase={readiness.phase} />
          <p className="text-xs text-muted-foreground">
            {PHASE_CONFIG[readiness.phase].description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">Procedural Prerequisites</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="btn-why-criteria">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3 border-b bg-muted/30">
                    <p className="text-xs font-semibold">Why these 5 procedural prerequisites?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      These are not arbitrary conditions. They are the minimum basis set for defensible procedural evaluation — recurring across administrative law, root cause analysis, and regulatory enforcement.
                    </p>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {CRITERIA_EXPLAINER.map((c, i) => (
                      <div key={i} className="p-2 rounded hover:bg-muted/50">
                        <p className="text-xs font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground italic mt-0.5">"{c.question}"</p>
                        <p className="text-xs text-muted-foreground mt-1">{c.why}</p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-sm text-muted-foreground">
              {readiness.totalSatisfied} of {readiness.totalRequired} present
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {/* Threshold policy interpretation */}
          <div className="text-xs space-y-1">
            <p className={readiness.permitted ? "text-green-600 dark:text-green-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
              {readiness.totalSatisfied <= 2 && "Review unsafe — advisory only"}
              {readiness.totalSatisfied === 3 && "Review permitted, high procedural risk"}
              {readiness.totalSatisfied === 4 && "Review strong, defensible"}
              {readiness.totalSatisfied >= 5 && "Review robust, regulator-ready"}
            </p>
            <p className="text-muted-foreground">
              Meeting fewer than all prerequisites does not invalidate a decision — it increases procedural risk.
            </p>
          </div>
        </div>

        {readiness.categories.length > 0 && (
          <div className="space-y-3">
            {readiness.categories.map((category) => (
              <CategorySection key={category.name} category={category} />
            ))}
          </div>
        )}

        {readiness.blockedReason && !readiness.permitted && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              <span className="font-medium">Blocked: </span>
              {readiness.blockedReason}
            </p>
          </div>
        )}

        {readiness.nextPhaseUnlocks && !readiness.permitted && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <span className="font-medium">To proceed: </span>
              {readiness.nextPhaseUnlocks}
            </p>
          </div>
        )}

        {/* Jurisdictional framing - what this means */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            What this {readiness.permitted ? "means" : "doesn't mean"}
          </p>
          {readiness.permitted ? (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-green-600 dark:text-green-400">✓ Means:</span> There is enough structural information that a fair procedural evaluation can now occur.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-500">✗ Does not mean:</span> The decision is valid, correct, or should proceed.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 italic mt-2">
                This is jurisdiction, not judgment. Like a court saying "we can hear this case" — not "we've ruled."
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                The record does not yet contain enough structural information to support a procedurally fair evaluation.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 italic mt-2">
                This does not decide the case — it decides whether the case can be decided.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
