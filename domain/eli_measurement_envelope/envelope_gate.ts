/**
 * ELI Measurement Envelope Gate
 * 
 * Constitutional Reference: eli_measurement_envelope.md v1.0
 * 
 * Per AXIOM M5: No interface may expose a measurement without its envelope.
 * Per Section 9: Prohibited transformations must be detected and refused.
 */

import { createHash } from "crypto";
import type { StratumRegistry } from "../sre_stratum_locking";
import {
  type MeasurementEnvelope,
  type EnvelopedMeasurement,
  type ProhibitedUse,
  type AuthorizedUse,
  isEnvelopeComplete,
  MANDATORY_PROHIBITED_USES,
} from "./envelope_types";
import {
  ELI_REFUSAL_CODES,
  createEliRefusal,
  EliRefusalError,
  type EliRefusal,
} from "./refusal_codes";

export type EnvelopeValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly refusal: EliRefusal };

/**
 * Validate envelope is present and complete
 * Per Section 4: Measurements lacking complete envelope are invalid
 */
export function validateEnvelopePresent<T = number>(
  measurement: Partial<EnvelopedMeasurement<T>> | null | undefined
): EnvelopeValidationResult {
  if (!measurement) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.ENVELOPE_MISSING) };
  }
  
  if (!measurement.envelope) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.ENVELOPE_MISSING) };
  }
  
  if (!isEnvelopeComplete(measurement.envelope)) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.ENVELOPE_INCOMPLETE) };
  }
  
  return { valid: true };
}

/**
 * Check for outcome knowledge in measurement sources
 * Per AXIOM M1: Only S1 and S2 strata may be used
 */
export function checkOutcomeBlindness(envelope: MeasurementEnvelope): EnvelopeValidationResult {
  const hasOutcome = envelope.locked_strata_referenced.some(s => s === "S3" || s === "S4");
  
  if (hasOutcome) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.OUTCOME_IN_MEASUREMENT) };
  }
  
  return { valid: true };
}

/**
 * Check for prohibited use invocation
 * Per AXIOM M2 and Section 6.2: These uses are categorically forbidden
 */
export function checkProhibitedUse(
  envelope: MeasurementEnvelope,
  intendedUse: string
): EnvelopeValidationResult {
  const blameUses = ["assign_blame", "justify_discipline", "justify_sanctions", "infer_competence"];
  const rankingUses = ["rank_individuals", "evaluate_performance", "predict_behavior"];
  
  if (blameUses.includes(intendedUse)) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.BLAME_JUSTIFICATION) };
  }
  
  if (rankingUses.includes(intendedUse)) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.INDIVIDUAL_RANKING) };
  }
  
  const prohibitedUse = envelope.prohibited_uses.find(p => p === intendedUse);
  if (prohibitedUse) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.PROHIBITED_USE_INVOKED) };
  }
  
  return { valid: true };
}

/**
 * Check authorized use
 * Per Section 6.1: Only exhaustive list of uses permitted
 */
export function checkAuthorizedUse(
  envelope: MeasurementEnvelope,
  intendedUse: AuthorizedUse
): EnvelopeValidationResult {
  if (!envelope.authorized_uses.includes(intendedUse)) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.PROHIBITED_USE_INVOKED) };
  }
  
  return { valid: true };
}

/**
 * Check envelope compatibility for comparison
 * Per AXIOM M4: Comparison requires compatible envelopes
 */
export function checkEnvelopeCompatibility(
  envelope1: MeasurementEnvelope,
  envelope2: MeasurementEnvelope
): EnvelopeValidationResult {
  const constraints1 = new Set(envelope1.dominant_constraints);
  const constraints2 = new Set(envelope2.dominant_constraints);
  
  const intersection = [...constraints1].filter(c => constraints2.has(c));
  if (intersection.length === 0) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.INCOMPATIBLE_COMPARISON) };
  }
  
  const axes1 = envelope1.epistemic_volume_descriptor.dominantLimitingAxes;
  const axes2 = envelope2.epistemic_volume_descriptor.dominantLimitingAxes;
  const axesMatch = axes1.some(a => axes2.includes(a));
  
  if (!axesMatch) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.INCOMPATIBLE_COMPARISON) };
  }
  
  return { valid: true };
}

/**
 * Detect envelope stripping attempt
 * Per AXIOM M5: Separating score from envelope is constitutional violation
 */
export function detectEnvelopeStripping<T>(
  value: T,
  envelope: MeasurementEnvelope | null | undefined
): EnvelopeValidationResult {
  if (!envelope) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.ENVELOPE_STRIPPED) };
  }
  
  return { valid: true };
}

/**
 * Verify envelope hash matches stratum registry
 * Per Section 12.2: Hash mismatch invalidates measurement
 */
export function verifyEnvelopeIntegrity(
  envelope: MeasurementEnvelope,
  expectedHash: string
): EnvelopeValidationResult {
  if (envelope.admissible_record_hash !== expectedHash) {
    return { valid: false, refusal: createEliRefusal(ELI_REFUSAL_CODES.ENVELOPE_HASH_MISMATCH) };
  }
  
  return { valid: true };
}

/**
 * Require envelope for any measurement exposure
 * Per AXIOM M5: No bypass permitted
 */
export function requireEnvelope<T>(measurement: EnvelopedMeasurement<T> | null | undefined): EnvelopedMeasurement<T> {
  const validation = validateEnvelopePresent(measurement);
  
  if (!validation.valid) {
    throw new EliRefusalError(validation.refusal);
  }
  
  return measurement!;
}

/**
 * Safe measurement accessor that ensures envelope is always present
 * Per Section 2: Envelope is authoritative; numeric value is subordinate
 */
export function accessMeasurement<T>(
  measurement: EnvelopedMeasurement<T>,
  acknowledgeEnvelope: boolean
): { value: T; envelope: MeasurementEnvelope } | { refusal: EliRefusal } {
  if (!acknowledgeEnvelope) {
    return { refusal: createEliRefusal(ELI_REFUSAL_CODES.NO_ENVELOPE_INSPECTION) };
  }
  
  const validation = validateEnvelopePresent(measurement);
  if (!validation.valid) {
    return { refusal: validation.refusal };
  }
  
  const outcomeCheck = checkOutcomeBlindness(measurement.envelope);
  if (!outcomeCheck.valid) {
    return { refusal: outcomeCheck.refusal };
  }
  
  return { value: measurement.value, envelope: measurement.envelope };
}

/**
 * Compare two measurements with envelope compatibility check
 * Per AXIOM M4: Scalar similarity without envelope compatibility is invalid
 */
export function compareMeasurements<T>(
  m1: EnvelopedMeasurement<T>,
  m2: EnvelopedMeasurement<T>,
  intendedUse: AuthorizedUse
): EnvelopeValidationResult {
  const v1 = validateEnvelopePresent(m1);
  if (!v1.valid) return v1;
  
  const v2 = validateEnvelopePresent(m2);
  if (!v2.valid) return v2;
  
  const useCheck1 = checkAuthorizedUse(m1.envelope, intendedUse);
  if (!useCheck1.valid) return useCheck1;
  
  const useCheck2 = checkAuthorizedUse(m2.envelope, intendedUse);
  if (!useCheck2.valid) return useCheck2;
  
  const compatibility = checkEnvelopeCompatibility(m1.envelope, m2.envelope);
  if (!compatibility.valid) return compatibility;
  
  return { valid: true };
}
