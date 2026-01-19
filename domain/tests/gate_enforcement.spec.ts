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
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(false);
      expect(result.refusalCode).toBe(REFUSAL_CODES.ENTITLEMENT_NOT_ESTABLISHED);
      expect(result.refusalAxiom).toBe("A1");
    });

    it("permits when all prerequisites are met", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-3",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Discipline was appropriate given the evidence",
        requestedSpeechAct: "procedural_status",
        evidence: [
          { id: "doc1", type: "fact", description: "Performance record shows...", timestamp: "2023-12-15", source: "hr_system" },
          { id: "doc2", type: "artifact", description: "Signed acknowledgment form", timestamp: "2023-12-20", source: "hr_system" },
        ],
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(true);
      expect(result.registry.S1.locked).toBe(true);
      expect(result.registry.S2.locked).toBe(true);
      expect(result.registry.S3.locked).toBe(false);
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
        evidence: [{ id: "doc1", type: "fact", description: "Evidence text" }],
      };

      const result = passConstitutionalGate(context);

      if (result.permitted) {
        expect(result.registry.S1.locked).toBe(true);
        expect(result.registry.S2.locked).toBe(true);
      }
    });

    it("S3 remains unlocked in evaluation context (outcome-blind)", () => {
      const context: ConstitutionalContext = {
        caseId: "test-case-7",
        decisionTimeAnchor: new Date("2024-01-01"),
        proposedClaim: "Test claim",
        requestedSpeechAct: "procedural_status",
        evidence: [{ id: "doc1", type: "fact", description: "Evidence text" }],
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
      };

      const result = passConstitutionalGate(context);

      expect(result.permitted).toBe(false);
      expect(result.registry.S1.locked).toBe(false);
      expect(result.registry.S2.locked).toBe(false);
    });
  });
});
