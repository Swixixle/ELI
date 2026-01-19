/**
 * SRE Stratum Locking Tests
 * 
 * Constitutional Reference: sre_stratum_locking.md v1.0
 * 
 * These tests prove:
 * - Retroactivity is impossible (AXIOM S2)
 * - Locks are irreversible (AXIOM S5)
 * - Evaluation requires locked strata (AXIOM S3, S4)
 * - Visibility is unidirectional (AXIOM S1)
 */

import { describe, it, expect } from "vitest";
import {
  type StratumRegistry,
  type StratumEvidence,
  type LockRequest,
  createEmptyRegistry,
  lockStratum,
  verifyLockIntegrity,
  checkVisibility,
  validateForEvaluation,
  requireLockedForEvaluation,
  checkRetroactiveModification,
  checkNarrativeEvaluation,
  SRE_REFUSAL_CODES,
  SreRefusalError,
} from "../index";

function createTestEvidence(stratum_id: "S1" | "S2" | "S3" | "S4", id: string): StratumEvidence {
  return {
    id,
    stratum_id,
    content_hash: `hash_${id}`,
    timestamp: new Date("2024-01-01"),
  };
}

describe("SRE Stratum Locking Constitutional Tests", () => {
  
  describe("AXIOM S1 — Unidirectional Visibility", () => {
    it("allows higher strata to observe lower strata", () => {
      expect(checkVisibility("S2", "S1").valid).toBe(true);
      expect(checkVisibility("S3", "S1").valid).toBe(true);
      expect(checkVisibility("S3", "S2").valid).toBe(true);
      expect(checkVisibility("S4", "S1").valid).toBe(true);
    });

    it("refuses lower strata observing higher strata", () => {
      const result = checkVisibility("S1", "S2");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.REVERSE_VISIBILITY);
      }
    });

    it("refuses S1 observing S3 (outcome knowledge)", () => {
      const result = checkVisibility("S1", "S3");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.REVERSE_VISIBILITY);
      }
    });

    it("refuses S2 observing S4 (narrative)", () => {
      const result = checkVisibility("S2", "S4");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.REVERSE_VISIBILITY);
      }
    });
  });

  describe("AXIOM S2 — Non-Retroactivity", () => {
    it("prevents outcome knowledge from modifying S1", () => {
      let registry = createEmptyRegistry();
      const s1Evidence = [createTestEvidence("S1", "doc-1")];
      
      const lockResult = lockStratum(registry, {
        stratum_id: "S1",
        evidence: s1Evidence,
        authority: "gatekeeper_substrate",
      });
      
      expect(lockResult.success).toBe(true);
      if (lockResult.success) {
        registry = lockResult.registry;
      }
      
      const retroCheck = checkRetroactiveModification(registry, "S1", "S3");
      expect(retroCheck.valid).toBe(false);
      if (!retroCheck.valid) {
        expect(retroCheck.refusal.code).toBe(SRE_REFUSAL_CODES.RETROACTIVE_MODIFICATION);
      }
    });

    it("prevents S4 from modifying S2", () => {
      let registry = createEmptyRegistry();
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const lock2 = lockStratum(registry, {
        stratum_id: "S2",
        evidence: [createTestEvidence("S2", "constraint-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock2.success) registry = lock2.registry;
      
      const retroCheck = checkRetroactiveModification(registry, "S2", "S4");
      expect(retroCheck.valid).toBe(false);
      if (!retroCheck.valid) {
        expect(retroCheck.refusal.code).toBe(SRE_REFUSAL_CODES.RETROACTIVE_MODIFICATION);
      }
    });

    it("refuses outcome injection into S1 lock", () => {
      const registry = createEmptyRegistry();
      
      const outcomeEvidence = createTestEvidence("S3", "outcome-1");
      const request: LockRequest = {
        stratum_id: "S1",
        evidence: [outcomeEvidence],
        authority: "gatekeeper_substrate",
      };
      
      const result = lockStratum(registry, request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.OUTCOME_INJECTION);
      }
    });
  });

  describe("AXIOM S3 — Mandatory Locking", () => {
    it("refuses evaluation with unlocked S1", () => {
      const registry = createEmptyRegistry();
      
      const result = validateForEvaluation(registry);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.STRATUM_NOT_LOCKED);
        expect(result.refusal.stratum_id).toBe("S1");
      }
    });

    it("refuses evaluation with unlocked S2", () => {
      let registry = createEmptyRegistry();
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const result = validateForEvaluation(registry);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.STRATUM_NOT_LOCKED);
        expect(result.refusal.stratum_id).toBe("S2");
      }
    });

    it("permits evaluation with S1 and S2 locked", () => {
      let registry = createEmptyRegistry();
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const lock2 = lockStratum(registry, {
        stratum_id: "S2",
        evidence: [createTestEvidence("S2", "constraint-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock2.success) registry = lock2.registry;
      
      const result = validateForEvaluation(registry);
      expect(result.valid).toBe(true);
    });
  });

  describe("AXIOM S4 — Lock Precedes Judgment", () => {
    it("requireLockedForEvaluation throws with unlocked strata", () => {
      const registry = createEmptyRegistry();
      
      expect(() => requireLockedForEvaluation(registry)).toThrow(SreRefusalError);
    });

    it("requireLockedForEvaluation does not throw with proper locks", () => {
      let registry = createEmptyRegistry();
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const lock2 = lockStratum(registry, {
        stratum_id: "S2",
        evidence: [createTestEvidence("S2", "constraint-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock2.success) registry = lock2.registry;
      
      expect(() => requireLockedForEvaluation(registry)).not.toThrow();
    });
  });

  describe("AXIOM S5 — Irreversibility", () => {
    it("refuses to unlock a locked stratum", () => {
      let registry = createEmptyRegistry();
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const reLockAttempt = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-2")],
        authority: "gatekeeper_substrate",
      });
      
      expect(reLockAttempt.success).toBe(false);
      if (!reLockAttempt.success) {
        expect(reLockAttempt.refusal.code).toBe(SRE_REFUSAL_CODES.UNLOCK_ATTEMPTED);
      }
    });

    it("lock sequence must be S1 → S2 → S3", () => {
      const registry = createEmptyRegistry();
      
      const lockS2First = lockStratum(registry, {
        stratum_id: "S2",
        evidence: [createTestEvidence("S2", "constraint-1")],
        authority: "gatekeeper_substrate",
      });
      
      expect(lockS2First.success).toBe(false);
      if (!lockS2First.success) {
        expect(lockS2First.refusal.code).toBe(SRE_REFUSAL_CODES.INVALID_LOCK_SEQUENCE);
      }
    });

    it("S3 cannot lock before S1 and S2", () => {
      let registry = createEmptyRegistry();
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: [createTestEvidence("S1", "doc-1")],
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const lockS3Early = lockStratum(registry, {
        stratum_id: "S3",
        evidence: [createTestEvidence("S3", "outcome-1")],
        authority: "gatekeeper_substrate",
      });
      
      expect(lockS3Early.success).toBe(false);
      if (!lockS3Early.success) {
        expect(lockS3Early.refusal.code).toBe(SRE_REFUSAL_CODES.INVALID_LOCK_SEQUENCE);
      }
    });
  });

  describe("Section 4.4 — Narrative Stratum Non-Authority", () => {
    it("refuses evaluation using S4 evidence", () => {
      const narrativeEvidence = [createTestEvidence("S4", "story-1")];
      
      const result = checkNarrativeEvaluation(narrativeEvidence);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.NARRATIVE_EVALUATION);
      }
    });

    it("permits evaluation without S4 evidence", () => {
      const validEvidence = [
        createTestEvidence("S1", "doc-1"),
        createTestEvidence("S2", "constraint-1"),
      ];
      
      const result = checkNarrativeEvaluation(validEvidence);
      expect(result.valid).toBe(true);
    });
  });

  describe("Section 5.2 — Lock Metadata Integrity", () => {
    it("produces complete lock metadata", () => {
      const registry = createEmptyRegistry();
      const evidence = [createTestEvidence("S1", "doc-1")];
      
      const result = lockStratum(registry, {
        stratum_id: "S1",
        evidence,
        authority: "gatekeeper_substrate",
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.metadata.stratum_id).toBe("S1");
        expect(result.metadata.lock_timestamp).toBeDefined();
        expect(result.metadata.ruleset_version).toBe("1.0");
        expect(result.metadata.admissible_record_hash).toBeDefined();
        expect(result.metadata.initiating_authority).toBe("gatekeeper_substrate");
      }
    });

    it("detects hash mismatch (lock corruption)", () => {
      let registry = createEmptyRegistry();
      const originalEvidence = [createTestEvidence("S1", "doc-1")];
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence: originalEvidence,
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const tamperedEvidence = [createTestEvidence("S1", "doc-2")];
      const integrityCheck = verifyLockIntegrity(registry.S1, tamperedEvidence);
      
      expect(integrityCheck.valid).toBe(false);
      if (!integrityCheck.valid) {
        expect(integrityCheck.refusal.code).toBe(SRE_REFUSAL_CODES.LOCK_HASH_MISMATCH);
      }
    });

    it("verifies integrity with matching evidence", () => {
      let registry = createEmptyRegistry();
      const evidence = [createTestEvidence("S1", "doc-1")];
      
      const lock1 = lockStratum(registry, {
        stratum_id: "S1",
        evidence,
        authority: "gatekeeper_substrate",
      });
      if (lock1.success) registry = lock1.registry;
      
      const integrityCheck = verifyLockIntegrity(registry.S1, evidence);
      expect(integrityCheck.valid).toBe(true);
    });
  });

  describe("Section 8 — Failure Handling", () => {
    it("refuses evaluation on missing lock", () => {
      const registry = createEmptyRegistry();
      
      const result = validateForEvaluation(registry);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.refusal.code).toBe(SRE_REFUSAL_CODES.STRATUM_NOT_LOCKED);
      }
    });

    it("error contains stratum id for debugging", () => {
      const registry = createEmptyRegistry();
      
      try {
        requireLockedForEvaluation(registry);
      } catch (e) {
        expect(e).toBeInstanceOf(SreRefusalError);
        if (e instanceof SreRefusalError) {
          expect(e.refusal.stratum_id).toBe("S1");
        }
      }
    });
  });
});
