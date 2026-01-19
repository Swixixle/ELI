/**
 * Parrot Box Refusal Codes
 * 
 * Constitutional Reference: axioms.md v1.0
 * 
 * Per AXIOM A5: Refusal is a terminal success state.
 * Per AXIOM A8: Every output must include machine-checkable proof.
 * 
 * These codes are typed, stable, and non-negotiable.
 */

export const REFUSAL_CODES = {
  // AXIOM A0 — Default Inadmissibility
  DEFAULT_INADMISSIBLE: "PB_A0_DEFAULT_INADMISSIBLE",
  
  // AXIOM A1 — Entitlement Precedes Truth
  ENTITLEMENT_NOT_ESTABLISHED: "PB_A1_ENTITLEMENT_NOT_ESTABLISHED",
  
  // AXIOM A2 — Decision-Time Sovereignty
  DTA_NOT_DEFINED: "PB_A2_DTA_NOT_DEFINED",
  EVIDENCE_AFTER_DTA: "PB_A2_EVIDENCE_AFTER_DTA",
  
  // AXIOM A3 — No Outcome Contamination
  OUTCOME_CONTAMINATION: "PB_A3_OUTCOME_CONTAMINATION",
  
  // AXIOM A4 — Entitlement Triad Failure
  TRIAD_TEMPORAL_FAILURE: "PB_A4_TRIAD_TEMPORAL_FAILURE",
  TRIAD_CAUSAL_FAILURE: "PB_A4_TRIAD_CAUSAL_FAILURE",
  TRIAD_CONTEXTUAL_FAILURE: "PB_A4_TRIAD_CONTEXTUAL_FAILURE",
  
  // AXIOM A6 — Speech Act Governance
  SPEECH_ACT_NOT_AUTHORIZED: "PB_A6_SPEECH_ACT_NOT_AUTHORIZED",
  EVALUATION_NOT_PERMITTED: "PB_A6_EVALUATION_NOT_PERMITTED",
  BLAME_ATTRIBUTION_PROHIBITED: "PB_A6_BLAME_ATTRIBUTION_PROHIBITED",
  NARRATIVE_RECONSTRUCTION_PROHIBITED: "PB_A6_NARRATIVE_RECONSTRUCTION_PROHIBITED",
  RECOMMENDATION_PROHIBITED: "PB_A6_RECOMMENDATION_PROHIBITED",
  
  // AXIOM A8 — Auditability
  ENTITLEMENT_PROOF_MISSING: "PB_A8_ENTITLEMENT_PROOF_MISSING",
  
  // AXIOM A9 — Structural Supremacy
  BYPASS_ATTEMPTED: "PB_A9_BYPASS_ATTEMPTED",
} as const;

export type RefusalCode = typeof REFUSAL_CODES[keyof typeof REFUSAL_CODES];

/**
 * Refusal result structure
 * Per AXIOM A5: This is terminal. No fallback permitted.
 */
export interface Refusal {
  readonly refused: true;
  readonly code: RefusalCode;
  readonly axiom: string;
  readonly timestamp: string;
}

/**
 * Create a refusal. This is a terminal state.
 * Per AXIOM A5: No fallback, paraphrase, or "best effort" output permitted.
 */
export function createRefusal(code: RefusalCode): Refusal {
  const axiomMatch = code.match(/PB_A(\d+)/);
  const axiom = axiomMatch ? `A${axiomMatch[1]}` : "UNKNOWN";
  
  return Object.freeze({
    refused: true,
    code,
    axiom,
    timestamp: new Date().toISOString(),
  });
}
