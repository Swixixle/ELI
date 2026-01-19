/**
 * Parrot Box Domain — Public API
 * 
 * Constitutional Reference: axioms.md v1.0
 * 
 * Per AXIOM A9: No interface, model, route, or downstream consumer
 * may bypass the Parrot Box entitlement gate.
 * 
 * This module is the ONLY authorized entry point for entitlement checking.
 */

export {
  checkEntitlement,
  requireEntitlement,
  EntitlementRefusalError,
  RULESET_VERSION,
  type EntitlementContext,
  type EntitlementResult,
  type EntitlementProof,
  type Evidence,
  type SpeechAct,
} from "./entitlement";

export {
  REFUSAL_CODES,
  createRefusal,
  type RefusalCode,
  type Refusal,
} from "./refusal_codes";

export {
  getPolicy,
  DEFAULT_POLICY,
  PROCEDURAL_STATUS_POLICY,
  EVALUATION_PERMITTED_POLICY,
  type PolicyProfile,
} from "./policy_profiles";

export {
  checkGate,
  requireGate,
  createParrotBoxMiddleware,
  type GateContext,
  type GateResult,
} from "./gate";

export {
  checkEntitlementWithStrata,
  type StratumGatedContext,
  type StratumGatedResult,
} from "./stratum_integration";
