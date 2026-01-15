import { useState } from "react";
import { Message, Citation, IPSafetyFlag, UserLayerSummary, Counterfactual } from "@/lib/types";
import { CitationCard } from "./CitationCard";
import { CalculationProof } from "./CalculationProof";
import { AlertTriangle, ShieldAlert, Bot, Info, Scale, HeartPulse, Gavel, Clock, HelpCircle, ChevronDown, ChevronUp, ExternalLink, CheckCircle, AlertCircle, XCircle, FileQuestion, ArrowRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/shared/Badge";

interface MessageBubbleProps {
  message: Message;
  isAuditExpanded?: boolean;
  onToggleAudit?: () => void;
}

// Status icons and colors for user summary layer
const STATUS_CONFIG = {
  can_proceed: {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800"
  },
  needs_more: {
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800"
  },
  cannot_determine: {
    icon: FileQuestion,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  refused: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800"
  }
};

function CounterfactualPanel({ counterfactuals }: { counterfactuals: Counterfactual[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!counterfactuals || counterfactuals.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        data-testid="btn-what-would-change"
      >
        <RefreshCw className="w-3 h-3" />
        {isExpanded ? "Hide" : "What would change this?"}
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {counterfactuals.map((cf, i) => (
            <div key={i} className="p-2.5 bg-background/80 rounded-md border border-border/30 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-medium shrink-0">If:</span>
                <span className="text-foreground">{cf.condition}</span>
              </div>
              <div className="flex items-start gap-2 mt-1.5 pt-1.5 border-t border-border/30">
                <span className="text-primary font-medium shrink-0">Then:</span>
                <span className="text-foreground">{cf.wouldChange}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserSummaryCard({ summary, onShowDetails, isExpanded }: { summary: UserLayerSummary; onShowDetails: () => void; isExpanded: boolean }) {
  const config = STATUS_CONFIG[summary.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4 mb-4", config.bgColor, config.borderColor)}>
      {/* Status Header */}
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon className={cn("w-5 h-5", config.color)} />
        <span className={cn("font-semibold text-base", config.color)}>
          {summary.statusLabel}
        </span>
      </div>

      {/* What This Means */}
      <p className="text-foreground text-sm leading-relaxed mb-3">
        {summary.meaning}
      </p>

      {/* What's Missing (if applicable) */}
      {summary.missing && summary.missing.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What's missing:</span>
          <ul className="mt-1 space-y-1">
            {summary.missing.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Step */}
      <div className="flex items-start gap-2 p-3 bg-background/60 rounded-md border border-border/50">
        <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Next step:</span>
          <span className="text-sm text-foreground">{summary.nextStep}</span>
        </div>
      </div>

      {/* Counterfactual Panel - "What would change this?" */}
      {summary.counterfactuals && summary.counterfactuals.length > 0 && (
        <CounterfactualPanel counterfactuals={summary.counterfactuals} />
      )}

      {/* Show/Hide Audit Reasoning Toggle */}
      <button
        onClick={onShowDetails}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        data-testid="btn-show-audit-reasoning"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Hide audit reasoning
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Show audit reasoning
          </>
        )}
      </button>
    </div>
  );
}

// Buyer-facing labels for internal refusal types
const REFUSAL_LABELS: Record<string, { title: string; explainer: string; example: string; alternative: string }> = {
  parrot_box: {
    title: "Decision-Time Boundary",
    explainer: "This system is designed to evaluate decisions using only the information that was available at the time the decision was made. Using knowledge of what happened afterward (hindsight) would make any conclusion unfair and inadmissible in governance contexts.",
    example: "\"Why did the project fail?\" requires knowing the outcome, which wasn't available when decisions were made.",
    alternative: "Ask about process adequacy, information availability, or system constraints at decision time."
  },
  temporal_boundary: {
    title: "Outcome-Blindness Rule",
    explainer: "Questions that require explaining outcomes after the fact import inadmissible hindsight. The system cannot use knowledge of what happened to judge what 'should have been known' at the time.",
    example: "\"What went wrong?\" assumes we can trace causation backward from an outcome—which is hindsight reasoning.",
    alternative: "Ask about decision-time conditions, available information, or procedural compliance."
  },
  category_error: {
    title: "Outside Epistemic Scope",
    explainer: "This question requires a type of judgment (moral, legal, or normative) that falls outside what this system is authorized to evaluate. The system handles procedural and factual governance questions only.",
    example: "\"Was this negligent?\" requires legal/moral judgment that must come from qualified counsel.",
    alternative: "Ask about process compliance, information adequacy, or documented constraints."
  },
  medical_safety: {
    title: "Protected Health Boundary",
    explainer: "This system does not access, store, or process patient-identifiable health information. PHI requires HIPAA-compliant systems with appropriate audit trails.",
    example: "Requests for patient names, records, or medical histories are not processed.",
    alternative: "Describe the situation without patient identifiers for governance analysis."
  }
};

export function MessageBubble({ message, isAuditExpanded = false, onToggleAudit }: MessageBubbleProps) {
  const [showExplainer, setShowExplainer] = useState(false);
  const isUser = message.role === "user";
  const hasUserSummary = !!message.userSummary;
  
  const toggleAuditReasoning = () => {
    onToggleAudit?.();
  };
  const hasParrotBox = message.ipFlags?.some(f => f.type === "parrot_box");
  const hasTemporalBoundary = message.ipFlags?.some(f => f.type === "temporal_boundary");
  const hasCategoryError = message.ipFlags?.some(f => f.type === "category_error");
  const hasMedicalSafety = message.ipFlags?.some(f => f.type === "medical_safety");
  const hasTemporalPublicData = message.ipFlags?.some(f => f.type === "temporal_public_data");
  const hasAnyRefusal = hasParrotBox || hasTemporalBoundary || hasCategoryError || hasMedicalSafety || hasTemporalPublicData;
  const hasPublicData = message.citations?.some(c => c.sourceType === "public_dataset");
  
  // Determine refusal type for explainer
  const refusalType = hasMedicalSafety ? "medical_safety" : 
                      hasCategoryError ? "category_error" : 
                      hasTemporalBoundary ? "temporal_boundary" :
                      hasParrotBox ? "parrot_box" : null;
  const refusalInfo = refusalType ? REFUSAL_LABELS[refusalType] : null;

  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%]", isUser ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm" : "w-full")}>
        
        {/* User Message Interpretation Label */}
        {isUser && message.interpretation && (
          <div className="flex items-center gap-1.5 mb-2 text-[10px] text-primary-foreground/70 font-mono">
            <Info className="w-3 h-3" />
            <span>Interpreted as: {message.interpretation}</span>
          </div>
        )}
        
        {/* Assistant Header */}
        {!isUser && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">ELI Expert</span>
            </div>
            {/* Epistemic Status Line */}
            <div className="text-[10px] text-muted-foreground/70 font-mono border border-border px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <Scale className="w-3 h-3" />
              <span>
                Status: {hasAnyRefusal ? "REFUSAL" : "OK"} • {message.temporalContext || "Canon v4.0"} • {message.calcProof ? "Audited" : "Cited"}
              </span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className={cn("prose prose-sm max-w-none break-words", isUser ? "text-primary-foreground prose-invert" : "text-foreground")}>
          {/* TWO-LAYER RESPONSE: User Summary (default) + Audit Reasoning (expandable) */}
          {!isUser && hasUserSummary && (
            <>
              <UserSummaryCard 
                summary={message.userSummary!} 
                onShowDetails={toggleAuditReasoning}
                isExpanded={isAuditExpanded}
              />
              
              {/* Collapsible Audit Reasoning */}
              {isAuditExpanded && (
                <div className="border border-border/50 rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audit Reasoning</span>
                    <button
                      onClick={toggleAuditReasoning}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      data-testid="btn-hide-audit-reasoning"
                    >
                      <ChevronUp className="w-3 h-3" />
                      Hide
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm">
                    {message.content}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* STANDARD RESPONSES: No user summary, show content directly */}
          {!isUser && !hasUserSummary && (
            <>
              {hasAnyRefusal ? (
                 <div className={cn(
                   "border-l-4 p-4 rounded-r-md",
                   hasMedicalSafety ? "border-rose-500 bg-rose-50 dark:bg-rose-900/10" :
                   hasCategoryError ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10" :
                   hasTemporalPublicData ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10" :
                   "border-destructive bg-destructive/5"
                 )}>
                   <div className="flex items-center justify-between mb-2">
                     <div className={cn(
                       "flex items-center gap-2 font-bold",
                       hasMedicalSafety ? "text-rose-700 dark:text-rose-300" :
                       hasCategoryError ? "text-purple-700 dark:text-purple-300" :
                       hasTemporalPublicData ? "text-amber-700 dark:text-amber-300" :
                       "text-destructive"
                     )}>
                       {hasMedicalSafety ? <HeartPulse className="w-5 h-5" /> :
                        hasCategoryError ? <Gavel className="w-5 h-5" /> :
                        hasTemporalPublicData ? <Clock className="w-5 h-5" /> :
                        <ShieldAlert className="w-5 h-5" />}
                       <span>
                         {refusalInfo?.title || (hasTemporalPublicData ? "Temporal Data Constraint" : "Decision-Time Boundary")}
                       </span>
                     </div>
                     {refusalInfo && (
                       <button
                         onClick={() => setShowExplainer(!showExplainer)}
                         className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                         data-testid="btn-what-is-this"
                       >
                         <HelpCircle className="w-3.5 h-3.5" />
                         <span>What is this?</span>
                         {showExplainer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                       </button>
                     )}
                   </div>
                   
                   {/* Inline Explainer */}
                   {showExplainer && refusalInfo && (
                     <div className="mb-4 p-3 bg-background/50 rounded-md border border-border/50 text-sm space-y-2">
                       <p className="text-foreground leading-relaxed">{refusalInfo.explainer}</p>
                       <div className="text-muted-foreground">
                         <span className="font-semibold">Example: </span>
                         <span className="italic">{refusalInfo.example}</span>
                       </div>
                       <div className="text-muted-foreground">
                         <span className="font-semibold">Instead: </span>
                         {refusalInfo.alternative}
                       </div>
                       <a 
                         href="/about#glossary" 
                         className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1"
                         data-testid="link-learn-more"
                       >
                         <ExternalLink className="w-3 h-3" />
                         Learn more in How It Works
                       </a>
                     </div>
                   )}
                   
                   <div className="text-foreground text-sm font-medium whitespace-pre-wrap leading-relaxed">
                     {message.content}
                   </div>
                 </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content.split(/(\[CITATION:[^\]]+\])/).map((part, i) => {
                     return part;
                  })}
                </div>
              )}
            </>
          )}
          
          {/* USER MESSAGE: Just content */}
          {isUser && (
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          )}
        </div>

        {/* Public Data Provenance Banner (Inline) */}
        {!isUser && hasPublicData && message.citations?.filter(c => c.sourceType === "public_dataset").map(citation => (
          <div key={citation.id} className="mt-3 bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-400 p-3 rounded-r-sm text-xs">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-semibold mb-1">
              <Info className="w-3 h-3" />
              <span>Public Data Provenance: {citation.provenance?.institution || "External Source"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-700/80 dark:text-blue-300/80 font-mono text-[10px]">
              <span>Dataset: {citation.title}</span>
              <span>Data As-Of: {citation.provenance?.asOf || citation.date}</span>
              <span>Retrieved: {citation.provenance?.retrievedAt ? new Date(citation.provenance.retrievedAt).toLocaleDateString() : "N/A"}</span>
              <span>Dataset ID: {citation.datasetId || "N/A"}</span>
              {citation.provenance?.limitations && (
                <span className="col-span-2 italic opacity-80">Note: {citation.provenance.limitations}</span>
              )}
            </div>
          </div>
        ))}

        {/* Citations Footer */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1">Sources:</span>
            {message.citations.map((c) => (
              <CitationCard key={c.id} citation={c} />
            ))}
          </div>
        )}

        {/* Calculation Proof */}
        {!isUser && message.calcProof && (
          <CalculationProof proof={message.calcProof} />
        )}

        {/* IP Safety Flags (Visual Indicators) */}
        {!isUser && message.ipFlags && message.ipFlags.length > 0 && !hasAnyRefusal && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.ipFlags.map((flag, idx) => (
              <div key={idx} className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border",
                flag.type === "sales_unverified" 
                  ? "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/20 dark:text-violet-200 dark:border-violet-800"
                  : "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800"
              )}>
                <AlertTriangle className="w-3 h-3" />
                <span>{flag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Visual Spec Placeholder (e.g. Table/Slider) */}
        {!isUser && message.visualSpec && (
          <div className="mt-4 p-4 border rounded bg-card shadow-sm">
             <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 border-b pb-2">
               {message.visualSpec.type === "cfo_table" ? "Comparative Analysis" : "Sensitivity Model"}
             </div>
             {/* Mock rendering of visuals */}
             {message.visualSpec.type === "cfo_table" && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      {message.visualSpec.data.headers.map((h: string) => <th key={h} className="pb-2 font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {message.visualSpec.data.rows.map((row: string[], idx: number) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={cn("py-2", cIdx === 0 ? "font-medium text-foreground" : "font-mono text-muted-foreground")}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
             
             {message.visualSpec.type === "sensitivity_slider" && (
               <div className="py-4">
                 <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                   <span>{message.visualSpec.data.min.toLocaleString()}</span>
                   <span>{message.visualSpec.data.max.toLocaleString()}</span>
                 </div>
                 <div className="h-2 bg-muted rounded-full relative overflow-hidden">
                   {/* Target Zone */}
                   <div 
                      className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/50"
                      style={{ 
                        left: "20%", 
                        width: "60%" 
                      }} 
                   />
                   {/* Indicator */}
                   <div 
                      className="absolute top-0 bottom-0 w-1 bg-primary z-10" 
                      style={{ left: "50%" }}
                   />
                 </div>
                 <div className="mt-2 text-center">
                   <span className="text-sm font-bold text-foreground">{message.visualSpec.data.current.toLocaleString()}</span>
                   <p className="text-xs text-muted-foreground">{message.visualSpec.data.label}</p>
                 </div>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
