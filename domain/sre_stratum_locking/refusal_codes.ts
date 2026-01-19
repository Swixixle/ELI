/**
 * SRE Stratum Locking Refusal Codes
 * 
 * Constitutional Reference: sre_stratum_locking.md v1.0
 * 
 * Per Section 8: Failure handling must produce specific refusal codes.
 */

export const SRE_REFUSAL_CODES = Object.freeze({
  STRATUM_NOT_LOCKED: "SRE_STRATUM_NOT_LOCKED",
  LOCK_HASH_MISMATCH: "SRE_LOCK_HASH_MISMATCH",
  REVERSE_VISIBILITY: "SRE_REVERSE_VISIBILITY",
  RETROACTIVE_MODIFICATION: "SRE_RETROACTIVE_MODIFICATION",
  UNLOCK_ATTEMPTED: "SRE_UNLOCK_ATTEMPTED",
  OUTCOME_INJECTION: "SRE_OUTCOME_INJECTION",
  NARRATIVE_EVALUATION: "SRE_NARRATIVE_EVALUATION",
  INVALID_LOCK_SEQUENCE: "SRE_INVALID_LOCK_SEQUENCE",
  MISSING_LOCK_METADATA: "SRE_MISSING_LOCK_METADATA",
  UNAUTHORIZED_LOCK_ACTOR: "SRE_UNAUTHORIZED_LOCK_ACTOR",
} as const);

export type SreRefusalCode = typeof SRE_REFUSAL_CODES[keyof typeof SRE_REFUSAL_CODES];

export interface SreRefusal {
  readonly code: SreRefusalCode;
  readonly stratum_id?: string;
  readonly message: string;
  readonly timestamp: string;
}

const REFUSAL_MESSAGES: Record<SreRefusalCode, string> = {
  [SRE_REFUSAL_CODES.STRATUM_NOT_LOCKED]: "Required stratum is not locked. Evaluation prior to locking is invalid.",
  [SRE_REFUSAL_CODES.LOCK_HASH_MISMATCH]: "Lock hash mismatch detected. All downstream outputs are invalidated.",
  [SRE_REFUSAL_CODES.REVERSE_VISIBILITY]: "Reverse visibility attempted. Lower strata may never observe higher strata.",
  [SRE_REFUSAL_CODES.RETROACTIVE_MODIFICATION]: "Retroactive modification detected. Outcome knowledge cannot modify decision-time strata.",
  [SRE_REFUSAL_CODES.UNLOCK_ATTEMPTED]: "Unlock attempted. Stratum locks are irreversible.",
  [SRE_REFUSAL_CODES.OUTCOME_INJECTION]: "Outcome data injection into locked stratum. Categorically forbidden.",
  [SRE_REFUSAL_CODES.NARRATIVE_EVALUATION]: "Narrative stratum used for evaluation. S4 is non-authoritative.",
  [SRE_REFUSAL_CODES.INVALID_LOCK_SEQUENCE]: "Invalid lock sequence. S1 must lock before S2, S2 before S3.",
  [SRE_REFUSAL_CODES.MISSING_LOCK_METADATA]: "Lock metadata missing. Locks without metadata are invalid.",
  [SRE_REFUSAL_CODES.UNAUTHORIZED_LOCK_ACTOR]: "Unauthorized lock actor. Only designated system authorities may initiate locks.",
};

export function createSreRefusal(code: SreRefusalCode, stratum_id?: string): SreRefusal {
  return Object.freeze({
    code,
    stratum_id,
    message: REFUSAL_MESSAGES[code],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Error class for SRE refusals
 * Per AXIOM S4: Judgment without locked stratum mandates refusal
 */
export class SreRefusalError extends Error {
  public readonly refusal: SreRefusal;
  
  constructor(refusal: SreRefusal) {
    super(`SRE Refusal [${refusal.code}]: ${refusal.message}`);
    this.name = "SreRefusalError";
    this.refusal = refusal;
    Object.freeze(this);
  }
}
