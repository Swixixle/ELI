import type { Case, CanonDocument, CaseEvent, DecisionTarget } from "@shared/schema";

export type ConditionStatus = {
  required: boolean;
  met: boolean;
  evidenceRefs: string[];
  missing?: {
    neededInterviews?: number;
    neededIndependentDocs?: number;
    neededPolicyRecords?: number;
    neededConstraintArtifacts?: number;
    rule?: string;
  };
  subRequirements?: Record<string, { required: boolean; met: boolean; evidenceRefs: string[] }>;
};

export type EvaluationChecklist = {
  A_decision_target_defined: ConditionStatus;
  B_temporal_verification: ConditionStatus;
  C_independent_verification: ConditionStatus;
  D_policy_application_record: ConditionStatus;
  E_contextual_constraints: ConditionStatus;
};

export type EvaluationSummary = {
  conditionsMet: number;
  conditionsTotal: number;
  status: "Decision Permitted" | "Advisory Only" | "Blocked";
  explanationPlain: string;
};

export type EvaluationResult = {
  checklist: EvaluationChecklist;
  summary: EvaluationSummary;
  gapsEquation: string[];
  canProceed: boolean;
};

export type EvaluationContext = {
  caseData: Case;
  documents: CanonDocument[];
  events: CaseEvent[];
  activeDecisionTarget: DecisionTarget | null;
};

export function evaluateCanonConditions(ctx: EvaluationContext): EvaluationResult {
  const { caseData, documents, events, activeDecisionTarget } = ctx;
  const thresholdMin = caseData.policyThresholdMin ?? 3;
  
  const checklist: EvaluationChecklist = {
    A_decision_target_defined: evaluateDecisionTarget(caseData, activeDecisionTarget),
    B_temporal_verification: evaluateTemporalVerification(caseData, documents, events),
    C_independent_verification: evaluateIndependentVerification(documents),
    D_policy_application_record: evaluatePolicyApplication(documents),
    E_contextual_constraints: evaluateContextualConstraints(documents),
  };

  const conditions = [
    checklist.A_decision_target_defined,
    checklist.B_temporal_verification,
    checklist.C_independent_verification,
    checklist.D_policy_application_record,
    checklist.E_contextual_constraints,
  ];

  const conditionsMet = conditions.filter(c => c.met).length;
  const conditionsTotal = 5;

  const temporalMet = checklist.B_temporal_verification.met;
  const targetDefined = checklist.A_decision_target_defined.met;

  let status: EvaluationSummary["status"];
  let explanationPlain: string;

  if (!targetDefined) {
    status = "Blocked";
    explanationPlain = "Decision target must be defined before evaluation can proceed.";
  } else if (conditionsMet >= thresholdMin && temporalMet) {
    status = "Decision Permitted";
    explanationPlain = `${conditionsMet} of ${conditionsTotal} readiness conditions are met, including Temporal Verification. Decision is permitted procedurally.`;
  } else {
    status = "Advisory Only";
    if (!temporalMet) {
      explanationPlain = `Temporal Verification is not met. Even with ${conditionsMet} of ${conditionsTotal} conditions, review cannot exceed advisory status.`;
    } else {
      explanationPlain = `Only ${conditionsMet} of ${conditionsTotal} conditions met. Need at least ${thresholdMin} for permitted decision.`;
    }
  }

  const gapsEquation = generateGapsEquation(checklist, thresholdMin, conditionsMet);

  return {
    checklist,
    summary: {
      conditionsMet,
      conditionsTotal,
      status,
      explanationPlain,
    },
    gapsEquation,
    canProceed: status === "Decision Permitted",
  };
}

function evaluateDecisionTarget(caseData: Case, activeTarget: DecisionTarget | null): ConditionStatus {
  const hasTarget = !!caseData.decisionTarget || !!activeTarget?.text;
  
  return {
    required: true,
    met: hasTarget,
    evidenceRefs: hasTarget ? ["system:decision_target"] : [],
    missing: hasTarget ? undefined : {
      rule: "Set a decision target to define what this case is trying to determine",
    },
  };
}

function evaluateTemporalVerification(caseData: Case, documents: CanonDocument[], events: CaseEvent[]): ConditionStatus {
  const hasDecisionTime = !!caseData.decisionTime;
  const hasTimestampedDoc = documents.some(d => d.uploadedAt != null);
  const hasSequence = events.length >= 2;
  
  const b1Met = hasDecisionTime || hasTimestampedDoc;
  const b2Met = hasSequence;
  const overallMet = b1Met && b2Met;

  return {
    required: true,
    met: overallMet,
    evidenceRefs: overallMet ? documents.slice(0, 1).map(d => `doc:${d.id}`) : [],
    subRequirements: {
      B1_timestamp_on_key_evidence: {
        required: true,
        met: b1Met,
        evidenceRefs: b1Met ? ["system:decision_time"] : [],
      },
      B2_sequence_of_events_established: {
        required: true,
        met: b2Met,
        evidenceRefs: b2Met ? events.slice(0, 2).map(e => `event:${e.id}`) : [],
      },
    },
    missing: overallMet ? undefined : {
      rule: b1Met 
        ? "Need: timeline with at least 2 ordered events" 
        : b2Met 
          ? "Need: decision-time timestamp on at least one key evidence artifact"
          : "Need: (1 decision-time timestamp) + (timeline with 2+ ordered events)",
    },
  };
}

function evaluateIndependentVerification(documents: CanonDocument[]): ConditionStatus {
  const independentDocs = documents.filter(d => 
    d.type === "interview" || 
    d.type === "external" || 
    d.name.toLowerCase().includes("interview") ||
    d.name.toLowerCase().includes("audit") ||
    d.name.toLowerCase().includes("third-party")
  );
  
  const met = independentDocs.length >= 1;

  return {
    required: true,
    met,
    evidenceRefs: met ? independentDocs.slice(0, 1).map(d => `doc:${d.id}`) : [],
    missing: met ? undefined : {
      neededInterviews: 1,
      neededIndependentDocs: 1,
      rule: "Need: (1 usable interview) OR (1 independent document)",
    },
  };
}

function evaluatePolicyApplication(documents: CanonDocument[]): ConditionStatus {
  const policyDocs = documents.filter(d => 
    d.type === "policy" || 
    d.name.toLowerCase().includes("policy") ||
    d.name.toLowerCase().includes("procedure") ||
    d.name.toLowerCase().includes("protocol")
  );
  
  const met = policyDocs.length >= 1;

  return {
    required: true,
    met,
    evidenceRefs: met ? policyDocs.slice(0, 1).map(d => `doc:${d.id}`) : [],
    missing: met ? undefined : {
      neededPolicyRecords: 1,
      rule: "Need: 1 policy application record showing how policy was applied at decision time",
    },
  };
}

function evaluateContextualConstraints(documents: CanonDocument[]): ConditionStatus {
  const constraintDocs = documents.filter(d => 
    d.name.toLowerCase().includes("constraint") ||
    d.name.toLowerCase().includes("staffing") ||
    d.name.toLowerCase().includes("resource") ||
    d.name.toLowerCase().includes("condition") ||
    d.name.toLowerCase().includes("context")
  );
  
  const met = constraintDocs.length >= 1 || documents.length >= 3;

  return {
    required: true,
    met,
    evidenceRefs: met ? (constraintDocs.length > 0 ? constraintDocs.slice(0, 1).map(d => `doc:${d.id}`) : ["inferred:sufficient_context"]) : [],
    missing: met ? undefined : {
      neededConstraintArtifacts: 1,
      rule: "Need: 1 constraints artifact (staffing/time/system conditions)",
    },
  };
}

function generateGapsEquation(checklist: EvaluationChecklist, thresholdMin: number, conditionsMet: number): string[] {
  const gaps: string[] = [];

  if (!checklist.A_decision_target_defined.met) {
    gaps.push("Decision Target: need (1 defined decision target)");
  }

  if (!checklist.B_temporal_verification.met) {
    const sub = checklist.B_temporal_verification.subRequirements;
    const b1Met = sub?.B1_timestamp_on_key_evidence?.met ?? false;
    const b2Met = sub?.B2_sequence_of_events_established?.met ?? false;
    
    if (!b1Met && !b2Met) {
      gaps.push("Temporal Verification: need (1 decision-time timestamp) + (timeline with 2+ ordered events)");
    } else if (!b1Met) {
      gaps.push("Temporal Verification: need (1 decision-time timestamp)");
    } else {
      gaps.push("Temporal Verification: need (timeline with 2+ ordered events)");
    }
  }

  if (!checklist.C_independent_verification.met) {
    gaps.push("Independent Verification: need (1 usable interview) OR (1 independent document)");
  }

  if (!checklist.D_policy_application_record.met) {
    gaps.push("Policy Application: need (1 policy application record)");
  }

  if (!checklist.E_contextual_constraints.met) {
    gaps.push("Contextual Constraints: need (1 constraints artifact)");
  }

  if (conditionsMet < thresholdMin && gaps.length > 0) {
    const remaining = thresholdMin - conditionsMet;
    gaps.unshift(`To reach ${thresholdMin}/${5}: satisfy ${remaining} more prerequisite(s)`);
  }

  return gaps;
}
