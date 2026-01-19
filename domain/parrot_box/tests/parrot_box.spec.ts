/**
 * Parrot Box Tests
 * 
 * Constitutional Reference: axioms.md v1.0
 * 
 * Per AXIOM A0: Default is inadmissible - tests expect refusal by default.
 * Per AXIOM A5: Refusal is terminal - no fallback permitted.
 * Per AXIOM A7: Deterministic - identical inputs yield identical outputs.
 */

import { describe, it, expect } from "vitest";
import {
  checkEntitlement,
  requireEntitlement,
  EntitlementRefusalError,
  type EntitlementContext,
  type Evidence,
} from "../entitlement";
import { REFUSAL_CODES } from "../refusal_codes";
import { DEFAULT_POLICY, EVALUATION_PERMITTED_POLICY, getPolicy } from "../policy_profiles";

describe("Parrot Box Constitutional Tests", () => {
  
  // AXIOM A0: Default Inadmissibility
  describe("AXIOM A0 — Default Inadmissibility", () => {
    it("refuses by default with no authorization", () => {
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-01"),
        evidence: [],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: [], // Nothing authorized
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.SPEECH_ACT_NOT_AUTHORIZED);
      }
    });

    it("default policy authorizes nothing", () => {
      expect(DEFAULT_POLICY.authorizedSpeechActs.length).toBe(0);
    });
  });

  // AXIOM A2: Decision-Time Sovereignty
  describe("AXIOM A2 — Decision-Time Sovereignty", () => {
    it("refuses when DTA is not defined", () => {
      const ctx: EntitlementContext = {
        dta: null, // DTA not defined
        evidence: [],
        requestedSpeechAct: "procedural_status",
        authorizedSpeechActs: ["procedural_status"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.DTA_NOT_DEFINED);
      }
    });
  });

  // AXIOM A3: No Outcome Contamination
  describe("AXIOM A3 — No Outcome Contamination", () => {
    it("refuses when evidence contains outcome knowledge", () => {
      const outcomeEvidence: Evidence = {
        id: "outcome-001",
        timestamp: new Date("2024-01-01"),
        source: "post-hoc-report",
        isOutcomeKnowledge: true, // Outcome contamination
        causallyRelevant: true,
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [outcomeEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.OUTCOME_CONTAMINATION);
      }
    });
  });

  // AXIOM A4: Entitlement Triad Requirement
  describe("AXIOM A4 — Entitlement Triad Requirement", () => {
    it("refuses when evidence timestamp is after DTA (temporal failure)", () => {
      const lateEvidence: Evidence = {
        id: "late-001",
        timestamp: new Date("2024-02-01"), // After DTA
        source: "late-report",
        isOutcomeKnowledge: false,
        causallyRelevant: true,
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"), // Evidence is after this
        evidence: [lateEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.TRIAD_TEMPORAL_FAILURE);
      }
    });

    it("refuses when evidence has no timestamp", () => {
      const noTimestampEvidence: Evidence = {
        id: "no-ts-001",
        timestamp: null, // No timestamp
        source: "undated-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: true,
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [noTimestampEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.TRIAD_TEMPORAL_FAILURE);
      }
    });

    it("refuses when causal relevance is null (AXIOM A0 - default inadmissible)", () => {
      const unknownCausalEvidence: Evidence = {
        id: "causal-null-001",
        timestamp: new Date("2024-01-01"),
        source: "unknown-causal-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: null, // Cannot determine causal relevance
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [unknownCausalEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.TRIAD_CAUSAL_FAILURE);
      }
    });

    it("refuses when causal relevance is false", () => {
      const notCausalEvidence: Evidence = {
        id: "causal-false-001",
        timestamp: new Date("2024-01-01"),
        source: "not-causal-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: false, // Evidence not causally relevant
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [notCausalEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.TRIAD_CAUSAL_FAILURE);
      }
    });

    it("refuses when contextual interpretability is null (AXIOM A0 - default inadmissible)", () => {
      const unknownContextEvidence: Evidence = {
        id: "context-null-001",
        timestamp: new Date("2024-01-01"),
        source: "unknown-context-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: true,
        contextuallyInterpretable: null, // Cannot determine contextual interpretability
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [unknownContextEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.TRIAD_CONTEXTUAL_FAILURE);
      }
    });

    it("refuses when contextual interpretability is false", () => {
      const notContextualEvidence: Evidence = {
        id: "context-false-001",
        timestamp: new Date("2024-01-01"),
        source: "not-contextual-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: true,
        contextuallyInterpretable: false, // Evidence not interpretable in context
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [notContextualEvidence],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.TRIAD_CONTEXTUAL_FAILURE);
      }
    });
  });

  // AXIOM A5: Refusal Is a Terminal Success State
  describe("AXIOM A5 — Refusal Is Terminal", () => {
    it("requireEntitlement throws EntitlementRefusalError on refusal", () => {
      const ctx: EntitlementContext = {
        dta: null,
        evidence: [],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      expect(() => requireEntitlement(ctx)).toThrow(EntitlementRefusalError);
    });

    it("refusal error contains the refusal code", () => {
      const ctx: EntitlementContext = {
        dta: null,
        evidence: [],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      try {
        requireEntitlement(ctx);
      } catch (e) {
        expect(e).toBeInstanceOf(EntitlementRefusalError);
        if (e instanceof EntitlementRefusalError) {
          expect(e.refusal.code).toBe(REFUSAL_CODES.DTA_NOT_DEFINED);
        }
      }
    });
  });

  // AXIOM A6: Speech Act Governance
  describe("AXIOM A6 — Speech Act Governance", () => {
    it("refuses unauthorized speech acts", () => {
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [],
        requestedSpeechAct: "blame_attribution", // Not authorized
        authorizedSpeechActs: ["factual_report"], // Only this is authorized
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      if (!result.permitted) {
        expect(result.refusal.code).toBe(REFUSAL_CODES.SPEECH_ACT_NOT_AUTHORIZED);
      }
    });

    it("permits explicitly authorized speech acts", () => {
      const validEvidence: Evidence = {
        id: "valid-001",
        timestamp: new Date("2024-01-01"),
        source: "valid-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: true,
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [validEvidence],
        requestedSpeechAct: "procedural_status",
        authorizedSpeechActs: ["procedural_status"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(true);
    });
  });

  // AXIOM A7: Determinism Over Discretion
  describe("AXIOM A7 — Determinism Over Discretion", () => {
    it("identical inputs yield identical refusal codes", () => {
      const ctx: EntitlementContext = {
        dta: null,
        evidence: [],
        requestedSpeechAct: "evaluation",
        authorizedSpeechActs: ["evaluation"],
      };
      
      const result1 = checkEntitlement(ctx);
      const result2 = checkEntitlement(ctx);
      
      expect(result1.permitted).toBe(result2.permitted);
      if (!result1.permitted && !result2.permitted) {
        expect(result1.refusal.code).toBe(result2.refusal.code);
      }
    });
  });

  // AXIOM A8: Auditability as Law
  describe("AXIOM A8 — Auditability as Law", () => {
    it("permitted output includes complete entitlement proof", () => {
      const validEvidence: Evidence = {
        id: "valid-001",
        timestamp: new Date("2024-01-01"),
        source: "valid-doc",
        isOutcomeKnowledge: false,
        causallyRelevant: true,
        contextuallyInterpretable: true,
      };
      
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [validEvidence],
        requestedSpeechAct: "procedural_status",
        authorizedSpeechActs: ["procedural_status"],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(true);
      
      if (result.permitted) {
        expect(result.proof.rulesetVersion).toBeDefined();
        expect(result.proof.speechAct).toBe("procedural_status");
        expect(result.proof.dta).toBeDefined();
        expect(result.proof.evidenceIds).toContain("valid-001");
        expect(result.proof.triadResults).toBeDefined();
        expect(result.proof.exclusionsApplied).toBeDefined();
        expect(result.proof.timestamp).toBeDefined();
      }
    });
  });

  // AXIOM A10: Silence Is Preferable to Illegitimacy
  describe("AXIOM A10 — Silence Is Preferable to Illegitimacy", () => {
    it("system remains silent (refuses) rather than produce illegitimate output", () => {
      const ctx: EntitlementContext = {
        dta: new Date("2024-01-15"),
        evidence: [],
        requestedSpeechAct: "recommendation", // Never authorized by default
        authorizedSpeechActs: [],
      };
      
      const result = checkEntitlement(ctx);
      expect(result.permitted).toBe(false);
      // System refuses rather than producing unauthorized output
    });
  });

  // Policy profile tests
  describe("Policy Profiles", () => {
    it("getPolicy returns default for unknown policy", () => {
      const policy = getPolicy("unknown-policy");
      expect(policy.id).toBe("default");
      expect(policy.authorizedSpeechActs.length).toBe(0);
    });

    it("evaluation_permitted policy authorizes evaluation", () => {
      expect(EVALUATION_PERMITTED_POLICY.authorizedSpeechActs).toContain("evaluation");
    });
  });
});
