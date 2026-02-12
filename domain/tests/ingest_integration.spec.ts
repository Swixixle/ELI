import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = "http://localhost:5000";
const INGEST_TOKEN = process.env.ELI_INGEST_TOKEN || "eli-ingest-test-token-2026";

describe("External Ingest Integration", () => {
  const createdCaseIds: string[] = [];

  describe("Auth enforcement", () => {
    it("rejects requests without Authorization header", async () => {
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "lantern",
          eventTime: new Date().toISOString(),
          description: "test",
        }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Authorization");
    });

    it("rejects requests with wrong token", async () => {
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer wrong-token",
        },
        body: JSON.stringify({
          source: "lantern",
          eventTime: new Date().toISOString(),
          description: "test",
        }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Invalid ingest token");
    });

    it("rejects disallowed sources (fail closed)", async () => {
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "unknown-tool",
          eventTime: new Date().toISOString(),
          description: "test",
        }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("INGEST_SOURCE_NOT_ALLOWED");
    });
  });

  describe("Schema validation", () => {
    it("rejects payloads missing required fields", async () => {
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({ source: "lantern" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid ingest payload");
    });
  });

  describe("Successful ingest", () => {
    it("creates a new case and event when no caseId provided", async () => {
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          eventTime: "2026-02-11T18:22:00.000Z",
          eventType: "external_ingest",
          description: "Lantern output captured for evaluation",
          metadata: { requestId: "test-uuid", model: "gpt-4o" },
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.caseId).toBeDefined();
      expect(data.eventId).toBeDefined();
      expect(data.url).toContain(data.caseId);
      createdCaseIds.push(data.caseId);
    });

    it("appends event to existing case when caseId provided", async () => {
      const caseId = createdCaseIds[0];
      expect(caseId).toBeDefined();

      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          caseId,
          eventTime: "2026-02-11T19:00:00.000Z",
          description: "Follow-up Lantern output",
          metadata: { requestId: "test-uuid-2" },
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.caseId).toBe(caseId);
    });

    it("creates audit trail event alongside the ingest event", async () => {
      const caseId = createdCaseIds[0];
      const eventsRes = await fetch(`${API_BASE}/api/cases/${caseId}/events`);
      expect(eventsRes.status).toBe(200);
      const events = await eventsRes.json();

      const auditEvents = events.filter(
        (e: any) => e.eventType === "audit_ingest_received"
      );
      expect(auditEvents.length).toBeGreaterThanOrEqual(1);
      expect(auditEvents[0].metadata.ingestSource).toBe("lantern");
    });

    it("ingested case appears in case list with correct origin", async () => {
      const caseId = createdCaseIds[0];
      const caseRes = await fetch(`${API_BASE}/api/cases/${caseId}`);
      expect(caseRes.status).toBe(200);
      const caseData = await caseRes.json();
      expect(caseData.origin).toBe("EXTERNAL_INGEST");
    });
  });

  describe("Idempotency", () => {
    it("rejects duplicate (source, requestId) for same case", async () => {
      const caseId = createdCaseIds[0];
      const uniqueRequestId = `idem-case-${Date.now()}`;

      const first = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          caseId,
          requestId: uniqueRequestId,
          eventTime: new Date().toISOString(),
          description: "First ingest",
        }),
      });
      expect(first.status).toBe(201);

      const second = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          caseId,
          requestId: uniqueRequestId,
          eventTime: new Date().toISOString(),
          description: "Duplicate ingest",
        }),
      });
      expect(second.status).toBe(409);
      const data = await second.json();
      expect(data.error).toBe("DUPLICATE_REQUEST");
      expect(data.caseId).toBe(caseId);
    });

    it("rejects duplicate (source, requestId) even without caseId (global dedupe)", async () => {
      const uniqueRequestId = `idem-global-${Date.now()}`;

      const first = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          requestId: uniqueRequestId,
          eventTime: new Date().toISOString(),
          description: "First global ingest",
        }),
      });
      expect(first.status).toBe(201);
      const firstData = await first.json();
      expect(firstData.caseId).toBeDefined();
      createdCaseIds.push(firstData.caseId);

      const second = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          requestId: uniqueRequestId,
          eventTime: new Date().toISOString(),
          description: "Duplicate global ingest — should be rejected",
        }),
      });
      expect(second.status).toBe(409);
      const data = await second.json();
      expect(data.error).toBe("DUPLICATE_REQUEST");
      expect(data.caseId).toBe(firstData.caseId);
    });

    it("allows ingest without requestId (no idempotency check)", async () => {
      const caseId = createdCaseIds[0];
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          caseId,
          eventTime: new Date().toISOString(),
          description: "No requestId means no idempotency check",
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  describe("Edge cases", () => {
    it("rejects ingest to archived case", async () => {
      const caseRes = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Archive Test", description: "test" }),
      });
      const caseData = await caseRes.json();
      createdCaseIds.push(caseData.id);

      await fetch(`${API_BASE}/api/cases/${caseData.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonCode: "COMPLETED" }),
      });

      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          caseId: caseData.id,
          eventTime: new Date().toISOString(),
          description: "Should be rejected",
        }),
      });

      expect(res.status).toBe(409);
    });

    it("rejects ingest to nonexistent case", async () => {
      const res = await fetch(`${API_BASE}/api/integrations/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INGEST_TOKEN}`,
        },
        body: JSON.stringify({
          source: "lantern",
          caseId: "00000000-0000-0000-0000-000000000000",
          eventTime: new Date().toISOString(),
          description: "Should be rejected",
        }),
      });

      expect(res.status).toBe(404);
    });
  });
});
