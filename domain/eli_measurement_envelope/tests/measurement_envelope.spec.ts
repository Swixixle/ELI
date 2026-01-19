/**
 * ELI Measurement Envelope Tests
 * 
 * Constitutional Reference: eli_measurement_envelope.md v1.0
 * 
 * These tests prove:
 * - Envelope stripping is impossible (AXIOM M5)
 * - Scores cannot justify blame (AXIOM M2)
 * - Outcome knowledge cannot enter metrics (AXIOM M1)
 * - Comparison requires compatible envelopes (AXIOM M4)
 * - Interpretation requires envelope inspection (AXIOM M3)
 */

import { describe, it, expect } from "vitest";
import {
  type MeasurementEnvelope,
  type EnvelopedMeasurement,
  type AuthorizedUse,
  ELI_PROTOCOL_VERSION,
  validateEnvelopePresent,
  checkOutcomeBlindness,
  checkProhibitedUse,
  checkAuthorizedUse,
  checkEnvelopeCompatibility,
  detectEnvelopeStripping,
  requireEnvelope,
  accessMeasurement,
  compareMeasurements,
  ELI_REFUSAL_CODES,
  EliRefusalError,
} from "../index";

function createValidEnvelope(overrides: Partial<MeasurementEnvelope> = {}): MeasurementEnvelope {
  return {
    measurement_id: "test-001",
    measurement_type: "epistemic_load_index",
    ruleset_version: ELI_PROTOCOL_VERSION,
    decision_time_anchor: new Date("2024-01-15").toISOString(),
    locked_strata_referenced: ["S1", "S2"],
    admissible_record_hash: "abc123",
    excluded_information_classes: ["outcome_knowledge", "narrative_reconstruction"],
    dominant_constraints: ["time_pressure", "resource_limits"],
    epistemic_volume_descriptor: {
      constraintDensity: "high",
      dominantLimitingAxes: ["temporal", "informational"],
      decisionSpaceCompression: 0.7,
    },
    authorized_uses: ["constrain_review_posture", "calibrate_certainty"],
    prohibited_uses: ["rank_individuals", "evaluate_performance", "predict_behavior", "justify_sanctions", "proxy_evidence_fault"],
    ...overrides,
  };
}

function createValidMeasurement(value: number = 0.75, envelopeOverrides: Partial<MeasurementEnvelope> = {}): EnvelopedMeasurement<number> {
  return {
    value,
    envelope: createValidEnvelope(envelopeOverrides),
  };
}

describe("ELI Measurement Envelope Constitutional Tests", () => {
  
  describe("Section 2 — Envelope Primacy", () => {
    it("measurement without envelope is invalid", () => {
      const result = validateEnvelopePresent(null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.ENVELOPE_MISSING);
      }
    });

    it("measurement with undefined envelope is invalid", () => {
      const result = validateEnvelopePresent({ value: 0.5 } as any);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.ENVELOPE_MISSING);
      }
    });

    it("valid measurement with complete envelope passes", () => {
      const measurement = createValidMeasurement();
      const result = validateEnvelopePresent(measurement);
      expect(result.valid).toBe(true);
    });
  });

  describe("AXIOM M1 — Outcome Blindness", () => {
    it("refuses measurement using S3 (outcome knowledge)", () => {
      const envelope = createValidEnvelope({
        locked_strata_referenced: ["S1", "S2", "S3"],
      });
      
      const result = checkOutcomeBlindness(envelope);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.OUTCOME_IN_MEASUREMENT);
        expect(result.refusal.axiom).toBe("M1");
      }
    });

    it("refuses measurement using S4 (narrative)", () => {
      const envelope = createValidEnvelope({
        locked_strata_referenced: ["S1", "S4"],
      });
      
      const result = checkOutcomeBlindness(envelope);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.OUTCOME_IN_MEASUREMENT);
      }
    });

    it("permits measurement using only S1 and S2", () => {
      const envelope = createValidEnvelope({
        locked_strata_referenced: ["S1", "S2"],
      });
      
      const result = checkOutcomeBlindness(envelope);
      expect(result.valid).toBe(true);
    });
  });

  describe("AXIOM M2 — Non-Upward Authority (Scores Cannot Justify Blame)", () => {
    it("refuses use for blame assignment", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "assign_blame");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.BLAME_JUSTIFICATION);
      }
    });

    it("refuses use for discipline justification", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "justify_discipline");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.BLAME_JUSTIFICATION);
      }
    });

    it("refuses use for sanction justification", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "justify_sanctions");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.BLAME_JUSTIFICATION);
      }
    });

    it("refuses use to infer competence", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "infer_competence");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.BLAME_JUSTIFICATION);
      }
    });

    it("refuses individual ranking", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "rank_individuals");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.INDIVIDUAL_RANKING);
      }
    });

    it("refuses performance evaluation", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "evaluate_performance");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.INDIVIDUAL_RANKING);
      }
    });

    it("refuses behavior prediction", () => {
      const envelope = createValidEnvelope();
      
      const result = checkProhibitedUse(envelope, "predict_behavior");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.INDIVIDUAL_RANKING);
      }
    });
  });

  describe("AXIOM M3 — Envelope Precedes Interpretation", () => {
    it("refuses access without envelope acknowledgment", () => {
      const measurement = createValidMeasurement();
      
      const result = accessMeasurement(measurement, false);
      expect("refusal" in result).toBe(true);
      if ("refusal" in result) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.NO_ENVELOPE_INSPECTION);
        expect(result.refusal.axiom).toBe("M3");
      }
    });

    it("permits access with envelope acknowledgment", () => {
      const measurement = createValidMeasurement();
      
      const result = accessMeasurement(measurement, true);
      expect("value" in result).toBe(true);
      if ("value" in result) {
        expect(result.value).toBe(0.75);
        expect(result.envelope).toBeDefined();
      }
    });
  });

  describe("AXIOM M4 — Envelope Compatibility for Comparison", () => {
    it("refuses comparison with incompatible constraint classes", () => {
      const m1 = createValidMeasurement(0.5, {
        dominant_constraints: ["time_pressure"],
        authorized_uses: ["compare_constraint_environments"],
      });
      const m2 = createValidMeasurement(0.7, {
        dominant_constraints: ["resource_limits"],
        authorized_uses: ["compare_constraint_environments"],
      });
      
      const result = compareMeasurements(m1, m2, "compare_constraint_environments");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.INCOMPATIBLE_COMPARISON);
        expect(result.refusal.axiom).toBe("M4");
      }
    });

    it("refuses comparison with misaligned dominant axes", () => {
      const m1 = createValidMeasurement(0.5, {
        dominant_constraints: ["time_pressure"],
        authorized_uses: ["compare_constraint_environments"],
        epistemic_volume_descriptor: {
          constraintDensity: "high",
          dominantLimitingAxes: ["temporal"],
          decisionSpaceCompression: 0.7,
        },
      });
      const m2 = createValidMeasurement(0.7, {
        dominant_constraints: ["time_pressure"],
        authorized_uses: ["compare_constraint_environments"],
        epistemic_volume_descriptor: {
          constraintDensity: "high",
          dominantLimitingAxes: ["informational"],
          decisionSpaceCompression: 0.7,
        },
      });
      
      const result = compareMeasurements(m1, m2, "compare_constraint_environments");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.INCOMPATIBLE_COMPARISON);
      }
    });

    it("permits comparison with compatible envelopes", () => {
      const m1 = createValidMeasurement(0.5, {
        measurement_id: "m1",
        authorized_uses: ["compare_constraint_environments"],
      });
      const m2 = createValidMeasurement(0.7, {
        measurement_id: "m2",
        authorized_uses: ["compare_constraint_environments"],
      });
      
      const result = compareMeasurements(m1, m2, "compare_constraint_environments");
      expect(result.valid).toBe(true);
    });
  });

  describe("AXIOM M5 — Non-Bypassable Envelope Gate (Envelope Stripping Impossible)", () => {
    it("detects envelope stripping attempt", () => {
      const result = detectEnvelopeStripping(0.75, null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.ENVELOPE_STRIPPED);
        expect(result.refusal.axiom).toBe("M5");
      }
    });

    it("detects undefined envelope as stripping", () => {
      const result = detectEnvelopeStripping(0.75, undefined);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.ENVELOPE_STRIPPED);
      }
    });

    it("requireEnvelope throws on missing envelope", () => {
      expect(() => requireEnvelope(null)).toThrow(EliRefusalError);
    });

    it("requireEnvelope throws on stripped envelope", () => {
      expect(() => requireEnvelope({ value: 0.5 } as any)).toThrow(EliRefusalError);
    });

    it("requireEnvelope returns valid measurement", () => {
      const measurement = createValidMeasurement();
      const result = requireEnvelope(measurement);
      expect(result.value).toBe(0.75);
      expect(result.envelope).toBeDefined();
    });
  });

  describe("Section 6 — Authorized vs Prohibited Uses", () => {
    it("permits authorized use: constrain_review_posture", () => {
      const envelope = createValidEnvelope({
        authorized_uses: ["constrain_review_posture"],
      });
      
      const result = checkAuthorizedUse(envelope, "constrain_review_posture");
      expect(result.valid).toBe(true);
    });

    it("refuses use not in authorized list", () => {
      const envelope = createValidEnvelope({
        authorized_uses: ["constrain_review_posture"],
      });
      
      const result = checkAuthorizedUse(envelope, "calibrate_certainty");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.PROHIBITED_USE_INVOKED);
      }
    });
  });

  describe("Section 12 — Failure Handling", () => {
    it("missing envelope surfaces explicit error", () => {
      const result = validateEnvelopePresent(null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.message).toContain("missing");
      }
    });

    it("EliRefusalError contains refusal details", () => {
      try {
        requireEnvelope(null);
      } catch (e) {
        expect(e).toBeInstanceOf(EliRefusalError);
        if (e instanceof EliRefusalError) {
          expect(e.refusal.code).toBe(ELI_REFUSAL_CODES.ENVELOPE_MISSING);
          expect(e.refusal.timestamp).toBeDefined();
        }
      }
    });
  });

  describe("Section 11 — Interaction with Parrot Box & SRE", () => {
    it("accessMeasurement refuses if outcome in strata", () => {
      const measurement = createValidMeasurement(0.5, {
        locked_strata_referenced: ["S1", "S3"],
      });
      
      const result = accessMeasurement(measurement, true);
      expect("refusal" in result).toBe(true);
      if ("refusal" in result) {
        expect(result.refusal.code).toBe(ELI_REFUSAL_CODES.OUTCOME_IN_MEASUREMENT);
      }
    });
  });
});
