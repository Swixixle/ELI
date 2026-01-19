/**
 * SRE Stratum Locking Module
 * 
 * Constitutional Reference: sre_stratum_locking.md v1.0
 * 
 * Exports for stratum locking functionality.
 */

export {
  type StratumId,
  type StratumRegistry,
  type StratumLockState,
  type LockMetadata,
  type LockAuthority,
  type StratumEvidence,
  STRATUM_ORDER,
  STRATUM_NAMES,
  SRE_PROTOCOL_VERSION,
  createEmptyRegistry,
  createUnlockedStratum,
  getStratumIndex,
  isHigherStratum,
  isLowerStratum,
} from "./stratum_types";

export {
  SRE_REFUSAL_CODES,
  type SreRefusalCode,
  type SreRefusal,
  createSreRefusal,
  SreRefusalError,
} from "./refusal_codes";

export {
  type LockRequest,
  type LockResult,
  type ValidationResult,
  lockStratum,
  verifyLockIntegrity,
  checkVisibility,
  validateForEvaluation,
  requireLockedForEvaluation,
  checkRetroactiveModification,
  checkNarrativeEvaluation,
} from "./stratum_lock";
