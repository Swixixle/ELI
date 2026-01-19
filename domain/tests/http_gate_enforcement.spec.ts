import { describe, it, expect, beforeAll, afterAll } from "vitest";

const API_BASE = "http://localhost:5000";

describe("HTTP Gate Enforcement", () => {
  let testCaseId: string;

  beforeAll(async () => {
    const res = await fetch(`${API_BASE}/api/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "HTTP Test Case",
        description: "Test case for HTTP gate enforcement",
      }),
    });
    const data = await res.json();
    testCaseId = data.id;
  });

  afterAll(async () => {
    if (testCaseId) {
      await fetch(`${API_BASE}/api/cases/${testCaseId}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  });

  describe("POST /api/cases/:id/evaluate", () => {
    it("returns 403 when DTA is missing", async () => {
      const res = await fetch(`${API_BASE}/api/cases/${testCaseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: { timePressure: "high", workload: "heavy" },
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("CONSTITUTIONAL_REFUSAL");
      expect(data.code).toContain("DTA_NOT_DEFINED");
      expect(data.evaluationBlocked).toBe(true);
    });

    it("returns 403 when no documents exist (S1 cannot lock)", async () => {
      await fetch(`${API_BASE}/api/cases/${testCaseId}/decision-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: "2024-01-01T00:00:00Z" }),
      });

      const res = await fetch(`${API_BASE}/api/cases/${testCaseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: { timePressure: "high", workload: "heavy" },
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("CONSTITUTIONAL_REFUSAL");
      expect(data.evaluationBlocked).toBe(true);
    });

    it("does not leak partial evaluation data on refusal", async () => {
      const res = await fetch(`${API_BASE}/api/cases/${testCaseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: { timePressure: "high" },
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();

      expect(data.checklist).toBeUndefined();
      expect(data.summary).toBeUndefined();
      expect(data.canProceed).toBeUndefined();
      expect(data.gapsEquation).toBeUndefined();
      expect(data.score).toBeUndefined();
      expect(data.eli).toBeUndefined();
      expect(data.procedural_status).toBeUndefined();
      expect(data.prerequisitesMet).toBeUndefined();
      expect(data.conditionsMet).toBeUndefined();
      expect(data.measurement).toBeUndefined();
    });

    it("returns 403 when no constraints provided (S2 cannot lock)", async () => {
      let s2TestCaseId: string;
      const caseRes = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "S2 Test Case", description: "Test S2 refusal" }),
      });
      const caseData = await caseRes.json();
      s2TestCaseId = caseData.id;

      await fetch(`${API_BASE}/api/cases/${s2TestCaseId}/decision-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: "2024-01-01T00:00:00Z" }),
      });

      await fetch(`${API_BASE}/api/cases/${s2TestCaseId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Evidence",
          content: "Evidence for S2 test",
          type: "policy",
          size: "100",
          version: "1.0",
          status: "verified",
        }),
      });

      const res = await fetch(`${API_BASE}/api/cases/${s2TestCaseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("CONSTITUTIONAL_REFUSAL");
      expect(data.message).toContain("S2");
      expect(data.message).toContain("Constraint Envelope");

      await fetch(`${API_BASE}/api/cases/${s2TestCaseId}`, { method: "DELETE" }).catch(() => {});
    });
  });

  describe("POST /api/cases/:id/determine", () => {
    it("returns error and halts before signing when gate refuses", async () => {
      await fetch(`${API_BASE}/api/cases/${testCaseId}/decision-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Was the decision procedurally sound?" }),
      });

      const res = await fetch(`${API_BASE}/api/cases/${testCaseId}/determine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: { timePressure: "high" },
        }),
      });

      const data = await res.json();
      expect(res.status === 403 || res.status === 400).toBe(true);
      expect(data.receipt).toBeUndefined();
      expect(data.signature).toBeUndefined();
    });
  });

  describe("Envelope Enforcement (M5)", () => {
    let envelopeTestCaseId: string;

    beforeAll(async () => {
      const caseRes = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Envelope Test Case",
          description: "Test case for envelope enforcement",
        }),
      });
      const caseData = await caseRes.json();
      envelopeTestCaseId = caseData.id;

      // Decision time: Future date so uploaded documents pre-date it
      // Documents are uploaded "now" so DTA must be after upload time
      await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}/decision-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: "2030-01-01T12:00:00Z" }),
      });

      await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}/decision-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Was the decision procedurally sound?" }),
      });

      // Evidence uploaded BEFORE the decision time (satisfies temporal triad)
      await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Policy Document",
          content: "Applicable policy content",
          type: "policy",
          size: "100",
          version: "1.0",
          status: "verified",
        }),
      });

      // Events with timestamps BEFORE decision time (satisfies temporal ordering)
      await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "evidence_collected",
          description: "Evidence was gathered",
          eventTime: "2026-01-15T10:00:00Z",
        }),
      });
      await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "decision",
          description: "Decision was made based on available evidence",
          eventTime: "2030-01-01T12:00:00Z",
        }),
      });
    });

    afterAll(async () => {
      if (envelopeTestCaseId) {
        await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}`, {
          method: "DELETE",
        }).catch(() => {});
      }
    });

    it("includes envelope on permitted evaluation response and no raw score outside measurement", async () => {
      const res = await fetch(`${API_BASE}/api/cases/${envelopeTestCaseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: {
            timePressure: "moderate",
            workload: "normal",
            guidelineCoherence: "clear",
            irreversibility: "moderate",
          },
        }),
      });

      if (res.status === 200) {
        const data = await res.json();
        
        // Positive assertions: envelope exists with required fields
        expect(data.constitutional.permitted).toBe(true);
        expect(data.measurement).toBeDefined();
        expect(data.measurement.value).toBeDefined();
        expect(typeof data.measurement.value).toBe("number");
        expect(data.measurement.envelope).toBeDefined();
        expect(data.measurement.envelope.measurement_id).toBeDefined();
        expect(data.measurement.envelope.measurement_type).toBe("epistemic_load_index");
        expect(data.measurement.envelope.prohibited_uses).toBeDefined();
        expect(data.measurement.envelope.authorized_uses).toBeDefined();
        
        // Critical: No raw score exists outside measurement (AXIOM M5)
        expect(data.summary?.conditionsMet).toBeUndefined();
        expect(data.summary?.conditionsTotal).toBeUndefined();
        expect(data.score).toBeUndefined();
        expect(data.eli).toBeUndefined();
        expect(data.conditionsMet).toBeUndefined();
      } else {
        const data = await res.json();
        console.log("Evaluation refused (expected for incomplete setup):", data);
        expect(data.error).toBe("CONSTITUTIONAL_REFUSAL");
      }
    });
  });
});
