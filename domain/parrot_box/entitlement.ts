/**
 * Parrot Box Entitlement Gate
 * 
 * Constitutional Reference: axioms.md v1.0
 * 
 * Per AXIOM A9: No interface, model, route, or downstream consumer
 * may bypass this gate. Any bypass constitutes a constitutional violation.
 * 
 * Per AXIOM A7: Given identical inputs, entitlement decisions must be identical.
 * These are pure functions with no discretion.
 */

import { REFUSAL_CODES, RefusalCode, Refusal, createRefusal } from "./refusal_codes";

export const RULESET_VERSION = "1.0.0";

/**
 * Speech acts that may be authorized by policy profile.
 * Per AXIOM A6: By default, none are permitted.
 */
export type SpeechAct = 
  | "evaluation"
  | "blame_attribution"
  | "narrative_reconstruction"
  | "recommendation"
  | "factual_report"
  | "procedural_status";

/**
 * Evidence item for entitlement checking
 */
export interface Evidence {
  readonly id: string;
  readonly timestamp: Date | null;
  readonly source: string;
  readonly isOutcomeKnowledge: boolean;
  readonly causallyRelevant: boolean | null;
  readonly contextuallyInterpretable: boolean | null;
}

/**
 * Entitlement check context
 */
export interface EntitlementContext {
  readonly dta: Date | null;
  readonly evidence: readonly Evidence[];
  readonly requestedSpeechAct: SpeechAct;
  readonly authorizedSpeechActs: readonly SpeechAct[];
}

/**
 * Triad check results
 * Per AXIOM A4: All three must pass for entitlement.
 */
export interface TriadResult {
  readonly temporal: boolean;
  readonly causal: boolean;
  readonly contextual: boolean;
  readonly failedEvidence: readonly string[];
}

/**
 * Entitlement proof
 * Per AXIOM A8: Required for every permitted output.
 */
export interface EntitlementProof {
  readonly rulesetVersion: string;
  readonly speechAct: SpeechAct;
  readonly dta: string;
  readonly evidenceIds: readonly string[];
  readonly triadResults: TriadResult;
  readonly exclusionsApplied: readonly string[];
  readonly timestamp: string;
}

/**
 * Entitlement result: either permitted with proof, or refused.
 */
export type EntitlementResult = 
  | { readonly permitted: true; readonly proof: EntitlementProof }
  | { readonly permitted: false; readonly refusal: Refusal };

/**
 * Check temporal admissibility for a single evidence item.
 * Per AXIOM A4.1: Evidence must exist and be accessible at or before DTA.
 * Per AXIOM A0: Default is inadmissible - null timestamp means inadmissible.
 */
function checkTemporalAdmissibility(evidence: Evidence, dta: Date): boolean {
  if (!evidence.timestamp) {
    return false;
  }
  return evidence.timestamp <= dta;
}

/**
 * Check causal admissibility for a single evidence item.
 * Per AXIOM A4.2: Evidence could plausibly have influenced the decision.
 * Per AXIOM A0: Default is inadmissible - null means cannot determine, thus refused.
 */
function checkCausalAdmissibility(evidence: Evidence): boolean {
  if (evidence.causallyRelevant === null) {
    return false;
  }
  return evidence.causallyRelevant;
}

/**
 * Check contextual admissibility for a single evidence item.
 * Per AXIOM A4.3: Evidence was interpretable within actor's constraints.
 * Per AXIOM A0: Default is inadmissible - null means cannot determine, thus refused.
 */
function checkContextualAdmissibility(evidence: Evidence): boolean {
  if (evidence.contextuallyInterpretable === null) {
    return false;
  }
  return evidence.contextuallyInterpretable;
}

/**
 * Check for outcome contamination.
 * Per AXIOM A3: Outcome knowledge is categorically inadmissible.
 */
function checkOutcomeContamination(evidence: Evidence): boolean {
  return evidence.isOutcomeKnowledge;
}

/**
 * Check speech act authorization.
 * Per AXIOM A6: Speech acts must be explicitly authorized.
 */
function checkSpeechActAuthorization(
  requested: SpeechAct,
  authorized: readonly SpeechAct[]
): boolean {
  return authorized.includes(requested);
}

/**
 * Main entitlement gate.
 * Per AXIOM A0: Default is inadmissible.
 * Per AXIOM A5: Refusal is terminal.
 * Per AXIOM A7: Deterministic - identical inputs yield identical outputs.
 * Per AXIOM A9: This gate cannot be bypassed.
 */
export function checkEntitlement(ctx: EntitlementContext): EntitlementResult {
  // AXIOM A2: DTA must be defined
  if (!ctx.dta) {
    return { permitted: false, refusal: createRefusal(REFUSAL_CODES.DTA_NOT_DEFINED) };
  }

  // AXIOM A6: Speech act must be authorized
  if (!checkSpeechActAuthorization(ctx.requestedSpeechAct, ctx.authorizedSpeechActs)) {
    return { permitted: false, refusal: createRefusal(REFUSAL_CODES.SPEECH_ACT_NOT_AUTHORIZED) };
  }

  // AXIOM A3 & A4: Check all evidence
  const failedEvidence: string[] = [];
  const exclusionsApplied: string[] = [];
  let temporalPass = true;
  let causalPass = true;
  let contextualPass = true;

  for (const evidence of ctx.evidence) {
    // AXIOM A3: Outcome contamination check
    if (checkOutcomeContamination(evidence)) {
      return { permitted: false, refusal: createRefusal(REFUSAL_CODES.OUTCOME_CONTAMINATION) };
    }

    // AXIOM A4.1: Temporal admissibility
    if (!checkTemporalAdmissibility(evidence, ctx.dta)) {
      temporalPass = false;
      failedEvidence.push(evidence.id);
      exclusionsApplied.push(`${evidence.id}:temporal`);
    }

    // AXIOM A4.2: Causal admissibility
    if (!checkCausalAdmissibility(evidence)) {
      causalPass = false;
      failedEvidence.push(evidence.id);
      exclusionsApplied.push(`${evidence.id}:causal`);
    }

    // AXIOM A4.3: Contextual admissibility
    if (!checkContextualAdmissibility(evidence)) {
      contextualPass = false;
      failedEvidence.push(evidence.id);
      exclusionsApplied.push(`${evidence.id}:contextual`);
    }
  }

  // AXIOM A4: Triad failure mandates refusal
  if (!temporalPass) {
    return { permitted: false, refusal: createRefusal(REFUSAL_CODES.TRIAD_TEMPORAL_FAILURE) };
  }

  if (!causalPass) {
    return { permitted: false, refusal: createRefusal(REFUSAL_CODES.TRIAD_CAUSAL_FAILURE) };
  }

  if (!contextualPass) {
    return { permitted: false, refusal: createRefusal(REFUSAL_CODES.TRIAD_CONTEXTUAL_FAILURE) };
  }

  // AXIOM A8: Construct entitlement proof
  const proof: EntitlementProof = Object.freeze({
    rulesetVersion: RULESET_VERSION,
    speechAct: ctx.requestedSpeechAct,
    dta: ctx.dta.toISOString(),
    evidenceIds: Object.freeze(ctx.evidence.map(e => e.id)),
    triadResults: Object.freeze({
      temporal: temporalPass,
      causal: causalPass,
      contextual: contextualPass,
      failedEvidence: Object.freeze(failedEvidence),
    }),
    exclusionsApplied: Object.freeze(exclusionsApplied),
    timestamp: new Date().toISOString(),
  });

  return { permitted: true, proof };
}

/**
 * Fail-closed wrapper for evaluation pipeline.
 * Per AXIOM A10: Silence is preferable to illegitimacy.
 * Per AXIOM A9: No bypass permitted.
 */
export function requireEntitlement(ctx: EntitlementContext): EntitlementProof {
  const result = checkEntitlement(ctx);
  
  if (!result.permitted) {
    throw new EntitlementRefusalError(result.refusal);
  }
  
  return result.proof;
}

/**
 * Error class for entitlement refusals.
 * Per AXIOM A5: This is terminal. No recovery permitted.
 */
export class EntitlementRefusalError extends Error {
  readonly refusal: Refusal;
  
  constructor(refusal: Refusal) {
    super(`Entitlement refused: ${refusal.code}`);
    this.name = "EntitlementRefusalError";
    this.refusal = refusal;
    Object.freeze(this);
  }
}
