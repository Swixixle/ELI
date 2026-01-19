import { describe, it, expect } from "vitest";
import {
  passConstitutionalGate,
  formatRefusalResponse,
  type ConstitutionalContext,
} from "../../server/constitutional/gates";
import { REFUSAL_CODES } from "../../domain/parrot_box";

describe("Constitutional Gate Enforcement", () => {
  describe("Gate Refusal Scenarios", () => {
    it("refuses when decision time anchor is missing", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-1",
        decisionTimeAnchor: null,
        proposedClaim: "Discipline was appropriate",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "e1", type: "fact", description: "Some fact" }],
        constraints: { timePressure: "high", workload: "heavy" },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(false);
      expect(result.refusalCode).toBe(REFUSAL_CODES.DTA_NOT_DEFINED);
      expect(result.refusalAxiom).toBe("A2");
    });

    it("refuses when no evidence is provided (S1 cannot lock)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-2",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Discipline was appropriate",
        requestedSpeechAct: "procedural_status",
        evidence: [],
        constraints: { timePressure: "high", workload: "heavy" },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(false);
      expect(result.refusalCode).toBe(REFUSAL_CODES.ENTITLEMENT_NOT_ESTABLISHED);
      expect(result.refusalAxiom).toBe("A0");
    });

    it("refuses when no constraints are provided (S2 cannot lock)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-s2",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Discipline was appropriate",
        requestedSpeechAct: "procedural_status",
        evidence: [
          { id: "doc1", type: "fact", description: "Performance record", timestamp: "2023-12-15", source: "hr_system" },
        ],
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(false);
      expect(result.refusalCode).toBe(REFUSAL_CODES.ENTITLEMENT_NOT_ESTABLISHED);
      expect(result.refusalMessage).toContain("S2");
      expect(result.refusalMessage).toContain("Constraint Envelope");
    });

    it("permits when all prerequisites are met (including constraints)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-3",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Discipline was appropriate given the evidence",
        requestedSpeechAct: "procedural_status",
        evidence: [
          { id: "doc1", type: "fact", description: "Performance record shows...", timestamp: "2023-12-15", source: "hr_system" },
          { id: "doc2", type: "artifact", description: "Signed acknowledgment form", timestamp: "2023-12-20", source: "hr_system" },
        ],
        constraints: {
          timePressure: "high",
          workload: "heavy",
          guidelineCoherence: "clear",
          irreversibility: "moderate",
        },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(true);
      expect(result.registry.S1.locked).toBe(true);
      expect(result.registry.S2.locked).toBe(true);
      expect(result.registry.S3.locked).toBe(false);
    });
  });

  describe("S2 Constraint Envelope Semantics", () => {
    it("rejects 'unknown' placeholder values in constraints", () => {
      const context: ConstitutionalContext = {
        caseId: "test-placeholder-rejection",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "1", type: "artifact", description: "Test doc", timestamp: "2024-01-01", source: "test" }],
        constraints: {
          timePressure: "unknown",
          workload: "unknown",
          guidelineCoherence: "unknown",
          irreversibility: "unknown",
        },
      };

      const result = passConstitutionalGate(context);
      expect(result.permitted).toBe(false);
      expect(result.refusalMessage).toContain("S2");
      expect(result.refusalMessage).toContain("Constraint Envelope");
    });

    it("accepts mixed valid and placeholder values (at least one real constraint)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-mixed-constraints",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "1", type: "artifact", description: "Test doc", timestamp: "2024-01-01", source: "test" }],
        constraints: {
          timePressure: "high",
          workload: "unknown",
        },
      };

      const result = passConstitutionalGate(context);
      expect(result.permitted).toBe(true);
    });

    it("S2 contains constraint evidence, not DTA", () => {
      const context: ConstitutionalContext = {
        caseId: "test-s2-semantics",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [
          { id: "doc1", type: "fact", description: "Evidence text", timestamp: "2023-12-15" },
        ],
        constraints: {
          timePressure: "high",
          workload: "normal",
          resourceFriction: ["limited_staff", "system_downtime"],
          guidelineCoherence: "ambiguous",
          irreversibility: "high",
          toolingAvailable: ["EMR", "policy_manual"],
        },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(true);
      expect(result.registry.S2.locked).toBe(true);
      expect(result.registry.S2.metadata).toBeDefined();
      expect(result.registry.S2.metadata?.admissible_record_hash).toBeDefined();
    });

    it("DTA is part of S1 metadata, not S2", () => {
      const context: ConstitutionalContext = {
        caseId: "test-dta-in-s1",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [
          { id: "doc1", type: "fact", description: "Evidence text", timestamp: "2023-12-15" },
        ],
        constraints: { timePressure: "moderate" },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(true);
      expect(result.registry.S1.locked).toBe(true);
      expect(result.registry.S1.metadata).toBeDefined();
    });
  });

  describe("Refusal Response Format", () => {
    it("formats refusal response with required fields", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-4",
        decisionTimeAnchor: null,
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "e1", type: "fact", description: "Some fact" }],
        constraints: { timePressure: "high" },
      };

      const gateResult = passConstitutionalGate(context);
      const response = formatRefusalResponse(gateResult);

      expect(response).toHaveProperty("error", "CONSTITUTIONAL_REFUSAL");
      expect(response).toHaveProperty("code");
      expect(response).toHaveProperty("axiom");
      expect(response).toHaveProperty("message");
      expect(typeof response.message).toBe("string");
      expect(response.message.length).toBeGreaterThan(0);
    });

    it("includes stratum registry state in gate result", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-5",
        decisionTimeAnchor: null,
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "e1", type: "fact", description: "Some fact" }],
        constraints: { timePressure: "high" },
      };

      const gateResult = passConstitutionalGate(context);

      expect(gateResult.registry).toBeDefined();
      expect(gateResult.registry.S1).toHaveProperty("locked");
      expect(gateResult.registry.S2).toHaveProperty("locked");
      expect(gateResult.registry.S3).toHaveProperty("locked");
    });
  });

  describe("Stratum Locking Sequence", () => {
    it("enforces S1→S2 progression (both lock when permitted)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-6",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "doc1", type: "fact", description: "Evidence text", timestamp: "2023-12-15" }],
        constraints: { timePressure: "high", workload: "normal" },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(true);
      expect(result.registry.S1.locked).toBe(true);
      expect(result.registry.S2.locked).toBe(true);
    });

    it("S3 remains unlocked in evaluation context (outcome-blind)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-7",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "doc1", type: "fact", description: "Evidence text", timestamp: "2023-12-15" }],
        constraints: { timePressure: "high" },
      };

      const result = passConstitutionalGate(context);

      expect(result.registry.S3.locked).toBe(false);
    });

    it("S1 must lock before S2 can be evaluated", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-8",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [],
        constraints: { timePressure: "high" },
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(false);
      expect(result.registry.S1.locked).toBe(false);
      expect(result.registry.S2.locked).toBe(false);
    });
  });
});
