/**
 * Parrot Box Policy Profiles
 * 
 * Constitutional Reference: axioms.md v1.0
 * 
 * Per AXIOM A6: Speech acts are regulated by policy profile.
 * By default, the system must not perform evaluation, blame attribution,
 * narrative reconstruction, or recommendation.
 * 
 * Permitted speech acts must be explicitly authorized.
 */

import type { SpeechAct } from "./entitlement";

/**
 * Policy profile defines what speech acts are authorized.
 */
export interface PolicyProfile {
  readonly id: string;
  readonly name: string;
  readonly authorizedSpeechActs: readonly SpeechAct[];
  readonly version: string;
}

/**
 * Default policy: Nothing permitted.
 * Per AXIOM A0: Default is inadmissible.
 * Per AXIOM A6: By default, system must not perform evaluative acts.
 */
export const DEFAULT_POLICY: PolicyProfile = Object.freeze({
  id: "default",
  name: "Default (Deny All)",
  authorizedSpeechActs: Object.freeze([]),
  version: "1.0.0",
});

/**
 * Procedural status only: Permits factual reporting of procedural state.
 * Does NOT permit evaluation, blame, narrative, or recommendation.
 */
export const PROCEDURAL_STATUS_POLICY: PolicyProfile = Object.freeze({
  id: "procedural_status",
  name: "Procedural Status Only",
  authorizedSpeechActs: Object.freeze(["factual_report", "procedural_status"] as const),
  version: "1.0.0",
});

/**
 * Evaluation permitted: Allows evaluation speech acts.
 * Still prohibits blame attribution, narrative reconstruction, recommendation.
 */
export const EVALUATION_PERMITTED_POLICY: PolicyProfile = Object.freeze({
  id: "evaluation_permitted",
  name: "Evaluation Permitted",
  authorizedSpeechActs: Object.freeze([
    "factual_report",
    "procedural_status",
    "evaluation",
  ] as const),
  version: "1.0.0",
});

/**
 * Get policy by ID. Returns default if not found.
 * Per AXIOM A0: Unknown policies default to inadmissible.
 */
export function getPolicy(policyId: string): PolicyProfile {
  switch (policyId) {
    case "procedural_status":
      return PROCEDURAL_STATUS_POLICY;
    case "evaluation_permitted":
      return EVALUATION_PERMITTED_POLICY;
    default:
      return DEFAULT_POLICY;
  }
}
