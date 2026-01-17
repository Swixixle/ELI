/**
 * Case Lifecycle Service
 * 
 * Computes canonical case_stage, prereq_status, and next_action from persisted facts.
 * This is the single source of truth for case state - no client-side derivation.
 */

import type { Case, CanonDocument, CaseEvent, DecisionTarget, Determination, CasePrintout } from "@shared/schema";

// Canonical Case Stages (A1 from spec)
export const CASE_STAGES = [
  "INTAKE_EMPTY",        // No documents attached
  "TARGET_REQUIRED",     // Documents exist but target missing
  "TIME_REQUIRED",       // Target set but decision time missing (if required)
  "POLICY_REQUIRED",     // Governing policy missing
  "CONSTRAINTS_REQUIRED",// Constraints missing
  "READY_FOR_EVALUATION",// All prerequisites satisfied
  "EVALUATED",           // Evaluation exists for current decision context
  "SEALED"               // Immutable record created (printout)
] as const;

export type CaseStage = typeof CASE_STAGES[number];

// Prerequisite Status (A2 from spec)
export interface PrereqStatus {
  has_documents: boolean;
  has_target: boolean;
  has_decision_time: boolean;
  decision_time_mode: "live" | "fixed";
  has_policy: boolean;
  has_constraints: boolean;
  has_independent_verification: boolean;
  has_timeline_event: boolean;
  has_evaluation_for_current_context: boolean;
  has_seal: boolean;
}

// Next Action (C1 from spec)
export interface NextAction {
  label: string;
  description: string;
  route: string;
  anchor?: string;
  blocking_prereqs: string[];
  action_type: "navigation" | "modal" | "api_call";
}

// Complete Lifecycle Status
export interface CaseLifecycle {
  case_stage: CaseStage;
  prereq_status: PrereqStatus;
  next_action: NextAction;
  prerequisites_met: number;
  prerequisites_total: number;
  review_permission: "blocked" | "advisory_only" | "permitted";
  what_we_know: string[];
  what_is_missing: string[];
}

interface LifecycleContext {
  caseData: Case;
  documents: CanonDocument[];
  events: CaseEvent[];
  activeDecisionTarget: DecisionTarget | null;
  latestDetermination: Determination | null;
  printouts: CasePrintout[];
}

/**
 * Compute prerequisite status from persisted facts only
 */
function computePrereqStatus(ctx: LifecycleContext): PrereqStatus {
  const { caseData, documents, events, activeDecisionTarget, latestDetermination, printouts } = ctx;
  
  // Documents check
  const has_documents = documents.length > 0;
  
  // Target check - either legacy field or active decision target
  const has_target = !!(activeDecisionTarget?.text || caseData.decisionTarget);
  
  // Decision time check
  const has_decision_time = !!caseData.decisionTime;
  const decision_time_mode = (caseData.decisionTimeMode as "live" | "fixed") || "live";
  
  // Policy check - look for policy-tagged documents or policy events
  const has_policy = documents.some(d => 
    d.name.toLowerCase().includes("policy") || 
    d.type === "policy"
  ) || events.some(e => 
    e.eventType === "POLICY_ATTACHED" || 
    e.description?.toLowerCase().includes("policy")
  );
  
  // Constraints check - look for constraints documentation
  const has_constraints = events.some(e => 
    e.eventType === "CONSTRAINTS_DOCUMENTED" ||
    e.description?.toLowerCase().includes("constraint")
  ) || documents.some(d => 
    d.name.toLowerCase().includes("constraint")
  );
  
  // Independent verification - third-party confirmation
  const has_independent_verification = events.some(e => 
    e.eventType === "INDEPENDENT_VERIFICATION" ||
    e.description?.toLowerCase().includes("independent") ||
    e.description?.toLowerCase().includes("third-party") ||
    e.description?.toLowerCase().includes("corroboration")
  );
  
  // Timeline events for temporal verification
  const has_timeline_event = events.some(e => 
    e.eventType === "EVIDENCE_ADDED" ||
    e.eventType === "TIMELINE_EVENT" ||
    (e.eventTime && e.sourceDocId)
  );
  
  // Evaluation exists for current context
  const has_evaluation_for_current_context = !!(latestDetermination && 
    latestDetermination.caseStateHash);
  
  // Sealed artifacts
  const has_seal = printouts.length > 0;
  
  return {
    has_documents,
    has_target,
    has_decision_time,
    decision_time_mode,
    has_policy,
    has_constraints,
    has_independent_verification,
    has_timeline_event,
    has_evaluation_for_current_context,
    has_seal
  };
}

/**
 * Derive case_stage from prereq_status (deterministic state machine)
 */
function computeCaseStage(prereqs: PrereqStatus): CaseStage {
  // Check from most complete state to least complete
  if (prereqs.has_seal) {
    return "SEALED";
  }
  
  if (prereqs.has_evaluation_for_current_context) {
    return "EVALUATED";
  }
  
  // Ready for evaluation if we have minimum prerequisites (3+)
  const prereqCount = [
    prereqs.has_target,
    prereqs.has_decision_time || prereqs.decision_time_mode === "live",
    prereqs.has_policy,
    prereqs.has_constraints,
    prereqs.has_independent_verification
  ].filter(Boolean).length;
  
  if (prereqCount >= 3 && prereqs.has_target && prereqs.has_documents) {
    return "READY_FOR_EVALUATION";
  }
  
  // Check what's missing in priority order
  if (!prereqs.has_documents) {
    return "INTAKE_EMPTY";
  }
  
  if (!prereqs.has_target) {
    return "TARGET_REQUIRED";
  }
  
  // For fixed mode, decision time is required
  if (prereqs.decision_time_mode === "fixed" && !prereqs.has_decision_time) {
    return "TIME_REQUIRED";
  }
  
  if (!prereqs.has_policy) {
    return "POLICY_REQUIRED";
  }
  
  if (!prereqs.has_constraints) {
    return "CONSTRAINTS_REQUIRED";
  }
  
  // Default to ready if we got this far
  return "READY_FOR_EVALUATION";
}

/**
 * Compute the single canonical next_action (C1 from spec)
 */
function computeNextAction(caseId: string, stage: CaseStage, prereqs: PrereqStatus): NextAction {
  switch (stage) {
    case "INTAKE_EMPTY":
      return {
        label: "Upload Documents",
        description: "Add governing policies or evidence documents to begin",
        route: `/cases/${caseId}/build`,
        anchor: "documents",
        blocking_prereqs: ["has_documents"],
        action_type: "navigation"
      };
    
    case "TARGET_REQUIRED":
      return {
        label: "Set Decision Target",
        description: "Define what decision this case is evaluating",
        route: `/cases/${caseId}/build`,
        anchor: "target-modal",
        blocking_prereqs: ["has_target"],
        action_type: "modal"
      };
    
    case "TIME_REQUIRED":
      return {
        label: "Set Decision Time",
        description: "Anchor the temporal boundary for outcome-blind evaluation",
        route: `/cases/${caseId}/overview`,
        anchor: "time-modal",
        blocking_prereqs: ["has_decision_time"],
        action_type: "modal"
      };
    
    case "POLICY_REQUIRED":
      return {
        label: "Attach Governing Policy",
        description: "Upload or tag the policy that governed this decision",
        route: `/cases/${caseId}/build`,
        anchor: "policy",
        blocking_prereqs: ["has_policy"],
        action_type: "navigation"
      };
    
    case "CONSTRAINTS_REQUIRED":
      return {
        label: "Document Constraints",
        description: "Record the contextual constraints the decision-maker faced",
        route: `/cases/${caseId}/build`,
        anchor: "constraints",
        blocking_prereqs: ["has_constraints"],
        action_type: "navigation"
      };
    
    case "READY_FOR_EVALUATION":
      return {
        label: "Run Evaluation",
        description: "Generate procedural assessment for current decision context",
        route: `/cases/${caseId}/evaluate`,
        blocking_prereqs: [],
        action_type: "navigation"
      };
    
    case "EVALUATED":
      return {
        label: "Seal Artifact",
        description: "Create an immutable judgment record from the evaluation",
        route: `/cases/${caseId}/audit`,
        anchor: "seal",
        blocking_prereqs: [],
        action_type: "navigation"
      };
    
    case "SEALED":
      return {
        label: "View Judgment Record",
        description: "Review the sealed, immutable artifact",
        route: `/cases/${caseId}/audit`,
        anchor: "printouts",
        blocking_prereqs: [],
        action_type: "navigation"
      };
  }
}

/**
 * Compute what_we_know / what_is_missing lists from prereqs
 */
function computeKnowledgeLists(prereqs: PrereqStatus): { what_we_know: string[]; what_is_missing: string[] } {
  const what_we_know: string[] = [];
  const what_is_missing: string[] = [];
  
  if (prereqs.has_documents) {
    what_we_know.push("Documents attached");
  } else {
    what_is_missing.push("No documents uploaded");
  }
  
  if (prereqs.has_target) {
    what_we_know.push("Decision target defined");
  } else {
    what_is_missing.push("Decision target not set");
  }
  
  if (prereqs.has_decision_time) {
    what_we_know.push("Decision time anchored");
  } else if (prereqs.decision_time_mode === "fixed") {
    what_is_missing.push("Decision time not set (fixed mode)");
  } else {
    what_we_know.push("Using live decision time");
  }
  
  if (prereqs.has_policy) {
    what_we_know.push("Governing policy identified");
  } else {
    what_is_missing.push("No governing policy attached");
  }
  
  if (prereqs.has_constraints) {
    what_we_know.push("Contextual constraints documented");
  } else {
    what_is_missing.push("Constraints not documented");
  }
  
  if (prereqs.has_independent_verification) {
    what_we_know.push("Independent verification present");
  } else {
    what_is_missing.push("No independent verification");
  }
  
  if (prereqs.has_timeline_event) {
    what_we_know.push("Timeline events recorded");
  } else {
    what_is_missing.push("No timestamped evidence");
  }
  
  if (prereqs.has_evaluation_for_current_context) {
    what_we_know.push("Evaluation completed");
  }
  
  if (prereqs.has_seal) {
    what_we_know.push("Judgment record sealed");
  }
  
  return { what_we_know, what_is_missing };
}

/**
 * Main lifecycle computation - the single source of truth
 */
export function computeCaseLifecycle(ctx: LifecycleContext): CaseLifecycle {
  const prereq_status = computePrereqStatus(ctx);
  const case_stage = computeCaseStage(prereq_status);
  const next_action = computeNextAction(ctx.caseData.id, case_stage, prereq_status);
  const { what_we_know, what_is_missing } = computeKnowledgeLists(prereq_status);
  
  // Count prerequisites met (5 core prerequisites)
  const prerequisites_met = [
    prereq_status.has_target,
    prereq_status.has_decision_time || prereq_status.decision_time_mode === "live",
    prereq_status.has_policy,
    prereq_status.has_constraints,
    prereq_status.has_independent_verification
  ].filter(Boolean).length;
  
  // Determine review permission
  let review_permission: "blocked" | "advisory_only" | "permitted";
  if (!prereq_status.has_target || !prereq_status.has_documents) {
    review_permission = "blocked";
  } else if (prerequisites_met < 3) {
    review_permission = "advisory_only";
  } else {
    review_permission = "permitted";
  }
  
  return {
    case_stage,
    prereq_status,
    next_action,
    prerequisites_met,
    prerequisites_total: 5,
    review_permission,
    what_we_know,
    what_is_missing
  };
}
