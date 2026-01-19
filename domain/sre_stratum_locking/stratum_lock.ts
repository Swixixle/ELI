/**
 * SRE Stratum Locking Implementation
 * 
 * Constitutional Reference: sre_stratum_locking.md v1.0
 * 
 * This module implements irreversible stratum locking with:
 * - Unidirectional visibility (AXIOM S1)
 * - Non-retroactivity (AXIOM S2)
 * - Mandatory locking before judgment (AXIOM S3, S4)
 * - Irreversibility (AXIOM S5)
 */

import { createHash } from "crypto";
import {
  type StratumId,
  type StratumRegistry,
  type StratumLockState,
  type LockMetadata,
  type LockAuthority,
  type StratumEvidence,
  STRATUM_ORDER,
  getStratumIndex,
  SRE_PROTOCOL_VERSION,
  createEmptyRegistry,
} from "./stratum_types";
import {
  SRE_REFUSAL_CODES,
  createSreRefusal,
  SreRefusalError,
  type SreRefusal,
} from "./refusal_codes";

/**
 * Lock request for a stratum
 */
export interface LockRequest {
  readonly stratum_id: StratumId;
  readonly evidence: readonly StratumEvidence[];
  readonly authority: LockAuthority;
}

/**
 * Lock result
 */
export type LockResult =
  | { readonly success: true; readonly registry: StratumRegistry; readonly metadata: LockMetadata }
  | { readonly success: false; readonly refusal: SreRefusal };

/**
 * Validation result for stratum state
 */
export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly refusal: SreRefusal };

/**
 * Compute SHA-256 hash of evidence for lock metadata
 * Per Section 5.2: admissible_record_hash is required
 */
function computeEvidenceHash(evidence: readonly StratumEvidence[]): string {
  const sorted = [...evidence].sort((a, b) => a.id.localeCompare(b.id));
  const serialized = JSON.stringify(sorted.map(e => ({
    id: e.id,
    stratum_id: e.stratum_id,
    content_hash: e.content_hash,
    timestamp: e.timestamp?.toISOString() ?? null,
  })));
  return createHash("sha256").update(serialized).digest("hex");
}

/**
 * Check if stratum can be locked given current registry state
 * Per Section 4: Lock sequence must be S1 → S2 → S3
 */
function canLockStratum(registry: StratumRegistry, stratum_id: StratumId): ValidationResult {
  const current = registry[stratum_id];
  
  if (current.locked) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.UNLOCK_ATTEMPTED, stratum_id),
    };
  }
  
  const index = getStratumIndex(stratum_id);
  
  for (let i = 0; i < index; i++) {
    const lowerStratum = STRATUM_ORDER[i];
    if (!registry[lowerStratum].locked) {
      return {
        valid: false,
        refusal: createSreRefusal(SRE_REFUSAL_CODES.INVALID_LOCK_SEQUENCE, stratum_id),
      };
    }
  }
  
  return { valid: true };
}

/**
 * Check evidence does not contain outcome contamination for S1/S2 locks
 * Per Section 4.1: No outcome data may be present at S1 lock time
 */
function checkOutcomeContamination(
  stratum_id: StratumId,
  evidence: readonly StratumEvidence[]
): ValidationResult {
  if (stratum_id === "S1" || stratum_id === "S2") {
    const outcomeEvidence = evidence.filter(e => e.stratum_id === "S3" || e.stratum_id === "S4");
    if (outcomeEvidence.length > 0) {
      return {
        valid: false,
        refusal: createSreRefusal(SRE_REFUSAL_CODES.OUTCOME_INJECTION, stratum_id),
      };
    }
  }
  
  return { valid: true };
}

/**
 * Lock a stratum
 * Per AXIOM S5: This operation is irreversible
 * Per Section 5.2: Produces immutable lock metadata
 */
export function lockStratum(
  registry: StratumRegistry,
  request: LockRequest
): LockResult {
  const canLock = canLockStratum(registry, request.stratum_id);
  if (!canLock.valid) {
    return { success: false, refusal: canLock.refusal };
  }
  
  const contamination = checkOutcomeContamination(request.stratum_id, request.evidence);
  if (!contamination.valid) {
    return { success: false, refusal: contamination.refusal };
  }
  
  const metadata: LockMetadata = Object.freeze({
    stratum_id: request.stratum_id,
    lock_timestamp: new Date().toISOString(),
    ruleset_version: SRE_PROTOCOL_VERSION,
    admissible_record_hash: computeEvidenceHash(request.evidence),
    initiating_authority: request.authority,
  });
  
  const lockedState: StratumLockState = Object.freeze({
    stratum_id: request.stratum_id,
    locked: true,
    metadata,
  });
  
  const newRegistry: StratumRegistry = Object.freeze({
    ...registry,
    [request.stratum_id]: lockedState,
  });
  
  return { success: true, registry: newRegistry, metadata };
}

/**
 * Verify lock integrity by comparing hash
 * Per Section 8.2: Lock corruption invalidates downstream outputs
 */
export function verifyLockIntegrity(
  lockState: StratumLockState,
  currentEvidence: readonly StratumEvidence[]
): ValidationResult {
  if (!lockState.locked || !lockState.metadata) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.MISSING_LOCK_METADATA, lockState.stratum_id),
    };
  }
  
  const currentHash = computeEvidenceHash(currentEvidence);
  
  if (currentHash !== lockState.metadata.admissible_record_hash) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.LOCK_HASH_MISMATCH, lockState.stratum_id),
    };
  }
  
  return { valid: true };
}

/**
 * Check visibility between strata
 * Per AXIOM S1: Higher strata may observe lower, never reverse
 */
export function checkVisibility(
  observingStratum: StratumId,
  observedStratum: StratumId
): ValidationResult {
  const observingIndex = getStratumIndex(observingStratum);
  const observedIndex = getStratumIndex(observedStratum);
  
  if (observingIndex < observedIndex) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.REVERSE_VISIBILITY, observingStratum),
    };
  }
  
  return { valid: true };
}

/**
 * Validate registry is ready for evaluation
 * Per AXIOM S3: S1 and S2 must be locked before evaluation
 * Per Section 4.4: S4 may never be used for evaluation
 */
export function validateForEvaluation(registry: StratumRegistry): ValidationResult {
  if (!registry.S1.locked) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.STRATUM_NOT_LOCKED, "S1"),
    };
  }
  
  if (!registry.S2.locked) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.STRATUM_NOT_LOCKED, "S2"),
    };
  }
  
  return { valid: true };
}

/**
 * Require locked registry or throw
 * Per AXIOM S4: Judgment without locked stratum mandates refusal
 */
export function requireLockedForEvaluation(registry: StratumRegistry): void {
  const validation = validateForEvaluation(registry);
  if (!validation.valid) {
    throw new SreRefusalError(validation.refusal);
  }
}

/**
 * Check for retroactive modification attempt
 * Per AXIOM S2: No element may be revised based on later information
 */
export function checkRetroactiveModification(
  registry: StratumRegistry,
  targetStratum: StratumId,
  modifyingStratum: StratumId
): ValidationResult {
  if (!registry[targetStratum].locked) {
    return { valid: true };
  }
  
  const targetIndex = getStratumIndex(targetStratum);
  const modifyingIndex = getStratumIndex(modifyingStratum);
  
  if (modifyingIndex > targetIndex) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.RETROACTIVE_MODIFICATION, targetStratum),
    };
  }
  
  return { valid: true };
}

/**
 * Check if narrative stratum is being used for evaluation
 * Per Section 4.4: S4 is non-authoritative, barred from evaluative authority
 */
export function checkNarrativeEvaluation(
  evaluationEvidence: readonly StratumEvidence[]
): ValidationResult {
  const narrativeEvidence = evaluationEvidence.filter(e => e.stratum_id === "S4");
  
  if (narrativeEvidence.length > 0) {
    return {
      valid: false,
      refusal: createSreRefusal(SRE_REFUSAL_CODES.NARRATIVE_EVALUATION, "S4"),
    };
  }
  
  return { valid: true };
}

export { createEmptyRegistry };
