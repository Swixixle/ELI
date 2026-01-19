/**
 * Constitutional Gate Integration Layer
 * 
 * This module wires the three constitutional pillars into the server runtime:
 * 1. Parrot Box - Speech entitlement
 * 2. SRE Stratum Locking - Temporal integrity
 * 3. ELI Measurement Envelope - Metric authority
 * 
 * CRITICAL: All evaluative operations MUST flow through this gate.
 * No bypass permitted (AXIOM A9, S5, M5).
 */

import {
  type EntitlementContext,
  type EntitlementResult,
  type Evidence,
  type SpeechAct,
  checkEntitlement,
  REFUSAL_CODES,
  EntitlementRefusalError,
  createRefusal,
  PROCEDURAL_STATUS_POLICY,
} from "../../domain/parrot_box";

import {
  type StratumRegistry,
  type StratumId,
  type StratumEvidence,
  type LockRequest,
  createEmptyRegistry,
  lockStratum,
  SRE_REFUSAL_CODES,
  SreRefusalError,
} from "../../domain/sre_stratum_locking";

import {
  type MeasurementEnvelope,
  type EnvelopedMeasurement,
  requireEnvelope,
  accessMeasurement,
  checkOutcomeBlindness,
  checkProhibitedUse,
  ELI_REFUSAL_CODES,
  EliRefusalError,
  MANDATORY_PROHIBITED_USES,
  MANDATORY_EXCLUSIONS,
  ELI_PROTOCOL_VERSION,
} from "../../domain/eli_measurement_envelope";

import { createHash } from "crypto";

/**
 * Constraint Envelope fields (Section 2.2 of SRE)
 * S2 — Constraint Envelope: Time pressure, resource limits, guideline coherence, tooling, workload, irreversibility
 */
export interface ConstraintEnvelope {
  timePressure?: "high" | "moderate" | "low" | "unknown";
  workload?: "heavy" | "normal" | "light" | "unknown";
  resourceFriction?: string[];
  guidelineCoherence?: "clear" | "ambiguous" | "conflicting" | "absent";
  irreversibility?: "high" | "moderate" | "low";
  toolingAvailable?: string[];
}

export interface ConstitutionalContext {
  caseId: string;
  decisionTimeAnchor: Date | null;
  proposedClaim?: string;
  requestedSpeechAct: SpeechAct;
  evidence?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp?: string;
    source?: string;
  }>;
  constraints?: ConstraintEnvelope;
}

export interface ConstitutionalGateResult {
  permitted: boolean;
  registry: StratumRegistry;
  entitlementResult?: EntitlementResult;
  refusalCode?: string;
  refusalMessage?: string;
  refusalAxiom?: string;
}

export interface EnvelopedScore {
  value: number;
  envelope: MeasurementEnvelope;
}

/**
 * Convert raw evidence to domain Evidence type
 */
function toEvidence(
  raw: ConstitutionalContext["evidence"],
  dta: Date | null
): Evidence[] {
  if (!raw || raw.length === 0) {
    return [];
  }
  
  return raw.map((e, idx) => ({
    id: e.id || `evidence-${idx}`,
    timestamp: e.timestamp ? new Date(e.timestamp) : null,
    source: e.source || "user_provided",
    isOutcomeKnowledge: e.type === "outcome" || e.type === "interpretation",
    causallyRelevant: e.type === "fact" || e.type === "artifact" ? true : null,
    contextuallyInterpretable: e.description ? true : null,
  }));
}

/**
 * Convert raw evidence to stratum evidence for locking
 */
function toStratumEvidence(
  raw: ConstitutionalContext["evidence"],
  stratumId: StratumId
): StratumEvidence[] {
  if (!raw || raw.length === 0) {
    return [];
  }
  
  return raw
    .filter(e => e.type === "fact" || e.type === "artifact")
    .map((e, idx) => ({
      id: e.id || `evidence-${idx}`,
      stratum_id: stratumId,
      content_hash: createHash("sha256").update(e.description || "").digest("hex"),
      timestamp: e.timestamp ? new Date(e.timestamp) : null,
      source: e.source || "user_provided",
    }));
}

/**
 * Check if a constraint value is a placeholder (inadmissible for S2 locking)
 * Per AXIOM S3: Constraint evidence must be genuine, not placeholders
 */
function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const placeholders = ["unknown", "unspecified", "n/a", "na", "none", ""];
  return placeholders.includes(value.toLowerCase().trim());
}

/**
 * Convert constraint envelope to S2 evidence
 * Per Section 2.2: S2 = Constraint Envelope (time pressure, workload, resource limits, etc.)
 * Per AXIOM S3: Placeholder values are inadmissible for S2 locking
 */
function toConstraintEvidence(
  constraints: ConstraintEnvelope | undefined,
  dta: Date | null
): StratumEvidence[] {
  if (!constraints) {
    return [];
  }
  
  const evidence: StratumEvidence[] = [];
  
  if (constraints.timePressure && !isPlaceholderValue(constraints.timePressure)) {
    evidence.push({
      id: "constraint-time-pressure",
      stratum_id: "S2",
      content_hash: createHash("sha256").update(`time_pressure:${constraints.timePressure}`).digest("hex"),
      timestamp: dta,
    });
  }
  
  if (constraints.workload && !isPlaceholderValue(constraints.workload)) {
    evidence.push({
      id: "constraint-workload",
      stratum_id: "S2",
      content_hash: createHash("sha256").update(`workload:${constraints.workload}`).digest("hex"),
      timestamp: dta,
    });
  }
  
  if (constraints.guidelineCoherence && !isPlaceholderValue(constraints.guidelineCoherence)) {
    evidence.push({
      id: "constraint-guideline-coherence",
      stratum_id: "S2",
      content_hash: createHash("sha256").update(`guideline_coherence:${constraints.guidelineCoherence}`).digest("hex"),
      timestamp: dta,
    });
  }
  
  if (constraints.irreversibility && !isPlaceholderValue(constraints.irreversibility)) {
    evidence.push({
      id: "constraint-irreversibility",
      stratum_id: "S2",
      content_hash: createHash("sha256").update(`irreversibility:${constraints.irreversibility}`).digest("hex"),
      timestamp: dta,
    });
  }
  
  if (constraints.resourceFriction && constraints.resourceFriction.length > 0) {
    evidence.push({
      id: "constraint-resource-friction",
      stratum_id: "S2",
      content_hash: createHash("sha256").update(`resource_friction:${constraints.resourceFriction.join(",")}`).digest("hex"),
      timestamp: dta,
    });
  }
  
  if (constraints.toolingAvailable && constraints.toolingAvailable.length > 0) {
    evidence.push({
      id: "constraint-tooling",
      stratum_id: "S2",
      content_hash: createHash("sha256").update(`tooling:${constraints.toolingAvailable.join(",")}`).digest("hex"),
      timestamp: dta,
    });
  }
  
  return evidence;
}

/**
 * Main constitutional gate - all evaluative requests must pass through here
 * 
 * Per AXIOM A9: No route may bypass this gate.
 */
export function passConstitutionalGate(
  context: ConstitutionalContext
): ConstitutionalGateResult {
  let registry = createEmptyRegistry();
  
  // Phase 1: Build and lock S1 (Decision Substrate)
  // Per Section 2.2: S1 = What was knowable at the moment of decision
  // DTA is an anchor WITHIN S1, not a separate stratum
  
  // AXIOM A2: DTA must be defined before any evaluation
  if (!context.decisionTimeAnchor) {
    return {
      permitted: false,
      registry,
      refusalCode: REFUSAL_CODES.DTA_NOT_DEFINED,
      refusalMessage: "Decision time anchor is required to establish S1 (Decision Substrate).",
      refusalAxiom: "A2",
    };
  }
  
  const s1Evidence = toStratumEvidence(context.evidence, "S1");
  if (s1Evidence.length === 0) {
    return {
      permitted: false,
      registry,
      refusalCode: REFUSAL_CODES.ENTITLEMENT_NOT_ESTABLISHED,
      refusalMessage: "No admissible evidence provided. S1 (Decision Substrate) cannot be locked.",
      refusalAxiom: "A0",
    };
  }
  
  // Add DTA as part of S1 evidence (the anchor for the decision substrate)
  const dtaEvidence: StratumEvidence = {
    id: "decision-time-anchor",
    stratum_id: "S1",
    content_hash: createHash("sha256").update(context.decisionTimeAnchor.toISOString()).digest("hex"),
    timestamp: context.decisionTimeAnchor,
  };
  
  const s1Request: LockRequest = {
    stratum_id: "S1",
    evidence: [dtaEvidence, ...s1Evidence],
    authority: "gatekeeper_substrate",
  };
  
  const s1Lock = lockStratum(registry, s1Request);
  if (!s1Lock.success) {
    return {
      permitted: false,
      registry,
      refusalCode: s1Lock.refusal.code,
      refusalMessage: s1Lock.refusal.message,
      refusalAxiom: "S1",
    };
  }
  registry = s1Lock.registry;
  
  // Phase 2: Lock S2 (Constraint Envelope)
  // Per Section 2.2: S2 = Time pressure, resource limits, guideline coherence, tooling, workload, irreversibility
  const s2Evidence = toConstraintEvidence(context.constraints, context.decisionTimeAnchor);
  if (s2Evidence.length === 0) {
    return {
      permitted: false,
      registry,
      refusalCode: REFUSAL_CODES.ENTITLEMENT_NOT_ESTABLISHED,
      refusalMessage: "No constraint evidence provided. S2 (Constraint Envelope) cannot be locked. Specify time pressure, workload, or other operational constraints.",
      refusalAxiom: "S3",
    };
  }
  
  const s2Request: LockRequest = {
    stratum_id: "S2",
    evidence: s2Evidence,
    authority: "gatekeeper_substrate",
  };
  
  const s2Lock = lockStratum(registry, s2Request);
  if (!s2Lock.success) {
    return {
      permitted: false,
      registry,
      refusalCode: s2Lock.refusal.code,
      refusalMessage: s2Lock.refusal.message,
      refusalAxiom: "S2",
    };
  }
  registry = s2Lock.registry;
  
  // Phase 3: Check Parrot Box entitlement
  const evidence = toEvidence(context.evidence, context.decisionTimeAnchor);
  
  const entitlementContext: EntitlementContext = {
    dta: context.decisionTimeAnchor,
    evidence,
    requestedSpeechAct: context.requestedSpeechAct,
    authorizedSpeechActs: PROCEDURAL_STATUS_POLICY.authorizedSpeechActs,
  };
  
  const entitlementResult = checkEntitlement(entitlementContext);
  
  if (!entitlementResult.permitted) {
    return {
      permitted: false,
      registry,
      entitlementResult,
      refusalCode: entitlementResult.refusal.code,
      refusalMessage: `Entitlement refused: ${entitlementResult.refusal.code}`,
      refusalAxiom: entitlementResult.refusal.axiom,
    };
  }
  
  // All gates passed
  return {
    permitted: true,
    registry,
    entitlementResult,
  };
}

/**
 * Create a properly enveloped measurement
 * Per AXIOM M5: Score cannot exist without envelope
 */
export function createEnvelopedMeasurement(
  value: number,
  context: ConstitutionalContext,
  registry: StratumRegistry
): EnvelopedScore {
  const s1Hash = registry.S1.metadata?.admissible_record_hash || "";
  const s2Hash = registry.S2.metadata?.admissible_record_hash || "";
  const combinedHash = createHash("sha256").update(s1Hash + s2Hash).digest("hex");
  
  const envelope: MeasurementEnvelope = {
    measurement_id: `eli-${context.caseId}-${Date.now()}`,
    measurement_type: "epistemic_load_index",
    ruleset_version: ELI_PROTOCOL_VERSION,
    decision_time_anchor: context.decisionTimeAnchor?.toISOString() || new Date().toISOString(),
    locked_strata_referenced: ["S1", "S2"] as readonly StratumId[],
    admissible_record_hash: combinedHash,
    excluded_information_classes: MANDATORY_EXCLUSIONS,
    dominant_constraints: ["procedural_admissibility", "temporal_boundary"],
    epistemic_volume_descriptor: {
      constraintDensity: "high",
      dominantLimitingAxes: ["temporal", "causal", "contextual"],
      decisionSpaceCompression: value,
    },
    authorized_uses: ["constrain_review_posture", "calibrate_certainty"],
    prohibited_uses: MANDATORY_PROHIBITED_USES,
  };
  
  return { value, envelope };
}

/**
 * Access a score with envelope enforcement
 * Per AXIOM M3: No interpretation without envelope inspection
 */
export function accessScore(
  measurement: EnvelopedScore
): { value: number; envelope: MeasurementEnvelope } | { refusal: { code: string; message: string } } {
  const result = accessMeasurement(measurement, true);
  
  if ("refusal" in result) {
    return {
      refusal: {
        code: result.refusal.code,
        message: result.refusal.message,
      },
    };
  }
  
  return result;
}

/**
 * Validate intended use is not prohibited
 * Per AXIOM M2: Cannot justify blame, rank individuals, etc.
 */
export function validateIntendedUse(
  envelope: MeasurementEnvelope,
  intendedUse: string
): { valid: true } | { valid: false; code: string; message: string } {
  const result = checkProhibitedUse(envelope, intendedUse);
  
  if (!result.valid) {
    return {
      valid: false,
      code: result.refusal.code,
      message: result.refusal.message,
    };
  }
  
  return { valid: true };
}

/**
 * Type guards for error handling
 */
export function isConstitutionalRefusal(error: unknown): error is EntitlementRefusalError | SreRefusalError | EliRefusalError {
  return (
    error instanceof EntitlementRefusalError ||
    error instanceof SreRefusalError ||
    error instanceof EliRefusalError
  );
}

/**
 * Format constitutional refusal for API response
 */
export function formatRefusalResponse(result: ConstitutionalGateResult): {
  error: string;
  code: string;
  axiom?: string;
  message: string;
} {
  return {
    error: "CONSTITUTIONAL_REFUSAL",
    code: result.refusalCode || "UNKNOWN",
    axiom: result.refusalAxiom,
    message: result.refusalMessage || "Request refused by constitutional gate.",
  };
}
