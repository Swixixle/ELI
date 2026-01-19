/**
 * SRE Stratum Types
 * 
 * Constitutional Reference: sre_stratum_locking.md v1.0
 * 
 * Per Section 2: Definitions for epistemic strata and lock metadata.
 */

/**
 * Canonical Strata (Section 2.2)
 * S1 — Decision Substrate: What was knowable at the moment of decision
 * S2 — Constraint Envelope: Time pressure, resource limits, etc.
 * S3 — Outcome Knowledge: Facts revealed only after the decision
 * S4 — Narrative Reconstruction: Explanatory stories constructed post hoc
 */
export type StratumId = "S1" | "S2" | "S3" | "S4";

export const STRATUM_ORDER: readonly StratumId[] = Object.freeze(["S1", "S2", "S3", "S4"]);

export const STRATUM_NAMES: Readonly<Record<StratumId, string>> = Object.freeze({
  S1: "Decision Substrate",
  S2: "Constraint Envelope",
  S3: "Outcome Knowledge",
  S4: "Narrative Reconstruction",
});

/**
 * Lock Metadata (Section 5.2)
 * Every lock event must produce immutable metadata.
 * Locks without metadata are invalid.
 */
export interface LockMetadata {
  readonly stratum_id: StratumId;
  readonly lock_timestamp: string;
  readonly ruleset_version: string;
  readonly admissible_record_hash: string;
  readonly initiating_authority: LockAuthority;
}

/**
 * Lock Authority (Section 5.1)
 * Only designated system authorities may initiate a lock.
 * Human discretionary overrides are prohibited.
 */
export type LockAuthority = "gatekeeper_substrate" | "governance_process";

/**
 * Lock State for a single stratum
 */
export interface StratumLockState {
  readonly stratum_id: StratumId;
  readonly locked: boolean;
  readonly metadata: LockMetadata | null;
}

/**
 * Complete stratum registry state
 * Per AXIOM S5: Locks are irreversible
 */
export interface StratumRegistry {
  readonly S1: StratumLockState;
  readonly S2: StratumLockState;
  readonly S3: StratumLockState;
  readonly S4: StratumLockState;
}

/**
 * Evidence item bound to a stratum
 */
export interface StratumEvidence {
  readonly id: string;
  readonly stratum_id: StratumId;
  readonly content_hash: string;
  readonly timestamp: Date | null;
}

/**
 * Create an unlocked stratum state
 */
export function createUnlockedStratum(stratum_id: StratumId): StratumLockState {
  return Object.freeze({
    stratum_id,
    locked: false,
    metadata: null,
  });
}

/**
 * Create an empty registry (all strata unlocked)
 * Per AXIOM S3: Strata must be locked before evaluation
 */
export function createEmptyRegistry(): StratumRegistry {
  return Object.freeze({
    S1: createUnlockedStratum("S1"),
    S2: createUnlockedStratum("S2"),
    S3: createUnlockedStratum("S3"),
    S4: createUnlockedStratum("S4"),
  });
}

/**
 * Stratum ordering utilities for visibility checks
 * Per AXIOM S1: Higher strata may observe lower strata only
 */
export function getStratumIndex(stratum_id: StratumId): number {
  return STRATUM_ORDER.indexOf(stratum_id);
}

export function isHigherStratum(a: StratumId, b: StratumId): boolean {
  return getStratumIndex(a) > getStratumIndex(b);
}

export function isLowerStratum(a: StratumId, b: StratumId): boolean {
  return getStratumIndex(a) < getStratumIndex(b);
}

/**
 * Protocol version for lock metadata
 */
export const SRE_PROTOCOL_VERSION = "1.0";
