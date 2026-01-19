/**
 * Parrot Box Gate — Pipeline Integration
 * 
 * Constitutional Reference: axioms.md v1.0
 * 
 * Per AXIOM A9: No interface, model, route, or downstream consumer
 * may bypass this gate. Any bypass constitutes a constitutional violation.
 * 
 * This module provides integration points for the evaluation pipeline.
 */

import {
  checkEntitlement,
  EntitlementRefusalError,
  type EntitlementContext,
  type EntitlementProof,
  type Evidence,
  type SpeechAct,
} from "./entitlement";
import { REFUSAL_CODES, createRefusal, type Refusal } from "./refusal_codes";
import { getPolicy, type PolicyProfile } from "./policy_profiles";

export interface GateContext {
  dta: Date | null;
  documents: Array<{
    id: string;
    uploadedAt: Date | null;
    name: string;
    isOutcomeKnowledge?: boolean;
    causallyRelevant?: boolean | null;
    contextuallyInterpretable?: boolean | null;
  }>;
  events: Array<{
    id: string;
    timestamp: Date | null;
    isOutcomeKnowledge?: boolean;
    causallyRelevant?: boolean | null;
    contextuallyInterpretable?: boolean | null;
  }>;
  requestedSpeechAct: SpeechAct;
  policyId: string;
}

export interface GateResult {
  permitted: boolean;
  proof?: EntitlementProof;
  refusal?: Refusal;
}

/**
 * Convert pipeline documents/events to Parrot Box Evidence format.
 * Per AXIOM A4: All evidence must be checked against the triad.
 * Per AXIOM A0: Default is inadmissible - null/undefined causal/contextual means inadmissible.
 * Per AXIOM A3: Outcome knowledge is propagated from pipeline inputs.
 */
function toEvidence(ctx: GateContext): Evidence[] {
  const evidence: Evidence[] = [];
  
  for (const doc of ctx.documents) {
    evidence.push({
      id: `doc:${doc.id}`,
      timestamp: doc.uploadedAt,
      source: doc.name,
      isOutcomeKnowledge: doc.isOutcomeKnowledge ?? false,
      causallyRelevant: doc.causallyRelevant ?? null,
      contextuallyInterpretable: doc.contextuallyInterpretable ?? null,
    });
  }
  
  for (const event of ctx.events) {
    evidence.push({
      id: `event:${event.id}`,
      timestamp: event.timestamp,
      source: "timeline",
      isOutcomeKnowledge: event.isOutcomeKnowledge ?? false,
      causallyRelevant: event.causallyRelevant ?? null,
      contextuallyInterpretable: event.contextuallyInterpretable ?? null,
    });
  }
  
  return evidence;
}

/**
 * Main gate function for pipeline integration.
 * Per AXIOM A9: This MUST be called before any evaluative output.
 * Per AXIOM A5: Refusal is terminal. No fallback permitted.
 */
export function checkGate(ctx: GateContext): GateResult {
  const policy = getPolicy(ctx.policyId);
  const evidence = toEvidence(ctx);
  
  const entitlementCtx: EntitlementContext = {
    dta: ctx.dta,
    evidence,
    requestedSpeechAct: ctx.requestedSpeechAct,
    authorizedSpeechActs: policy.authorizedSpeechActs,
  };
  
  const result = checkEntitlement(entitlementCtx);
  
  if (result.permitted) {
    return { permitted: true, proof: result.proof };
  } else {
    return { permitted: false, refusal: result.refusal };
  }
}

/**
 * Require gate passage or throw.
 * Per AXIOM A5: Refusal is terminal.
 * Per AXIOM A10: Silence is preferable to illegitimacy.
 */
export function requireGate(ctx: GateContext): EntitlementProof {
  const result = checkGate(ctx);
  
  if (!result.permitted) {
    throw new EntitlementRefusalError(result.refusal!);
  }
  
  return result.proof!;
}

/**
 * Express middleware for Parrot Box gate.
 * Per AXIOM A9: No route may bypass this gate.
 * 
 * Usage in routes:
 *   app.post("/api/cases/:id/evaluate", parrotBoxMiddleware, async (req, res) => { ... });
 */
export function createParrotBoxMiddleware(options: {
  extractDTA: (req: any) => Date | null;
  extractDocuments: (req: any) => GateContext["documents"];
  extractEvents: (req: any) => GateContext["events"];
  speechAct: SpeechAct;
  policyId: string;
}) {
  return (req: any, res: any, next: any) => {
    const ctx: GateContext = {
      dta: options.extractDTA(req),
      documents: options.extractDocuments(req),
      events: options.extractEvents(req),
      requestedSpeechAct: options.speechAct,
      policyId: options.policyId,
    };
    
    const result = checkGate(ctx);
    
    if (!result.permitted) {
      // Per AXIOM A5: Refusal is terminal. No fallback.
      res.status(403).json({
        error: "PARROT_BOX_REFUSAL",
        refusal: result.refusal,
      });
      return;
    }
    
    // Attach proof to request for downstream use
    req.entitlementProof = result.proof;
    next();
  };
}
