/**
 * Parrot Box — Stratum Integration
 * 
 * Constitutional Reference: 
 * - sre_stratum_locking.md v1.0, Section 7
 * - axioms.md v1.0
 * 
 * Per Section 7: The Parrot Box depends on stratum locking.
 * - Entitlement checks must reference locked strata only.
 * - Any request involving unlocked strata must be refused.
 * - Outcome-contaminated inputs must trigger Parrot Box refusal codes.
 * 
 * Stratum locking is a precondition for legitimate speech.
 */

import { type EntitlementContext, type EntitlementResult, checkEntitlement } from "./entitlement";
import { REFUSAL_CODES, createRefusal, type Refusal } from "./refusal_codes";
import {
  type StratumRegistry,
  validateForEvaluation,
  checkNarrativeEvaluation,
  type StratumEvidence,
  SRE_REFUSAL_CODES,
} from "../sre_stratum_locking";

export interface StratumGatedContext extends EntitlementContext {
  readonly stratumRegistry: StratumRegistry;
  readonly stratumEvidence: readonly StratumEvidence[];
}

export type StratumGatedResult =
  | { readonly permitted: true; readonly proof: EntitlementResult & { permitted: true } }
  | { readonly permitted: false; readonly refusal: Refusal; readonly sreCode?: string };

/**
 * Check entitlement with stratum preconditions.
 * Per Section 7: Stratum locking is a precondition for legitimate speech.
 */
export function checkEntitlementWithStrata(ctx: StratumGatedContext): StratumGatedResult {
  const evalValidation = validateForEvaluation(ctx.stratumRegistry);
  if (!evalValidation.valid) {
    return {
      permitted: false,
      refusal: createRefusal(REFUSAL_CODES.STRATUM_NOT_LOCKED),
      sreCode: evalValidation.refusal.code,
    };
  }
  
  const narrativeCheck = checkNarrativeEvaluation(ctx.stratumEvidence);
  if (!narrativeCheck.valid) {
    return {
      permitted: false,
      refusal: createRefusal(REFUSAL_CODES.NARRATIVE_STRATUM_VIOLATION),
      sreCode: narrativeCheck.refusal.code,
    };
  }
  
  const entitlementResult = checkEntitlement(ctx);
  
  if (!entitlementResult.permitted) {
    return {
      permitted: false,
      refusal: entitlementResult.refusal,
    };
  }
  
  return {
    permitted: true,
    proof: entitlementResult,
  };
}
