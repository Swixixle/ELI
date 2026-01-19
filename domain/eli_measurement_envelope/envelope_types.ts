/**
 * ELI Measurement Envelope Types
 * 
 * Constitutional Reference: eli_measurement_envelope.md v1.0
 * 
 * Per Section 3.2: Measurement Envelope is a structured, immutable record.
 * Per Section 4: All fields are mandatory.
 */

import type { StratumId } from "../sre_stratum_locking";

/**
 * Measurement types per Section 3.1
 */
export type MeasurementType =
  | "epistemic_load_index"
  | "sub_score"
  | "normalized_value"
  | "threshold"
  | "comparison"
  | "category";

/**
 * Authorized uses per Section 6.1 (Exhaustive)
 */
export type AuthorizedUse =
  | "constrain_review_posture"
  | "calibrate_certainty"
  | "trigger_learning_pathway"
  | "compare_constraint_environments";

/**
 * Prohibited uses per Section 6.2 (Categorical)
 */
export type ProhibitedUse =
  | "rank_individuals"
  | "evaluate_performance"
  | "predict_behavior"
  | "justify_sanctions"
  | "proxy_evidence_fault";

/**
 * Excluded information classes per AXIOM M1
 */
export type ExcludedInformationClass =
  | "outcome_knowledge"
  | "narrative_reconstruction"
  | "post_hoc_rationalization"
  | "hindsight_expertise";

/**
 * Epistemic Volume Descriptor per Section 8
 */
export interface EpistemicVolumeDescriptor {
  readonly constraintDensity: "low" | "medium" | "high" | "extreme";
  readonly dominantLimitingAxes: readonly string[];
  readonly decisionSpaceCompression: number; // 0.0 to 1.0
}

/**
 * Measurement Envelope per Section 4 (Mandatory Fields)
 */
export interface MeasurementEnvelope {
  readonly measurement_id: string;
  readonly measurement_type: MeasurementType;
  readonly ruleset_version: string;
  readonly decision_time_anchor: string; // ISO timestamp
  readonly locked_strata_referenced: readonly StratumId[];
  readonly admissible_record_hash: string;
  readonly excluded_information_classes: readonly ExcludedInformationClass[];
  readonly dominant_constraints: readonly string[];
  readonly epistemic_volume_descriptor: EpistemicVolumeDescriptor;
  readonly authorized_uses: readonly AuthorizedUse[];
  readonly prohibited_uses: readonly ProhibitedUse[];
}

/**
 * Measurement with mandatory envelope
 * Per Section 2: A measurement without an envelope is epistemically invalid.
 */
export interface EnvelopedMeasurement<T = number> {
  readonly value: T;
  readonly envelope: MeasurementEnvelope;
}

/**
 * Validate envelope completeness per Section 4
 */
export function isEnvelopeComplete(envelope: Partial<MeasurementEnvelope>): envelope is MeasurementEnvelope {
  return !!(
    envelope.measurement_id &&
    envelope.measurement_type &&
    envelope.ruleset_version &&
    envelope.decision_time_anchor &&
    envelope.locked_strata_referenced &&
    envelope.admissible_record_hash &&
    envelope.excluded_information_classes &&
    envelope.dominant_constraints &&
    envelope.epistemic_volume_descriptor &&
    envelope.authorized_uses &&
    envelope.prohibited_uses
  );
}

/**
 * Protocol version for envelope metadata
 */
export const ELI_PROTOCOL_VERSION = "1.0";

/**
 * Standard prohibited uses that must always be included
 * Per Section 6.2: These are categorical
 */
export const MANDATORY_PROHIBITED_USES: readonly ProhibitedUse[] = Object.freeze([
  "rank_individuals",
  "evaluate_performance",
  "predict_behavior",
  "justify_sanctions",
  "proxy_evidence_fault",
]);

/**
 * Standard excluded information classes
 * Per AXIOM M1: Outcome and narrative strata are categorically excluded
 */
export const MANDATORY_EXCLUSIONS: readonly ExcludedInformationClass[] = Object.freeze([
  "outcome_knowledge",
  "narrative_reconstruction",
]);
