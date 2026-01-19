import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:5000";

describe("EFX Protocol v0.1 - Acknowledgment Enforcement", () => {
  let testCaseId: string;
  const testMeasurementId = `test_measurement_${Date.now()}`;
  const testEnvelopeHash = `sha256:${Date.now().toString(16)}`;
  const testResponseId = `resp_${Date.now()}`;

  beforeAll(async () => {
    // Create a test case for ACK testing (no need for full evaluation)
    const caseRes = await fetch(`${BASE_URL}/api/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ACK Test Case",
        description: "Testing envelope acknowledgment flow",
        origin: "UPLOADED_BY_USER",
        decisionTarget: "Was the procedure followed correctly?",
      }),
    });
    const caseData = await caseRes.json();
    testCaseId = caseData.id;
  });

  describe("POST /api/acks - Validation", () => {
    it("should reject ACK without required fields", async () => {
      const res = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("MISSING_REQUIRED_FIELDS");
      expect(data.required).toContain("response_id");
      expect(data.required).toContain("measurement_id");
      expect(data.required).toContain("intended_use");
    });

    it("should reject ACK without no_prohibited_use_attestation", async () => {
      const res = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: testResponseId,
          measurement_id: testMeasurementId,
          case_id: testCaseId,
          acknowledged_envelope_hash: testEnvelopeHash,
          intended_use: "constraint_visualization",
          no_prohibited_use_attestation: false,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("PROHIBITED_USE_ATTESTATION_REQUIRED");
    });

    it("should reject ACK with invalid intended_use (prohibited use)", async () => {
      const res = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: testResponseId,
          measurement_id: testMeasurementId,
          case_id: testCaseId,
          acknowledged_envelope_hash: testEnvelopeHash,
          intended_use: "justify_blame",
          no_prohibited_use_attestation: true,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("INVALID_INTENDED_USE");
      expect(data.allowed_uses).toContain("constraint_visualization");
      expect(data.allowed_uses).toContain("procedural_review");
      expect(data.allowed_uses).not.toContain("justify_blame");
    });

    it("should reject ACK for non-existent case", async () => {
      const res = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: testResponseId,
          measurement_id: testMeasurementId,
          case_id: "non-existent-case-id",
          acknowledged_envelope_hash: testEnvelopeHash,
          intended_use: "constraint_visualization",
          no_prohibited_use_attestation: true,
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Case not found");
    });
  });

  describe("POST /api/acks - Success Flow", () => {
    it("should accept valid ACK and return ACK_ACCEPTED", async () => {
      const res = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: testResponseId,
          measurement_id: testMeasurementId,
          case_id: testCaseId,
          acknowledged_envelope_hash: testEnvelopeHash,
          intended_use: "constraint_visualization",
          no_prohibited_use_attestation: true,
          acknowledger_agent_id: "test_agent",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.status).toBe("ACK_ACCEPTED");
      expect(data.ack_id).toBeDefined();
      expect(data.measurement_id).toBe(testMeasurementId);
      expect(data.intended_use).toBe("constraint_visualization");
      expect(data.created_at).toBeDefined();
    });

    it("should return ACK_EXISTS for duplicate acknowledgment", async () => {
      const res = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: `resp_${Date.now()}`,
          measurement_id: testMeasurementId,
          case_id: testCaseId,
          acknowledged_envelope_hash: testEnvelopeHash,
          intended_use: "constraint_visualization",
          no_prohibited_use_attestation: true,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ACK_EXISTS");
      expect(data.ack_id).toBeDefined();
    });
  });

  describe("GET /api/cases/:id/acks/check", () => {
    it("should return acknowledged=true for existing ACK", async () => {
      const res = await fetch(
        `${BASE_URL}/api/cases/${testCaseId}/acks/check?measurement_id=${testMeasurementId}&intended_use=constraint_visualization`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.acknowledged).toBe(true);
      expect(data.ack_id).toBeDefined();
      expect(data.intended_use).toBe("constraint_visualization");
    });

    it("should return acknowledged=false for non-existent measurement", async () => {
      const res = await fetch(
        `${BASE_URL}/api/cases/${testCaseId}/acks/check?measurement_id=non_existent_measurement&intended_use=constraint_visualization`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.acknowledged).toBe(false);
      expect(data.message).toBe("ACK required before proceeding");
    });

    it("should return acknowledged=false for different intended_use (RULE 4)", async () => {
      const res = await fetch(
        `${BASE_URL}/api/cases/${testCaseId}/acks/check?measurement_id=${testMeasurementId}&intended_use=audit_trail_generation`
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.acknowledged).toBe(false);
    });

    it("should reject missing query params", async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${testCaseId}/acks/check`);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("MISSING_QUERY_PARAMS");
    });
  });

  describe("GET /api/cases/:id/acks", () => {
    it("should list all ACKs for a case", async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${testCaseId}/acks`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].measurementId).toBe(testMeasurementId);
      expect(data[0].intendedUse).toBe("constraint_visualization");
    });

    it("should return empty array for case with no ACKs", async () => {
      // Create a new case with no ACKs
      const caseRes = await fetch(`${BASE_URL}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Empty ACK Test Case",
          origin: "UPLOADED_BY_USER",
        }),
      });
      const newCase = await caseRes.json();

      const res = await fetch(`${BASE_URL}/api/cases/${newCase.id}/acks`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe("Protocol Invariants", () => {
    it("RULE 3: ACK binds downstream agent to intended_use", async () => {
      // We created an ACK for constraint_visualization
      // Verify the ACK exists with correct binding
      const checkRes = await fetch(
        `${BASE_URL}/api/cases/${testCaseId}/acks/check?measurement_id=${testMeasurementId}&intended_use=constraint_visualization`
      );
      const checkData = await checkRes.json();

      expect(checkData.acknowledged).toBe(true);
      expect(checkData.intended_use).toBe("constraint_visualization");
    });

    it("RULE 4: ACK scope binding - different intended_use requires new ACK", async () => {
      // Existing ACK is for constraint_visualization
      // Check that audit_trail_generation is NOT acknowledged
      const checkRes = await fetch(
        `${BASE_URL}/api/cases/${testCaseId}/acks/check?measurement_id=${testMeasurementId}&intended_use=audit_trail_generation`
      );
      const checkData = await checkRes.json();

      expect(checkData.acknowledged).toBe(false);

      // Now create ACK for audit_trail_generation
      const ackRes = await fetch(`${BASE_URL}/api/acks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: `resp_audit_${Date.now()}`,
          measurement_id: testMeasurementId,
          case_id: testCaseId,
          acknowledged_envelope_hash: testEnvelopeHash,
          intended_use: "audit_trail_generation",
          no_prohibited_use_attestation: true,
        }),
      });
      const ackData = await ackRes.json();
      expect(ackData.status).toBe("ACK_ACCEPTED");

      // Now verify it's acknowledged
      const reCheckRes = await fetch(
        `${BASE_URL}/api/cases/${testCaseId}/acks/check?measurement_id=${testMeasurementId}&intended_use=audit_trail_generation`
      );
      const reCheckData = await reCheckRes.json();
      expect(reCheckData.acknowledged).toBe(true);
    });
  });
});
