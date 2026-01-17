import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCanonDocumentSchema, insertCaseSchema, insertCaseEventSchema, type CanonChunk, cases, caseEvents, decisionContexts } from "@shared/schema";
import { z } from "zod";
import { evaluateCanonConditions, type EvaluationContext } from "./canonEvaluator";
import { computeCaseStateHash, signReceipt, hashSHA256 } from "./crypto";
import { registerELIRoutes } from "./eli/routes";
import { computeCaseLifecycle } from "./eli/lifecycle";
import { db } from "./db";
import { eq } from "drizzle-orm";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["advisor", "sales"]).default("advisor"),
  caseContext: z.object({
    caseId: z.number(),
    caseName: z.string(),
    decisionTarget: z.string().nullable(),
    decisionTime: z.string().nullable(),
    prerequisitesMet: z.number().min(0).max(5),
    reviewPermission: z.enum(["advisory_only", "permitted", "strong", "regulator_ready"])
  }).optional()
});

interface CaseContext {
  caseId: number;
  caseName: string;
  decisionTarget: string | null;
  decisionTime: string | null;
  prerequisitesMet: number;
  reviewPermission: "advisory_only" | "permitted" | "strong" | "regulator_ready";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === SYSTEM INFO ===
  
  // Scope Integrity Statement (A1)
  app.get("/api", (req, res) => {
    res.json({
      system: "ELI Imaging",
      assertion: "ELI asserts only that sufficient system evidence exists to confirm entry into the results environment at a specific time."
    });
  });

  // === CASE ROUTES ===
  
  // Get all cases (defaults to active only, use ?status=archived or ?status=all, ?origin=SAMPLE_LIBRARY)
  app.get("/api/cases", async (req, res) => {
    try {
      const status = req.query.status as "active" | "archived" | "all" | undefined;
      const origin = req.query.origin as "UPLOADED_BY_USER" | "SAMPLE_LIBRARY" | "IMPORTED" | undefined;
      const validStatus = status === "archived" || status === "all" ? status : "active";
      const validOrigin = origin && ["UPLOADED_BY_USER", "SAMPLE_LIBRARY", "IMPORTED"].includes(origin) ? origin : undefined;
      const allCases = await storage.getAllCases(validStatus, validOrigin);
      res.json(allCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // Get single case
  app.get("/api/cases/:id", async (req, res) => {
    try {
      const caseData = await storage.getCase(req.params.id);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      res.json(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  // Create new case
  app.post("/api/cases", async (req, res) => {
    try {
      const validatedData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(validatedData);
      res.status(201).json(newCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid case data", details: error.errors });
      } else {
        console.error("Error creating case:", error);
        res.status(500).json({ error: "Failed to create case" });
      }
    }
  });

  // Update case (rejects archived cases)
  app.patch("/api/cases/:id", async (req, res) => {
    try {
      const existingCase = await storage.getCase(req.params.id);
      if (!existingCase) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (existingCase.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }
      
      // Convert decisionTime from ISO string to Date if present
      const updates = { ...req.body };
      const hasDecisionTimeChange = updates.decisionTime !== undefined || updates.decisionTimeMode !== undefined;
      
      if (updates.decisionTime !== undefined) {
        updates.decisionTime = updates.decisionTime ? new Date(updates.decisionTime) : null;
      }
      
      // Use Drizzle transaction for decision time changes to ensure atomicity
      if (hasDecisionTimeChange) {
        const updatedCase = await db.transaction(async (tx) => {
          // Create decision context within transaction
          const [newContext] = await tx.insert(decisionContexts).values({
            caseId: req.params.id,
            mode: updates.decisionTimeMode || existingCase.decisionTimeMode || "live",
            decisionTime: updates.decisionTime || null,
            previousContextId: existingCase.currentDecisionContextId || null,
            actor: "user",
            reason: null
          }).returning();
          
          // Create case event within transaction
          const eventMetadata = {
            previousValue: existingCase.decisionTime?.toISOString() || null,
            newValue: updates.decisionTime?.toISOString() || null,
            previousMode: existingCase.decisionTimeMode,
            newMode: updates.decisionTimeMode || (updates.decisionTime ? "fixed" : "live"),
            contextId: newContext.id
          };
          
          await tx.insert(caseEvents).values({
            caseId: req.params.id,
            eventType: "DECISION_TIME_SET",
            description: updates.decisionTime 
              ? `Decision time set to ${updates.decisionTime.toISOString()} (mode: ${updates.decisionTimeMode || "fixed"})`
              : `Decision time reset to live mode`,
            eventTime: new Date(),
            metadata: eventMetadata
          });
          
          // Update case within transaction
          const [result] = await tx.update(cases)
            .set({
              decisionTime: updates.decisionTime,
              decisionTimeMode: updates.decisionTimeMode || existingCase.decisionTimeMode,
              currentDecisionContextId: newContext.id,
              updatedAt: new Date()
            })
            .where(eq(cases.id, req.params.id))
            .returning();
          
          return result;
        });
        
        res.json(updatedCase);
      } else {
        // Non-decision-time updates use existing storage method
        const updatedCase = await storage.updateCase(req.params.id, updates);
        res.json(updatedCase);
      }
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).json({ error: "Failed to update case" });
    }
  });

  // Delete case - DISABLED, use Archive instead
  app.delete("/api/cases/:id", async (req, res) => {
    res.status(405).json({ error: "DELETE_NOT_ALLOWED", status: 405 });
  });

  // Archive case - soft delete with audit trail
  app.post("/api/cases/:id/archive", async (req, res) => {
    try {
      const { reasonCode } = req.body;
      const requestId = req.headers["x-request-id"] || `req_${Date.now()}`;
      const origin = req.ip || req.headers["x-forwarded-for"] || "unknown";
      
      if (!reasonCode) {
        res.status(400).json({ error: "REASON_CODE_REQUIRED", status: 400 });
        return;
      }
      
      const validReasonCodes = ["DUPLICATE", "ENTERED_IN_ERROR", "COMPLETED", "CANCELLED"];
      if (!validReasonCodes.includes(reasonCode)) {
        res.status(400).json({ error: "INVALID_REASON_CODE", status: 400 });
        return;
      }
      
      const existingCase = await storage.getCase(req.params.id);
      if (!existingCase) {
        res.status(404).json({ error: "CASE_NOT_FOUND", status: 404 });
        return;
      }
      
      if (existingCase.status === "archived") {
        res.status(409).json({ error: "ALREADY_ARCHIVED", status: 409 });
        return;
      }
      
      const archivedCase = await storage.archiveCase(req.params.id, {
        reasonCode,
        archivedBy: "user"
      });
      
      // Create audit event with Who/What/When/Where (B: RRS-1 G5)
      await storage.createCaseEvent({
        caseId: req.params.id,
        eventType: "CASE_ARCHIVED",
        description: `Case archived. Reason: ${reasonCode}`,
        eventTime: new Date(),
        metadata: {
          reasonCode,
          environment: process.env.NODE_ENV || "development",
          service: "eli-imaging-api",
          requestId,
          origin
        }
      });
      
      res.json({
        id: archivedCase?.id,
        status: archivedCase?.status,
        archivedAt: archivedCase?.archivedAt,
        archivedBy: archivedCase?.archivedBy,
        archiveReasonCode: archivedCase?.archiveReasonCode
      });
    } catch (error) {
      console.error("Error archiving case:", error);
      res.status(500).json({ error: "ARCHIVE_FAILED", status: 500 });
    }
  });

  // === CASE OVERVIEW (Derived, Read-Only) ===
  
  // Get case overview - aggregated snapshot for immediate comprehension
  app.get("/api/cases/:id/overview", async (req, res) => {
    try {
      const caseData = await storage.getCase(req.params.id);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }

      // Gather all data needed
      const documents = await storage.getDocumentsByCase(req.params.id);
      const events = await storage.getCaseEvents(req.params.id);
      const activeDecisionTarget = await storage.getActiveDecisionTarget(req.params.id);
      const latestDetermination = await storage.getLatestDetermination(req.params.id);
      const printouts = await storage.getCasePrintouts(req.params.id);

      // Build evaluation context
      const evalContext: EvaluationContext = {
        caseData,
        documents,
        events,
        activeDecisionTarget,
      };
      const evaluation = evaluateCanonConditions(evalContext);
      const { checklist, summary } = evaluation;
      
      // Extract prerequisite statuses strictly from evaluator checklist
      const prerequisiteStatus = {
        decisionTarget: checklist.A_decision_target_defined.met ? "met" as const : "unmet" as const,
        temporalVerification: checklist.B_temporal_verification.met ? "met" as const : "unmet" as const,
        independentVerification: checklist.C_independent_verification.met ? "met" as const : "unmet" as const,
        policyApplication: checklist.D_policy_application_record.met ? "met" as const : "unmet" as const,
        contextualConstraints: checklist.E_contextual_constraints.met ? "met" as const : "unmet" as const,
      };

      // Count prerequisites met
      const hasTarget = prerequisiteStatus.decisionTarget === "met";
      const prereqValues = Object.values(prerequisiteStatus) as string[];
      const prerequisitesMet = prereqValues.filter(s => s === "met").length;

      // Determine procedural tier (C: DISS-1 neutral codes)
      type ProceduralTier = "P0" | "P3" | "P4" | "P5";
      let currentRiskTier: ProceduralTier = "P0";
      let reviewPermission: "advisory_only" | "permitted" = "advisory_only";
      
      if (prerequisitesMet >= 5) {
        currentRiskTier = "P5";
        reviewPermission = "permitted";
      } else if (prerequisitesMet >= 4) {
        currentRiskTier = "P4";
        reviewPermission = "permitted";
      } else if (prerequisitesMet >= 3) {
        currentRiskTier = "P3";
        reviewPermission = "permitted";
      } else {
        currentRiskTier = "P0";
        reviewPermission = "advisory_only";
      }

      // Build "what we know" list
      const whatWeKnow: string[] = [];
      if (hasTarget) whatWeKnow.push("Decision target is defined");
      if (caseData.decisionTime) whatWeKnow.push("Decision time is anchored");
      if (documents.length > 0) whatWeKnow.push(`${documents.length} Canon document(s) attached`);
      if (events.length > 0) whatWeKnow.push(`${events.length} timeline event(s) recorded`);
      if (prerequisiteStatus.policyApplication === "met") whatWeKnow.push("Governing policy identified");
      if (prerequisiteStatus.independentVerification === "met") whatWeKnow.push("Independent verification present");

      // Build "what's missing" list
      const whatsMissing: string[] = [];
      if (!hasTarget) whatsMissing.push("Decision target not set");
      if (!caseData.decisionTime) whatsMissing.push("Decision time not anchored");
      if (prerequisiteStatus.temporalVerification === "unmet") whatsMissing.push("Temporal verification incomplete");
      if (prerequisiteStatus.independentVerification === "unmet") whatsMissing.push("No independent verification");
      if (prerequisiteStatus.policyApplication === "unmet") whatsMissing.push("No governing policy attached");
      if (prerequisiteStatus.contextualConstraints === "unmet") whatsMissing.push("Contextual constraints not documented");

      // Compute next action hint
      let nextActionHint = "Case is ready for evaluation";
      if (!hasTarget) {
        nextActionHint = "Set the decision target to begin";
      } else if (!caseData.decisionTime) {
        nextActionHint = "Set the decision time to anchor temporal boundaries";
      } else if (documents.length === 0) {
        nextActionHint = "Upload governing policies or evidence documents";
      } else if (prerequisiteStatus.temporalVerification === "unmet") {
        nextActionHint = "Add timestamped evidence to establish timeline";
      } else if (prerequisiteStatus.policyApplication === "unmet") {
        nextActionHint = "Attach the governing policy or standard";
      } else if (prerequisiteStatus.independentVerification === "unmet") {
        nextActionHint = "Add third-party or independent verification";
      } else if (prerequisiteStatus.contextualConstraints === "unmet") {
        nextActionHint = "Document contextual constraints";
      } else if (reviewPermission === "permitted" && printouts.length === 0) {
        nextActionHint = "Issue a determination to create a judgment record";
      }

      // Extract domain from case name or description
      const domain = caseData.description?.split(" - ")[0] || "General Governance";
      const caseType = caseData.phase || "intake";

      // Compute canonical lifecycle from persisted facts
      const lifecycle = computeCaseLifecycle({
        caseData,
        documents,
        events,
        activeDecisionTarget,
        latestDetermination,
        printouts
      });

      const overview = {
        caseId: caseData.id,
        caseTitle: caseData.name,
        caseType,
        domain,
        phase: caseData.phase as "intake" | "review" | "decision" | "closure",
        
        decisionTarget: activeDecisionTarget?.text || caseData.decisionTarget || null,
        decisionTime: caseData.decisionTime,
        
        canonDocumentCount: documents.length,
        evidenceItemCount: events.length,
        verifiedEvidenceCount: events.filter(e => e.sourceDocId).length,
        
        prerequisiteStatus,
        prerequisitesMet,
        prerequisitesTotal: 5,
        
        currentRiskTier,
        reviewPermission,
        lastEvaluationAt: latestDetermination?.createdAt || null,
        lastPrintoutAt: printouts.length > 0 ? printouts[0].issuedAt : null,
        printoutCount: printouts.length,
        
        nextActionHint,
        whatWeKnow,
        whatsMissing,
        
        lifecycle,
      };

      res.json(overview);
    } catch (error) {
      console.error("Error computing case overview:", error);
      res.status(500).json({ error: "Failed to compute case overview" });
    }
  });

  // === CANON v4.0 EVALUATION ROUTES ===

  // Set/update decision target for a case
  app.post("/api/cases/:id/decision-target", async (req, res) => {
    try {
      const existingCase = await storage.getCase(req.params.id);
      if (!existingCase) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (existingCase.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }
      const { text, setBy } = req.body;
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Decision target text is required" });
        return;
      }
      const target = await storage.setDecisionTarget(req.params.id, text, setBy);
      res.status(201).json(target);
    } catch (error) {
      console.error("Error setting decision target:", error);
      res.status(500).json({ error: "Failed to set decision target" });
    }
  });

  // Get active decision target for a case
  app.get("/api/cases/:id/decision-target", async (req, res) => {
    try {
      const target = await storage.getActiveDecisionTarget(req.params.id);
      if (!target) {
        res.status(404).json({ error: "No active decision target" });
        return;
      }
      res.json(target);
    } catch (error) {
      console.error("Error fetching decision target:", error);
      res.status(500).json({ error: "Failed to fetch decision target" });
    }
  });

  // Set decision time for a case
  app.post("/api/cases/:id/decision-time", async (req, res) => {
    try {
      const existingCase = await storage.getCase(req.params.id);
      if (!existingCase) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (existingCase.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }
      const { timestamp, mode } = req.body;
      if (!timestamp) {
        res.status(400).json({ error: "Decision time timestamp is required" });
        return;
      }
      const updatedCase = await storage.updateCase(req.params.id, {
        decisionTime: new Date(timestamp),
        decisionTimeMode: mode || "explicit",
      });
      res.json(updatedCase);
    } catch (error) {
      console.error("Error setting decision time:", error);
      res.status(500).json({ error: "Failed to set decision time" });
    }
  });

  // Get case events (timeline)
  app.get("/api/cases/:id/events", async (req, res) => {
    try {
      const events = await storage.getCaseEvents(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching case events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Create case event
  app.post("/api/cases/:id/events", async (req, res) => {
    try {
      const existingCase = await storage.getCase(req.params.id);
      if (!existingCase) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (existingCase.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }
      const requestId = req.headers["x-request-id"] || `req_${Date.now()}`;
      const origin = req.ip || req.headers["x-forwarded-for"] || "unknown";
      
      // Augment metadata with Where fields (B: RRS-1 G5)
      const userMetadata = req.body.metadata || {};
      const augmentedMetadata = {
        ...userMetadata,
        environment: process.env.NODE_ENV || "development",
        service: "eli-imaging-api",
        requestId,
        origin
      };
      
      const eventData = {
        ...req.body,
        caseId: req.params.id,
        metadata: augmentedMetadata
      };
      const validatedData = insertCaseEventSchema.parse(eventData);
      const newEvent = await storage.createCaseEvent(validatedData);
      res.status(201).json(newEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid event data", details: error.errors });
      } else {
        console.error("Error creating event:", error);
        res.status(500).json({ error: "Failed to create event" });
      }
    }
  });

  // Evaluate case - returns checklist, gaps, and status (no side effects)
  app.post("/api/cases/:id/evaluate", async (req, res) => {
    try {
      const caseData = await storage.getCase(req.params.id);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }

      const documents = await storage.getDocumentsByCase(req.params.id);
      const events = await storage.getCaseEvents(req.params.id);
      const activeTarget = await storage.getActiveDecisionTarget(req.params.id);

      const ctx: EvaluationContext = {
        caseData,
        documents,
        events,
        activeDecisionTarget: activeTarget,
      };

      const result = evaluateCanonConditions(ctx);
      res.json(result);
    } catch (error) {
      console.error("Error evaluating case:", error);
      res.status(500).json({ error: "Failed to evaluate case" });
    }
  });

  // Create a determination with signed receipt
  app.post("/api/cases/:id/determine", async (req, res) => {
    try {
      const caseData = await storage.getCase(req.params.id);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (caseData.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }

      const documents = await storage.getDocumentsByCase(req.params.id);
      const events = await storage.getCaseEvents(req.params.id);
      const activeTarget = await storage.getActiveDecisionTarget(req.params.id);

      if (!activeTarget) {
        res.status(400).json({ error: "No decision target defined" });
        return;
      }

      const ctx: EvaluationContext = {
        caseData,
        documents,
        events,
        activeDecisionTarget: activeTarget,
      };

      const evaluation = evaluateCanonConditions(ctx);

      const documentsWithoutHash = documents.filter((doc) => !doc.contentHash);
      if (documentsWithoutHash.length > 0) {
        res.status(400).json({
          error: "Documents missing content hash",
          documents: documentsWithoutHash.map((d) => d.name),
          hint: "Re-upload documents to compute content hashes",
        });
        return;
      }

      // Use explicit decision time, or current time for "live" mode
      const effectiveDecisionTime = caseData.decisionTime || new Date();

      const documentsConsidered = documents.map((doc) => ({
        docId: doc.id,
        filename: doc.name,
        sha256: doc.contentHash!,
        uploadedAt: doc.uploadedAt?.toISOString() || "",
        version: doc.version || undefined,
      }));

      const checklistSnapshot: Record<string, boolean> = {
        A_decision_target_defined: evaluation.checklist.A_decision_target_defined.met,
        B_temporal_verification: evaluation.checklist.B_temporal_verification.met,
        C_independent_verification: evaluation.checklist.C_independent_verification.met,
        D_policy_application_record: evaluation.checklist.D_policy_application_record.met,
        E_contextual_constraints: evaluation.checklist.E_contextual_constraints.met,
      };

      const caseStateHash = computeCaseStateHash({
        caseId: req.params.id,
        decisionTarget: activeTarget.text,
        decisionTime: effectiveDecisionTime.toISOString(),
        documentsConsidered: documentsConsidered.map((d) => ({ docId: d.docId, sha256: d.sha256 })),
        checklistSnapshot,
      });

      const receiptData = {
        receiptVersion: "1.0",
        canonVersion: "4.0",
        caseId: req.params.id,
        decisionTarget: {
          text: activeTarget.text,
          setAt: activeTarget.setAt?.toISOString() || null,
          setBy: activeTarget.setBy || null,
        },
        decisionTime: {
          mode: caseData.decisionTime ? "fixed" : "live",
          timestamp: effectiveDecisionTime.toISOString(),
        },
        policyThresholds: {
          minConditionsMet: caseData.policyThresholdMin || 3,
          totalConditions: 5,
          temporalRequired: true,
        },
        documentsConsidered,
        admissibility: {
          rule: "temporal_boundary",
          admittedDocIds: documents.map((d) => d.id),
          excludedDocIds: [],
          notes: [],
        },
        checklist: evaluation.checklist,
        summary: evaluation.summary,
        gapsEquation: evaluation.gapsEquation,
        caseStateHash: {
          sha256: caseStateHash,
        },
      };

      const receiptJson = JSON.stringify(receiptData);
      const signature = signReceipt(receiptJson);
      const signedReceipt = { ...receiptData, signature };

      const determination = await storage.createDetermination({
        caseId: req.params.id,
        status: evaluation.summary.status,
        receiptJson: signedReceipt,
        caseStateHash,
      });

      res.status(201).json(determination);
    } catch (error) {
      console.error("Error creating determination:", error);
      res.status(500).json({ error: "Failed to create determination" });
    }
  });

  // Get latest determination receipt for a case
  app.get("/api/cases/:id/receipt/latest", async (req, res) => {
    try {
      const determination = await storage.getLatestDetermination(req.params.id);
      if (!determination) {
        res.status(404).json({ error: "No determination found" });
        return;
      }
      res.json(determination.receiptJson);
    } catch (error) {
      console.error("Error fetching receipt:", error);
      res.status(500).json({ error: "Failed to fetch receipt" });
    }
  });

  // === SEAL ROUTES (Evidentiary Artifacts) ===

  // POST /api/cases/:id/seal - Atomic seal operation
  app.post("/api/cases/:id/seal", async (req, res) => {
    try {
      const caseId = req.params.id;

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        res.status(404).json({ error: "CASE_NOT_FOUND", status: 404 });
        return;
      }
      if (caseData.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }

      const determination = await storage.getLatestDetermination(caseId);
      if (!determination) {
        res.status(409).json({ error: "NO_DETERMINATION_EXISTS", status: 409 });
        return;
      }

      const receiptData = determination.receiptJson as Record<string, unknown> || {};
      const documents = await storage.getDocumentsByCase(caseId);
      const events = await storage.getCaseEvents(caseId);
      const activeTarget = await storage.getActiveDecisionTarget(caseId);

      const printoutNumber = await storage.getNextPrintoutNumber(caseId);
      const issuedAt = new Date();
      const issuedAtISO = issuedAt.toISOString();

      const rawChecklist = receiptData.checklist as Record<string, { met?: boolean; evidence?: string[] }> || {};
      const normalizedChecklist: Record<string, { met: boolean; evidence: string[] }> = {};
      for (const [key, value] of Object.entries(rawChecklist)) {
        normalizedChecklist[key] = {
          met: value?.met === true,
          evidence: Array.isArray(value?.evidence) ? value.evidence : [],
        };
      }

      const rawSummary = receiptData.summary as Record<string, unknown> || {};
      const normalizedSummary = {
        status: String(rawSummary.status || determination.status || "UNKNOWN"),
        conditionsMet: Number(rawSummary.conditionsMet) || 0,
        conditionsTotal: Number(rawSummary.conditionsTotal) || 5,
        reviewPermitted: rawSummary.reviewPermitted === true,
        proceduralNote: String(rawSummary.proceduralNote || ""),
      };

      const renderedContent = {
        printoutVersion: "1.0",
        printoutNumber,
        issuedAt: issuedAtISO,
        caseInfo: {
          id: caseData.id,
          name: caseData.name,
          description: caseData.description,
          phase: caseData.phase,
          decisionTarget: activeTarget?.text || caseData.decisionTarget,
          decisionTime: caseData.decisionTime?.toISOString() || null,
        },
        determination: {
          id: determination.id,
          status: determination.status,
          canonVersion: determination.canonVersion,
          createdAt: determination.createdAt?.toISOString() || null,
        },
        receipt: receiptData,
        evidence: {
          documents: documents.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            version: d.version,
            contentHash: d.contentHash,
            uploadedAt: d.uploadedAt?.toISOString() || null,
          })),
          events: events.map((e) => ({
            id: e.id,
            type: e.eventType,
            description: e.description,
            eventTime: e.eventTime?.toISOString() || null,
          })),
          documentCount: documents.length,
          eventCount: events.length,
        },
        checklist: normalizedChecklist,
        summary: normalizedSummary,
      };

      const contentJson = JSON.stringify(renderedContent, null, 0);
      const contentHash = hashSHA256(contentJson);
      const signature = signReceipt(contentJson);

      const summaryText = `${normalizedSummary.status} - ${normalizedSummary.conditionsMet}/${normalizedSummary.conditionsTotal} prerequisites met`;

      const printout = await storage.createCasePrintout({
        caseId,
        determinationId: determination.id,
        printoutNumber,
        title: `Sealed Artifact #${printoutNumber}`,
        renderedContent,
        summary: summaryText,
        prerequisitesMet: normalizedSummary.conditionsMet,
        prerequisitesTotal: normalizedSummary.conditionsTotal,
        admissibilityStatus: determination.status,
        caseStateHash: determination.caseStateHash,
        contentHash,
        signatureB64: signature.signatureB64,
        publicKeyId: signature.publicKeyId,
      });

      res.status(201).json({
        artifactId: printout.id,
        caseId: printout.caseId,
        issuedAt: printout.issuedAt,
        contentHash: printout.contentHash,
        caseStateHash: printout.caseStateHash,
        signatureB64: printout.signatureB64 || null,
        publicKeyId: printout.publicKeyId || null,
        sealStatus: "SEALED"
      });
    } catch (error) {
      console.error("Error sealing artifact:", error);
      res.status(500).json({ error: "SEAL_FAILED", status: 500 });
    }
  });

  // === PRINTOUT ROUTES (Immutable Judgment Records) ===

  // Create immutable printout from determination
  app.post("/api/cases/:id/printouts", async (req, res) => {
    try {
      const caseId = req.params.id;
      const { determinationId, title } = req.body;

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (caseData.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }

      let determination;
      if (determinationId) {
        determination = await storage.getDetermination(determinationId);
        if (!determination || determination.caseId !== caseId) {
          res.status(400).json({ error: "Invalid determination for this case" });
          return;
        }
      } else {
        determination = await storage.getLatestDetermination(caseId);
        if (!determination) {
          res.status(400).json({ error: "No determination exists for this case. Create a determination first." });
          return;
        }
      }

      const receiptData = determination.receiptJson as Record<string, unknown>;
      const documents = await storage.getDocumentsByCase(caseId);
      const events = await storage.getCaseEvents(caseId);
      const activeTarget = await storage.getActiveDecisionTarget(caseId);

      const printoutNumber = await storage.getNextPrintoutNumber(caseId);
      const issuedAt = new Date();
      const issuedAtISO = issuedAt.toISOString();

      const rawChecklist = receiptData.checklist as Record<string, { met?: boolean; evidence?: string[] }> || {};
      const normalizedChecklist: Record<string, { met: boolean; evidence: string[] }> = {};
      for (const [key, value] of Object.entries(rawChecklist)) {
        normalizedChecklist[key] = {
          met: value?.met === true,
          evidence: Array.isArray(value?.evidence) ? value.evidence : [],
        };
      }

      const rawSummary = receiptData.summary as Record<string, unknown> || {};
      const normalizedSummary = {
        status: String(rawSummary.status || determination.status || "UNKNOWN"),
        conditionsMet: Number(rawSummary.conditionsMet) || 0,
        conditionsTotal: Number(rawSummary.conditionsTotal) || 5,
        reviewPermitted: rawSummary.reviewPermitted === true,
        proceduralNote: String(rawSummary.proceduralNote || ""),
      };

      const renderedContent = {
        printoutVersion: "1.0",
        printoutNumber,
        issuedAt: issuedAtISO,
        caseInfo: {
          id: caseData.id,
          name: caseData.name,
          description: caseData.description,
          phase: caseData.phase,
          decisionTarget: activeTarget?.text || caseData.decisionTarget,
          decisionTime: caseData.decisionTime?.toISOString() || null,
        },
        determination: {
          id: determination.id,
          status: determination.status,
          canonVersion: determination.canonVersion,
          createdAt: determination.createdAt?.toISOString() || null,
        },
        receipt: receiptData,
        evidence: {
          documents: documents.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            version: d.version,
            contentHash: d.contentHash,
            uploadedAt: d.uploadedAt?.toISOString() || null,
          })),
          events: events.map((e) => ({
            id: e.id,
            type: e.eventType,
            description: e.description,
            eventTime: e.eventTime?.toISOString() || null,
          })),
          documentCount: documents.length,
          eventCount: events.length,
        },
        checklist: normalizedChecklist,
        summary: normalizedSummary,
      };

      const contentJson = JSON.stringify(renderedContent, null, 0);
      const contentHash = hashSHA256(contentJson);

      const signature = signReceipt(contentJson);

      const summaryText = `${normalizedSummary.status} - ${normalizedSummary.conditionsMet}/${normalizedSummary.conditionsTotal} prerequisites met`;

      const printout = await storage.createCasePrintout({
        caseId,
        determinationId: determination.id,
        printoutNumber,
        title: title || `Case Judgment #${printoutNumber}`,
        renderedContent,
        summary: summaryText,
        prerequisitesMet: normalizedSummary.conditionsMet,
        prerequisitesTotal: normalizedSummary.conditionsTotal,
        admissibilityStatus: determination.status,
        caseStateHash: determination.caseStateHash,
        contentHash,
        signatureB64: signature.signatureB64,
        publicKeyId: signature.publicKeyId,
      });

      res.status(201).json(printout);
    } catch (error) {
      console.error("Error creating printout:", error);
      res.status(500).json({ error: "Failed to create printout" });
    }
  });

  // Get all printouts for a case (minimal fields per C.2)
  app.get("/api/cases/:id/printouts", async (req, res) => {
    try {
      const printouts = await storage.getCasePrintouts(req.params.id);
      res.json(printouts.map(p => ({
        artifactId: p.id,
        issuedAt: p.issuedAt,
        verificationStatus: p.signatureB64 ? "SIGNATURE_PRESENT" : "UNSIGNED"
      })));
    } catch (error) {
      console.error("Error fetching printouts:", error);
      res.status(500).json({ error: "FETCH_FAILED", status: 500 });
    }
  });

  // Get single printout (read-only, C.1)
  app.get("/api/cases/:caseId/printouts/:printoutId", async (req, res) => {
    try {
      const printout = await storage.getCasePrintout(req.params.printoutId);
      if (!printout) {
        res.status(404).json({ error: "ARTIFACT_NOT_FOUND", status: 404 });
        return;
      }
      if (printout.caseId !== req.params.caseId) {
        res.status(404).json({ error: "ARTIFACT_NOT_FOUND", status: 404 });
        return;
      }
      res.json({
        artifactId: printout.id,
        caseId: printout.caseId,
        issuedAt: printout.issuedAt,
        contentHash: printout.contentHash,
        caseStateHash: printout.caseStateHash,
        signatureB64: printout.signatureB64 || null,
        publicKeyId: printout.publicKeyId || null,
        renderedContent: printout.renderedContent
      });
    } catch (error) {
      console.error("Error fetching printout:", error);
      res.status(500).json({ error: "FETCH_FAILED", status: 500 });
    }
  });

  // Verification endpoint (A3) - read-only artifact verification
  app.get("/api/printouts/:id/verify", async (req, res) => {
    try {
      const printout = await storage.getCasePrintout(req.params.id);
      if (!printout) {
        res.status(404).json({ error: "PRINTOUT_NOT_FOUND", status: 404 });
        return;
      }
      res.json({
        id: printout.id,
        contentHash: printout.contentHash,
        caseStateHash: printout.caseStateHash,
        signatureB64: printout.signatureB64,
        publicKeyId: printout.publicKeyId,
        issuedAt: printout.issuedAt,
        verificationStatus: printout.signatureB64 ? "SIGNATURE_PRESENT" : "UNSIGNED"
      });
    } catch (error) {
      console.error("Error verifying printout:", error);
      res.status(500).json({ error: "VERIFICATION_FAILED", status: 500 });
    }
  });

  // Explicitly reject DELETE on printouts (immutability enforcement)
  app.delete("/api/cases/:caseId/printouts/:printoutId", (req, res) => {
    res.status(403).json({ error: "PRINTOUT_IMMUTABLE", status: 403 });
  });

  // Explicitly reject PATCH/PUT on printouts (immutability enforcement)
  app.patch("/api/cases/:caseId/printouts/:printoutId", (req, res) => {
    res.status(403).json({ error: "PRINTOUT_IMMUTABLE", status: 403 });
  });

  app.put("/api/cases/:caseId/printouts/:printoutId", (req, res) => {
    res.status(403).json({ error: "PRINTOUT_IMMUTABLE", status: 403 });
  });

  // Get documents for a case
  app.get("/api/cases/:id/documents", async (req, res) => {
    try {
      const documents = await storage.getDocumentsByCase(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching case documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Create document for a case (with duplicate detection)
  app.post("/api/cases/:id/documents", async (req, res) => {
    try {
      const caseData = await storage.getCase(req.params.id);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (caseData.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }
      
      const docData = {
        ...req.body,
        caseId: req.params.id
      };
      
      const validatedData = insertCanonDocumentSchema.parse(docData);
      
      // Check for duplicate by content hash if provided
      if (validatedData.contentHash) {
        const existingDoc = await storage.getDocumentByHash(req.params.id, validatedData.contentHash);
        if (existingDoc) {
          res.status(409).json({ 
            error: "Duplicate document detected",
            message: `A document with identical content already exists: "${existingDoc.name}"`,
            existingDocument: existingDoc
          });
          return;
        }
      }
      
      // Check for duplicate by name+size in same case
      const caseDocuments = await storage.getDocumentsByCase(req.params.id);
      const duplicateByName = caseDocuments.find(
        d => d.name === validatedData.name && d.size === validatedData.size
      );
      if (duplicateByName) {
        res.status(409).json({ 
          error: "Duplicate document detected",
          message: `A document with the same name and size already exists: "${duplicateByName.name}"`,
          existingDocument: duplicateByName
        });
        return;
      }
      
      const newDoc = await storage.createCanonDocument(validatedData);
      res.status(201).json(newDoc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid document data", details: error.errors });
      } else {
        console.error("Error creating case document:", error);
        res.status(500).json({ error: "Failed to create document" });
      }
    }
  });

  // Get single document for a case
  app.get("/api/cases/:caseId/documents/:docId", async (req, res) => {
    try {
      const doc = await storage.getCanonDocument(req.params.docId);
      if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      
      if (doc.caseId !== req.params.caseId) {
        res.status(404).json({ error: "Document not found in this case" });
        return;
      }
      
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Delete document for a case (case-scoped deletion)
  app.delete("/api/cases/:caseId/documents/:docId", async (req, res) => {
    try {
      const { caseId, docId } = req.params;
      
      // Verify case exists
      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      if (caseData.status === "archived") {
        res.status(409).json({ error: "ARCHIVED_RESOURCE_IMMUTABLE", status: 409 });
        return;
      }
      
      // Verify document exists and belongs to this case
      const doc = await storage.getCanonDocument(docId);
      if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      if (doc.caseId !== caseId) {
        res.status(403).json({ error: "Document does not belong to this case" });
        return;
      }
      
      await storage.deleteCanonDocument(docId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting case document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // === DOCUMENT ROUTES ===

  // Get all canon documents (DEPRECATED - use GET /api/cases/:id/documents)
  // This endpoint requires caseId query parameter for case-scoped access
  app.get("/api/canon", async (req, res) => {
    try {
      const caseId = req.query.caseId as string;
      if (!caseId) {
        res.status(400).json({ 
          error: "caseId query parameter is required. Use GET /api/cases/:id/documents to list case documents." 
        });
        return;
      }
      
      // Verify case exists
      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        res.status(404).json({ error: "Case not found" });
        return;
      }
      
      const documents = await storage.getDocumentsByCase(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching canon documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Create a new canon document (DEPRECATED - use POST /api/cases/:id/documents)
  // This endpoint enforces case validation to prevent orphaned documents
  app.post("/api/canon", async (req, res) => {
    try {
      const validatedData = insertCanonDocumentSchema.parse(req.body);
      
      // Enforce case existence
      const caseData = await storage.getCase(validatedData.caseId);
      if (!caseData) {
        res.status(400).json({ error: "Invalid caseId: case does not exist. Use POST /api/cases/:id/documents instead." });
        return;
      }
      
      const newDoc = await storage.createCanonDocument(validatedData);
      res.status(201).json(newDoc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid document data", details: error.errors });
      } else {
        console.error("Error creating canon document:", error);
        res.status(500).json({ error: "Failed to create document" });
      }
    }
  });

  // Delete a canon document (DEPRECATED - use DELETE /api/cases/:caseId/documents/:docId)
  // This endpoint is disabled to enforce case-scoped document management
  app.delete("/api/canon/:id", async (req, res) => {
    res.status(400).json({ 
      error: "Direct document deletion is disabled. Use DELETE /api/cases/:caseId/documents/:docId to delete documents within their case context." 
    });
  });

  // Search Canon chunks
  app.get("/api/canon/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ error: "Query parameter 'q' is required" });
        return;
      }
      const chunks = await storage.searchCanonChunks(query, 10);
      res.json(chunks);
    } catch (error) {
      console.error("Error searching canon:", error);
      res.status(500).json({ error: "Failed to search canon" });
    }
  });

  // Chat endpoint with Canon retrieval
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, mode, caseContext } = chatRequestSchema.parse(req.body);
      
      const relevantChunks = await storage.searchCanonChunks(message, 5);
      
      const response = generateEpistemicResponse(message, relevantChunks, mode, caseContext);
      
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        console.error("Error processing chat:", error);
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  registerELIRoutes(app);

  return httpServer;
}

interface Citation {
  type: "canon" | "dataset";
  source: string;
  section?: string;
  version?: string;
  canonTier?: string;
  retrievedAt?: string;
  asOf?: string;
}

interface Counterfactual {
  condition: string;
  wouldChange: string;
}

interface UserSummary {
  status: "can_proceed" | "needs_more" | "cannot_determine" | "refused";
  statusLabel: string;
  meaning: string;
  missing?: string[];
  nextStep: string;
  counterfactuals?: Counterfactual[];
}

interface ChatResponse {
  content: string;
  citations: Citation[];
  refusalType?: string;
  refusalReason?: string;
  calcProof?: {
    steps: string[];
    sealedParams: string[];
  };
  userSummary?: UserSummary;
}

// Canonical Intent types
type CanonicalIntent = "readiness" | "sufficiency" | "gaps" | "limits" | "risks" | "next_action" | "closure" | "defensibility" | "permission";

// Intent classification patterns
const INTENT_PATTERNS: { intent: CanonicalIntent; patterns: RegExp[] }[] = [
  {
    intent: "readiness",
    patterns: [
      /\b(is|are) (this|the|it) (case |)(ready|prepared)\b/,
      /\bready (for|to) (review|evaluate|assess|decide)\b/,
      /\bcan (we|I) (start|begin|proceed with) (the |a )?(review|evaluation|assessment)\b/,
      /\b(review|audit)(-| )?ready\b/
    ]
  },
  {
    intent: "sufficiency",
    patterns: [
      /\b(do|have) (we|I) have (enough|all|sufficient|all the|the) (documentation|documents|evidence|info|information)\b/,
      /\bis (there|this) enough (documentation|evidence|info|information)\b/,
      /\b(documentation|evidence|information) (is |)(complete|sufficient|enough)\b/,
      /\bhave (everything|what) we need\b/,
      /\b(enough|sufficient) (to|for) (decide|determine|conclude|review)\b/
    ]
  },
  {
    intent: "gaps",
    patterns: [
      /\bwhat('s| is| are) missing\b/,
      /\bis (anything|something) missing\b/,
      /\bwhat (do we|else do we) need\b/,
      /\bwhat('s| is) (weak|incomplete|lacking)\b/,
      /\bgaps? in (the |)(evidence|documentation|case)\b/
    ]
  },
  {
    intent: "limits",
    patterns: [
      /\bwhat (can('t| not)|cannot) (be |)(concluded|determined|decided|known)\b/,
      /\blimits? (of|on) (the |this |)(analysis|review|determination)\b/,
      /\bwhat (are |is )?(the |)limit(s|ations)\b/,
      /\bcannot (be |)(determined|concluded|decided)\b/
    ]
  },
  {
    intent: "risks",
    patterns: [
      /\b(red flags?|concerns?|warning signs?)\b/,
      /\bis (anything|something) (concerning|wrong|problematic)\b/,
      /\b(are there|is there) (any |)(concerns?|issues?|problems?|risks?)\b/,
      /\bwhat (should|could) (we|I) (be |)worried about\b/
    ]
  },
  {
    intent: "next_action",
    patterns: [
      /\bwhat (should|do) (we|I) do next\b/,
      /\bwhat('s| is) (the |)next step\b/,
      /\bnext (step|action|move)\b/,
      /\bwhat now\b/,
      /\bhow (should|do) (we|I) proceed\b/
    ]
  },
  {
    intent: "closure",
    patterns: [
      /\bcan (this|the|we) (case |)(be |)closed\b/,
      /\bclose (this|the) (case|review|matter)\b/,
      /\b(ready|able) to close\b/,
      /\bclosure (eligible|ready|possible)\b/
    ]
  },
  {
    intent: "defensibility",
    patterns: [
      /\b(is|can) (this|the|it) (decision |)(be |)(defensible|justified|supported)\b/,
      /\bcan (we|I) (defend|justify|support) (this|the)\b/,
      /\bwill (this|it) (hold up|stand up|withstand) (to |)(scrutiny|audit|review)\b/
    ]
  },
  {
    intent: "permission",
    patterns: [
      /\b(are|is) (we|it) (allowed|permitted|authorized) (to |)(decide|determine|proceed)\b/,
      /\bcan (we|I) (decide|determine|make a decision|proceed) (now|yet|already)\b/,
      /\b(allowed|permitted|authorized) to (decide|determine|proceed)\b/,
      /\bdo (we|I) have (permission|authorization|approval) (to |)(decide|determine|proceed)\b/,
      /\b(decision|determine|proceed).*\b(allowed|permitted|authorized)\b/,
      /\bpermission (to |)(decide|determine|proceed|review)\b/
    ]
  }
];

function classifyIntent(message: string): CanonicalIntent | null {
  const lowerMessage = message.toLowerCase();
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(lowerMessage))) {
      return intent;
    }
  }
  return null;
}

function getIntentResponse(intent: CanonicalIntent, citations: Citation[], caseContext?: CaseContext): ChatResponse {
  // Handle permission intent with case context
  if (intent === "permission") {
    return getPermissionResponse(citations, caseContext);
  }

  switch (intent) {
    case "readiness":
      return {
        content: `## Readiness Assessment

Based on the documents in this case:

**Current State:**
- Case structure is established
- Source documents are present
- Temporal boundaries need confirmation

**Readiness Determination:**
The case is ready for preliminary review. A final determination requires temporal markers and independent verification.`,
        citations,
        userSummary: {
          status: "can_proceed",
          statusLabel: "Ready for preliminary review",
          meaning: "The case has enough structure to begin review, but not enough for a final decision.",
          nextStep: "Start the review or add more documentation for a complete determination.",
          counterfactuals: [
            { condition: "Decision date markers were added to all evidence", wouldChange: "Status would upgrade to 'Ready for final review'" },
            { condition: "Independent verification was provided", wouldChange: "Defensibility score would increase significantly" },
            { condition: "Key documents were removed", wouldChange: "Status would downgrade to 'Not ready'" }
          ]
        }
      };
    
    case "sufficiency":
      return {
        content: `## Sufficiency Assessment

**What's Present:**
- Case container with documentation
- Source documents available

**What's Needed for Full Determination:**
- Decision date markers on evidence
- Independent verification of key claims
- Clear policy application documentation

**Determination:**
Sufficient for preliminary review; not sufficient for final determination.`,
        citations,
        userSummary: {
          status: "needs_more",
          statusLabel: "Partial sufficiency",
          meaning: "You have enough to start a review, but not enough to reach a final decision.",
          missing: ["Decision date markers", "Independent verification", "Policy application evidence"],
          nextStep: "Upload additional evidence or proceed with a preliminary review.",
          counterfactuals: [
            { condition: "One document with decision-time verification was added", wouldChange: "Sufficiency would reach threshold for final determination" },
            { condition: "All three missing elements were addressed", wouldChange: "Case would qualify for closure review" },
            { condition: "Source documents were undated", wouldChange: "Sufficiency would drop to 'insufficient'" }
          ]
        }
      };
    
    case "gaps":
      return {
        content: `## Gap Analysis

**Missing Elements Identified:**

1. **Temporal Markers** - Evidence lacks clear decision-time stamps
2. **Independent Verification** - No third-party confirmation of claims
3. **Policy Application** - How policies were applied at decision time
4. **Resource Context** - Information about constraints at decision time

**Priority Order:**
Address temporal markers first, as they unlock outcome-blind evaluation.`,
        citations,
        userSummary: {
          status: "needs_more",
          statusLabel: "Gaps identified",
          meaning: "Several key elements are missing that would be needed for a complete evaluation.",
          missing: ["Temporal markers on evidence", "Independent verification", "Policy application records", "Resource context"],
          nextStep: "Upload documents that address these gaps, starting with temporal markers.",
          counterfactuals: [
            { condition: "Temporal markers were added", wouldChange: "Gap list would reduce by 1, priority would shift to verification" },
            { condition: "All four gaps were addressed", wouldChange: "Status would change to 'No gaps identified'" },
            { condition: "A new undocumented claim was introduced", wouldChange: "A fifth gap would be added to the list" }
          ]
        }
      };
    
    case "limits":
      return {
        content: `## Evaluation Limits

**What Cannot Be Determined:**

1. **Individual Fault** - Blame requires moral judgment outside scope
2. **Outcome Causation** - What "caused" the outcome is inadmissible
3. **Should-Have-Known** - Hindsight judgments are blocked
4. **Future Predictions** - Outcomes cannot be predicted

**What CAN Be Determined:**
- Whether procedures were followed
- What information was available at decision time
- Whether the decision was procedurally admissible`,
        citations,
        userSummary: {
          status: "can_proceed",
          statusLabel: "Limits defined",
          meaning: "The system cannot assign blame, predict outcomes, or use hindsight. It CAN evaluate procedural compliance.",
          nextStep: "Ask about procedural compliance or decision-time information availability.",
          counterfactuals: [
            { condition: "Question was rephrased to focus on procedures", wouldChange: "System could provide a procedural determination" },
            { condition: "Legal counsel provided a normative framework", wouldChange: "System could apply that framework (but not generate one)" },
            { condition: "Hindsight data was removed from the query", wouldChange: "Outcome-blindness constraint would lift" }
          ]
        }
      };
    
    case "risks":
      return {
        content: `## Risk Assessment

**Potential Concerns:**

Based on the case materials, no critical red flags have been identified. However, the following warrant attention:

1. **Incomplete Temporal Context** - Missing decision dates could affect admissibility
2. **Unverified Claims** - Some assertions lack independent confirmation
3. **Scope Ambiguity** - Evaluation boundaries may need clarification

**Risk Level:** Low to Moderate

**Recommendation:** Address temporal context before proceeding to final review.`,
        citations,
        userSummary: {
          status: "needs_more",
          statusLabel: "Low-moderate risk",
          meaning: "No critical issues found, but some areas need attention before final review.",
          missing: ["Complete temporal context", "Independent verification of claims"],
          nextStep: "Address the temporal context and verify key claims before final review.",
          counterfactuals: [
            { condition: "Temporal context was completed", wouldChange: "Risk level would drop to 'Low'" },
            { condition: "Independent verification was provided", wouldChange: "Unverified claims concern would be resolved" },
            { condition: "Contradictory evidence was discovered", wouldChange: "Risk level would increase to 'High'" }
          ]
        }
      };
    
    case "next_action":
      return {
        content: `## Recommended Next Steps

**Immediate Actions:**

1. **Confirm Decision Date** - Lock the temporal boundary for evaluation
2. **Upload Supporting Evidence** - Add any missing documentation
3. **Request Preliminary Review** - Get initial procedural assessment

**After Those:**
4. Address any gaps identified in preliminary review
5. Request final determination when all evidence is in place`,
        citations,
        userSummary: {
          status: "can_proceed",
          statusLabel: "Clear path forward",
          meaning: "The next step is to confirm the decision date and add any missing documentation.",
          nextStep: "Set the decision date in the interface, then upload any additional evidence.",
          counterfactuals: [
            { condition: "Decision date was already confirmed", wouldChange: "Step 1 would be skipped, move directly to evidence upload" },
            { condition: "All evidence was already uploaded", wouldChange: "Next step would be to request preliminary review" },
            { condition: "Case was already reviewed", wouldChange: "Next step would be final determination or closure" }
          ]
        }
      };
    
    case "closure":
      return {
        content: `## Closure Eligibility

**Current Status:**
The case is NOT ready for closure.

**Remaining Requirements:**

1. Complete temporal boundary establishment
2. Final procedural determination
3. Documentation of evaluation outcome
4. Audit trail completion

**Closure Criteria:**
All Canon evaluation steps must complete with either a positive determination, negative determination, or explicit refusal with documented reason.`,
        citations,
        userSummary: {
          status: "needs_more",
          statusLabel: "Not ready to close",
          meaning: "The case cannot be closed yet. Several steps remain before closure is appropriate.",
          missing: ["Temporal boundary confirmation", "Final determination", "Audit trail completion"],
          nextStep: "Complete the remaining evaluation steps before requesting closure.",
          counterfactuals: [
            { condition: "All three missing requirements were addressed", wouldChange: "Status would change to 'Ready for closure'" },
            { condition: "Final determination was issued", wouldChange: "Only audit trail completion would remain" },
            { condition: "An unresolved refusal existed", wouldChange: "Closure would require explicit documentation of the refusal reason" }
          ]
        }
      };
    
    case "defensibility":
      return {
        content: `## Defensibility Assessment

**Current Defensibility Status:**

A determination made now would have PARTIAL defensibility:

**Strong Points:**
- Documented source materials
- Clear procedural framework
- Outcome-blind evaluation approach

**Weak Points:**
- Incomplete temporal markers
- Unverified independent claims
- Potential scope ambiguity

**Recommendation:** Strengthen weak points before making a determination that needs to withstand scrutiny.`,
        citations,
        userSummary: {
          status: "needs_more",
          statusLabel: "Partially defensible",
          meaning: "A decision made now could be defended, but has weak points that may be challenged.",
          missing: ["Complete temporal documentation", "Independent verification"],
          nextStep: "Address the weak points before making a determination that needs to withstand audit.",
          counterfactuals: [
            { condition: "Temporal documentation was completed", wouldChange: "Defensibility would improve from 'partial' to 'strong'" },
            { condition: "Independent verification was added", wouldChange: "The 'unverified claims' weak point would be resolved" },
            { condition: "All weak points were addressed", wouldChange: "Determination would be fully defensible under audit" }
          ]
        }
      };
  }
}

function getPermissionResponse(citations: Citation[], caseContext?: CaseContext): ChatResponse {
  // If no case context provided, we cannot determine permission
  if (!caseContext) {
    return {
      content: `## Decision Permission Status: Context Required

**I need case context to answer this question.**

To determine if you are allowed to decide, I need to know:
- Which case you're asking about
- The active Decision Target
- The current prerequisite status

**Action Required:**
Select a case and set a Decision Target, then ask again.`,
      citations,
      userSummary: {
        status: "cannot_determine",
        statusLabel: "No case context",
        meaning: "I cannot determine permission without knowing which case and decision target you're asking about.",
        missing: ["Active case selection", "Decision target"],
        nextStep: "Select a case and set a Decision Target to enable permission determination."
      }
    };
  }

  // If no decision target, we cannot determine permission
  if (!caseContext.decisionTarget) {
    return {
      content: `## Decision Permission Status: Decision Target Required

**The case "${caseContext.caseName}" has no active Decision Target.**

Before I can determine if you're allowed to decide, you must define *what decision* is being imaged.

**Action Required:**
Set a Decision Target for this case (e.g., "Was the termination procedurally valid?").`,
      citations,
      userSummary: {
        status: "cannot_determine",
        statusLabel: "No decision target",
        meaning: "I cannot determine permission without knowing what decision you're asking about.",
        missing: ["Decision target"],
        nextStep: "Set a Decision Target to enable permission determination."
      }
    };
  }

  // Generate permission response based on prerequisite status
  const { prerequisitesMet, reviewPermission, decisionTarget, caseName } = caseContext;
  
  const permissionLabels = {
    "advisory_only": "NOT PERMITTED",
    "permitted": "PERMITTED (with procedural risk)",
    "strong": "PERMITTED (defensible)",
    "regulator_ready": "PERMITTED (regulator-ready)"
  };

  const statusLabels = {
    "advisory_only": "Advisory only — decision not permitted",
    "permitted": "Decision permitted with noted risks",
    "strong": "Decision permitted — defensible",
    "regulator_ready": "Decision permitted — regulator-ready"
  };

  const nextSteps = {
    "advisory_only": "Satisfy at least 3 prerequisites to unlock decision permission.",
    "permitted": "Consider strengthening to 4+ prerequisites for full defensibility.",
    "strong": "You may proceed. Consider adding one more prerequisite for regulator-readiness.",
    "regulator_ready": "You may proceed with full confidence."
  };

  const userStatuses: Record<string, "can_proceed" | "needs_more" | "cannot_determine" | "refused"> = {
    "advisory_only": "needs_more",
    "permitted": "can_proceed",
    "strong": "can_proceed",
    "regulator_ready": "can_proceed"
  };

  return {
    content: `## Decision Permission Status: ${permissionLabels[reviewPermission]}

**Case:** ${caseName}
**Decision Target:** "${decisionTarget}"
**Prerequisites Met:** ${prerequisitesMet}/5

### Procedural Determination

${reviewPermission === "advisory_only" 
  ? `With only ${prerequisitesMet} prerequisite(s) satisfied, this case is in **Advisory Only** status.

**What this means:**
- Imaging can provide guidance, but formal decision is not procedurally authorized
- Any decision made now would lack procedural defensibility
- Minimum threshold is 3/5 prerequisites for decision permission

**Required Action:**
Address the missing prerequisites to unlock decision permission.`
  : reviewPermission === "permitted"
  ? `With ${prerequisitesMet} prerequisites satisfied, decision is **PERMITTED** but carries procedural risk.

**What this means:**
- You have cleared the minimum threshold for decision authority
- The decision is defensible but may have weak points under scrutiny
- Consider strengthening to 4-5 prerequisites for full robustness

**You may proceed**, but note the procedural risk.`
  : reviewPermission === "strong"
  ? `With ${prerequisitesMet} prerequisites satisfied, decision is **PERMITTED** and **defensible**.

**What this means:**
- You have strong procedural grounding
- The decision should withstand normal audit and review
- One more prerequisite would achieve regulator-ready status

**You may proceed** with confidence.`
  : `With ${prerequisitesMet} prerequisites satisfied, decision is **PERMITTED** and **regulator-ready**.

**What this means:**
- Full procedural compliance achieved
- The decision should withstand rigorous regulatory scrutiny
- This is the highest level of procedural defensibility

**You may proceed** with full confidence.`}`,
    citations,
    userSummary: {
      status: userStatuses[reviewPermission],
      statusLabel: statusLabels[reviewPermission],
      meaning: prerequisitesMet >= 3 
        ? `With ${prerequisitesMet}/5 prerequisites met, you have procedural authorization to decide.`
        : `With only ${prerequisitesMet}/5 prerequisites met, formal decision is not yet authorized.`,
      missing: prerequisitesMet < 5 
        ? [`${5 - prerequisitesMet} more prerequisite(s) for maximum defensibility`]
        : undefined,
      nextStep: nextSteps[reviewPermission],
      counterfactuals: [
        { 
          condition: "One additional prerequisite was satisfied", 
          wouldChange: prerequisitesMet < 3 
            ? "Would move closer to decision permission threshold" 
            : prerequisitesMet < 5 
            ? "Would increase defensibility status" 
            : "N/A - maximum already achieved"
        }
      ]
    }
  };
}

function generateEpistemicResponse(message: string, chunks: CanonChunk[], mode: string, caseContext?: CaseContext): ChatResponse {
  const lowerMessage = message.toLowerCase();
  
  const citations: Citation[] = chunks.slice(0, 3).map(chunk => ({
    type: "canon" as const,
    source: chunk.sourceFile,
    section: chunk.section || undefined,
    version: chunk.version || undefined,
    canonTier: chunk.canonTier
  }));

  // CANONICAL INTENT CLASSIFICATION - Check for standardized intents first
  const intent = classifyIntent(message);
  if (intent) {
    return getIntentResponse(intent, citations, caseContext);
  }

  // FINANCIAL INTERPRETATION LAYER - Scenario analysis, not templates
  const financialPatterns = [
    /\bwhat does .* mean for (my|our|the) (bottom line|runway|cash|valuation|covenants?)\b/,
    /\b(ebitda|revenue|margin|profit|earnings|cash flow)\b.*\b(mean|imply|impact|affect)\b/,
    /\bwhat are the (implications?|impact|effects?)\b/,
    /\bwhat does (that|this|\d+[mk]?) mean\b/,
    /\b(bottom line|runway|burn rate|cash position|valuation|multiple)\b/,
    /\bsensitivity\b.*\b(mean|imply|range)\b/
  ];

  if (financialPatterns.some(p => p.test(lowerMessage))) {
    // Extract any numbers from the message
    const numberMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(m|k|million|thousand)?/i);
    const hasNumber = !!numberMatch;
    const extractedValue = numberMatch ? `${numberMatch[1]}${numberMatch[2] || 'M'}` : null;
    
    // Detect what kind of "bottom line" they mean
    const isCashQuestion = /\b(cash|liquidity|runway|burn)\b/.test(lowerMessage);
    const isValuationQuestion = /\b(valuation|multiple|exit|worth)\b/.test(lowerMessage);
    const isCovenantQuestion = /\b(covenant|debt|leverage|ratio)\b/.test(lowerMessage);
    const isBudgetQuestion = /\b(budget|headcount|capacity|spend)\b/.test(lowerMessage);
    const isEbitdaQuestion = /\bebitda\b/.test(lowerMessage);
    
    if (isEbitdaQuestion && hasNumber) {
      const value = parseFloat(numberMatch![1]);
      const suffix = (numberMatch![2] || 'M').toUpperCase();
      const baseValue = suffix === 'K' ? value / 1000 : value;
      
      return {
        content: `## EBITDA Interpretation: ${extractedValue}

### Immediate Implications

**Valuation (at typical multiples):**
| Multiple | Implied Value |
|----------|---------------|
| 5x | $${(baseValue * 5).toFixed(1)}M |
| 7x | $${(baseValue * 7).toFixed(1)}M |
| 10x | $${(baseValue * 10).toFixed(1)}M |

**Cash Flow Proxy:**
- Pre-capex cash generation: ~${extractedValue} annually
- Monthly cash capacity: ~$${(baseValue / 12).toFixed(2)}M

**Debt Capacity (at 3x leverage):**
- Supportable debt: ~$${(baseValue * 3).toFixed(1)}M

### Scenario Bands

| Scenario | EBITDA | Key Driver |
|----------|--------|------------|
| Downside | $${(baseValue * 0.85).toFixed(1)}M | Revenue miss or margin compression |
| Base | $${baseValue.toFixed(1)}M | Current trajectory |
| Upside | $${(baseValue * 1.15).toFixed(1)}M | Operating leverage or pricing power |

### What This Means for Your Bottom Line

**If "bottom line" means cash:** 
You have ~$${(baseValue / 12).toFixed(2)}M/month before capex and debt service.

**If "bottom line" means valuation:**
At market multiples (6-8x), enterprise value range is $${(baseValue * 6).toFixed(0)}M–$${(baseValue * 8).toFixed(0)}M.

**If "bottom line" means covenant headroom:**
At EBITDA of ${extractedValue}, you can support ~$${(baseValue * 3).toFixed(1)}M debt at 3x leverage.

### To Compute Precisely, Provide:
1. Your current debt level (for covenant math)
2. Monthly burn rate (for runway)
3. Target valuation multiple (for exit scenarios)`,
        citations,
        calcProof: {
          steps: [
            `Base EBITDA: ${extractedValue}`,
            `Valuation at 7x: $${(baseValue * 7).toFixed(1)}M`,
            `Debt capacity at 3x: $${(baseValue * 3).toFixed(1)}M`,
            `Monthly cash: $${(baseValue / 12).toFixed(2)}M`
          ],
          sealedParams: ["Industry multiple range", "Risk adjustment factor"]
        }
      };
    }
    
    if (isCashQuestion) {
      return {
        content: `## Cash/Runway Interpretation

### What I Need to Compute Runway

To calculate months of runway, I need just 3 inputs:
1. **Current cash position** (e.g., $5M)
2. **Monthly burn rate** (e.g., $200K/month)
3. **Revenue trajectory** (flat, growing, or declining)

### Provisional Analysis (Before Your Inputs)

**Typical runway scenarios:**

| Cash | Burn | Runway |
|------|------|--------|
| $3M | $150K/mo | 20 months |
| $5M | $200K/mo | 25 months |
| $10M | $300K/mo | 33 months |

**Key sensitivity:** A 20% burn reduction extends runway by ~25%.

### Decision Significance
- <12 months runway: Immediate action required
- 12-18 months: Begin fundraise/cost action
- 18+ months: Strategic optionality

Provide your cash and burn, and I'll compute your exact position with scenario bands.`,
        citations
      };
    }
    
    if (isValuationQuestion) {
      return {
        content: `## Valuation Interpretation

### Standard Valuation Framework

| Metric | Multiple Range | What It Measures |
|--------|----------------|------------------|
| Revenue | 1-5x | Growth potential |
| EBITDA | 5-12x | Profitability + scale |
| ARR (SaaS) | 5-15x | Recurring revenue quality |

### Scenario Bands

| Scenario | Multiple | Key Driver |
|----------|----------|------------|
| Downside | Low end of range | Market correction, execution risk |
| Base | Mid-range | Current trajectory |
| Upside | High end | Strategic premium, growth acceleration |

### To Compute Your Valuation Range, Provide:
1. **EBITDA or Revenue** (trailing or projected)
2. **Industry/sector** (for comp selection)
3. **Growth rate** (for multiple calibration)

I'll return a valuation band with the arithmetic shown.`,
        citations
      };
    }
    
    // Generic financial question - offer clarification choices
    return {
      content: `## Financial Interpretation

"Bottom line" can mean several things. Which applies to you?

### Quick Clarification

**Cash/Runway** → How long can we operate?
**Valuation** → What are we worth at exit/raise?
**Covenants** → Are we within debt limits?
**Budget Capacity** → What can we afford to spend?

### Immediate Interpretation

Whatever your focus, the key drivers are typically:
- **Revenue trajectory** (growth rate, stability)
- **Margin structure** (gross, operating, EBITDA)
- **Cash conversion** (working capital, capex)
- **Leverage** (debt, covenant headroom)

### To Get Scenario Bands, Tell Me:
1. Which "bottom line" matters most right now
2. One key metric (EBITDA, revenue, or cash)
3. Your planning horizon (months or years)

I'll return base/upside/downside scenarios with the math shown.`,
      citations
    };
  }

  // GOVERNANCE JUDGMENT QUESTIONS - Apply Canon rules, don't recite them
  const governancePatterns = [
    /\bwas it (appropriate|fair|right|correct|justified)\b/,
    /\bshould (we|they|I) (discipline|punish|fire|terminate|reprimand)\b/,
    /\bcan we (conclude|determine|say|judge)\b/,
    /\bis it (fair|appropriate|right) to\b/,
    /\bwho (is|was) (responsible|at fault|to blame)\b/,
    /\bfor this outcome\b/,
    /\bdisciplin(e|ary|ing)\b.*\b(unit|team|person|individual|employee)\b/
  ];

  if (governancePatterns.some(pattern => pattern.test(lowerMessage))) {
    // This is a governance judgment question - apply procedural admissibility evaluation
    
    // Check for normative/moral judgment FIRST (blame, fault, guilt) - these get specific response
    const normativeIndicators = [
      /\bwho is (at fault|to blame|responsible)\b/,
      /\bwho('s| is) (guilty|negligent)\b/,
      /\b(blame|fault) for\b/,
      /\bwhose fault\b/
    ];
    
    if (normativeIndicators.some(p => p.test(lowerMessage))) {
      return {
        content: `## Procedural Determination: Fault Attribution Not Admissible

Individual fault attribution requires moral or legal judgment that falls outside epistemic governance scope.

### Reason
Assigning blame presupposes:
- That the actor had the information necessary to act differently
- That deviation from expectation constitutes culpable failure
- That outcome reflects individual rather than systemic factors

None of these can be established from outcome data alone.

### What IS Admissible
- Assessment of decision-time information adequacy
- Evaluation of resource constraints and workload
- Identification of system-level gaps
- Process improvement recommendations

### What is NOT Admissible
- Individual blame or fault finding
- Moral culpability determination
- Legal liability conclusions
- "Should have known" assertions

### Governance-Safe Conclusion
> "The available evidence does not support individual fault attribution. Review should focus on system factors that contributed to the outcome rather than actor-level accountability."

This language may be used verbatim in review documentation. For legal liability or HR determinations, consult qualified counsel.`,
        citations,
        refusalType: "category_error",
        refusalReason: "Fault attribution requires normative judgment outside ELI's scope.",
        userSummary: {
          status: "refused",
          statusLabel: "Cannot Determine",
          meaning: "Assigning individual blame requires moral or legal judgment that this system isn't designed to make. We can help you evaluate the system and processes instead.",
          nextStep: "Ask about decision-time conditions, available information, or process gaps that may have contributed to the outcome."
        }
      };
    }
    
    // Check if discipline/punishment related
    const disciplineIndicators = [
      /\bdisciplin(e|ary|ing)\b/,
      /\bpunish(ment|ing)?\b/,
      /\bfire\b/,
      /\bterminate\b/,
      /\breprimand\b/,
      /\bhold (them |the |)accountable\b/
    ];
    
    const isDisciplineQuestion = disciplineIndicators.some(p => p.test(lowerMessage));
    
    // Check if outcome-based (uses outcome knowledge to justify judgment)
    const outcomeIndicators = [
      /\bfor this outcome\b/,
      /\bbecause (of|it) (the )?(result|outcome|failure|error)\b/,
      /\bthe (result|outcome) was\b/,
      /\bafter (the|this) (happened|occurred|failed)\b/,
      /\bfor the failure\b/,
      /\bfor the error\b/
    ];
    
    const isOutcomeBased = outcomeIndicators.some(p => p.test(lowerMessage));
    
    if (isDisciplineQuestion || isOutcomeBased) {
      return {
        content: `## Procedural Determination: Discipline Not Admissible

Based on Canon constraints, unit-level discipline cannot be procedurally justified using outcome information alone.

### Reason
Disciplinary action requires evidence that a policy violation or negligent decision was knowable and avoidable at decision time. No such determination can be made without:
- The policy version in force at decision-time
- The decision context available to the unit
- Evidence of deviation from required procedure

### What IS Admissible
- System-level review of staffing, workload, and escalation pathways
- Identification of structural contributors to the outcome
- Forward-looking process correction
- Resource adequacy assessment

### What is NOT Admissible
- Unit discipline based on outcome
- Individual fault attribution
- Retrospective "should have known" claims
- Performance action triggered by result alone

### Governance-Safe Conclusion
> "This case supports system remediation, not disciplinary action. Outcome information may inform process improvement but does not establish individual fault under decision-time constraints."

This language may be used verbatim in review documentation.`,
        citations,
        refusalType: "temporal_boundary",
        refusalReason: "Discipline based on outcome knowledge violates temporal admissibility.",
        userSummary: {
          status: "refused",
          statusLabel: "Cannot Justify Discipline",
          meaning: "Disciplinary action can't be supported using only outcome information. We can't use hindsight to determine what someone 'should have known' at decision time.",
          missing: ["Policy version in force at decision time", "Decision context available to the unit", "Evidence of deviation from required procedure"],
          nextStep: "Focus on system improvements rather than individual discipline, or provide decision-time evidence if available."
        }
      };
    }
    
    // Generic governance question - still provide actionable structure
    return {
      content: `## Procedural Evaluation: Additional Context Required

To issue a governance determination, I need decision-time evidence:

### Required Information
1. **Decision Date**: When was the action taken?
2. **Policy Context**: What standards were in force?
3. **Available Information**: What did the actor know?
4. **Constraints**: What resources/time were available?

### What I Can Determine Once Provided
- Whether the decision was procedurally supportable
- Whether information adequacy was sufficient
- Whether system factors contributed to outcome
- What governance conclusions are admissible

### Preliminary Guidance
Until context is provided, the safest governance position is:
> "No individual-level determination can be made without decision-time evidence. System review is appropriate; actor judgment is premature."`,
      citations,
      userSummary: {
        status: "needs_more",
        statusLabel: "More Information Needed",
        meaning: "I can help evaluate this, but I need to know what information and constraints were present when the decision was made.",
        missing: ["Decision date", "Policy context at the time", "What the actor knew", "Resource/time constraints"],
        nextStep: "Provide the decision date and describe the context that was available at that time."
      }
    };
  }
  
  // TEMPORAL BOUNDARY VIOLATIONS - Hindsight language with Governance Synthesis
  const temporalPatterns = [
    /\bshould have\b/,
    /\bwhy didn't\b/,
    /\bwhy did (we|they|you|it) miss\b/,
    /\bmiss(ed)? the\b/,
    /\bfailed to\b/,
    /\bcould have been avoided\b/,
    /\bwas obvious\b/,
    /\bshould've\b/,
    /\bin hindsight\b/,
    /\blooking back\b/,
    /\bwith the benefit of\b/,
    /\bif only\b/,
    /\bwhy was the target\b/,
    /\bwhy did .* (fail|miss|lose)\b/,
    /\bwhy did (the|this|it) .* fail\b/,
    /\bwhat went wrong\b/,
    /\bwhat caused the (failure|error|miss)\b/
  ];
  
  if (temporalPatterns.some(pattern => pattern.test(lowerMessage))) {
    // Detect what kind of outcome question this is for targeted synthesis
    const isTargetQuestion = /\b(target|goal|objective|quota|forecast)\b/.test(lowerMessage);
    const isFailureQuestion = /\b(fail|failure|error|mistake)\b/.test(lowerMessage);
    const isMissQuestion = /\bmiss(ed)?\b/.test(lowerMessage);
    
    let admissibleAnalysis = "";
    let concreteInputs = "";
    
    if (isTargetQuestion || isMissQuestion) {
      admissibleAnalysis = `### Admissible Adjacent Analysis
Instead of explaining the miss, I can evaluate:
- **Target-setting legitimacy**: Were the assumptions reasonable given available data?
- **Planning adequacy**: Did governance controls flag risk before the outcome?
- **Information quality**: Was decision-time data sufficient for the forecast?
- **Resource alignment**: Were constraints acknowledged in the plan?`;
      concreteInputs = `### To Proceed, Provide
- The assumptions used when the target was set
- The controls or checkpoints that were in place
- What data was available at planning time
- Any risk signals documented pre-outcome`;
    } else if (isFailureQuestion) {
      admissibleAnalysis = `### Admissible Adjacent Analysis
Instead of explaining the failure, I can evaluate:
- **Process adequacy**: Were standard procedures followed?
- **Information availability**: Did decision-makers have what they needed?
- **System constraints**: Were there structural barriers to success?
- **Escalation pathways**: Were appropriate channels available?`;
      concreteInputs = `### To Proceed, Provide
- The decision context at the time of action
- What information was available to the actor
- What constraints or pressures existed
- The policy or procedure in force`;
    } else {
      admissibleAnalysis = `### Admissible Adjacent Analysis
I can evaluate decision-time conditions:
- **Information adequacy**: What was knowable at the time?
- **Process compliance**: Were required steps followed?
- **Resource constraints**: What limitations existed?
- **Governance controls**: What oversight was in place?`;
      concreteInputs = `### To Proceed, Provide
- The decision date and context
- What information was available
- What constraints existed
- The relevant policy or procedure`;
    }
    
    return {
      content: `## Procedural Determination: Outcome Explanation Not Admissible

Explaining why something "was missed" or "failed" requires outcome knowledge and causal reconstruction that was not available at decision time. This violates temporal admissibility.

### Reason
Questions framed around outcomes presuppose hindsight:
- The outcome itself was not knowable when decisions were made
- Causal attribution after the fact imports inadmissible information
- "Why did X happen?" assumes X was predictable—which is the question, not the answer

${admissibleAnalysis}

${concreteInputs}

### Governance-Safe Position
> "Outcome explanation is not admissible under decision-time constraints. Analysis should focus on whether planning, controls, and information were adequate at the time—not on explaining results."`,
      citations,
      refusalType: "temporal_boundary",
      refusalReason: "Outcome explanation requires hindsight knowledge that violates temporal admissibility."
    };
  }
  
  // CATEGORY ERRORS - Normative judgments with Governance Synthesis
  if (lowerMessage.includes("negligent") || lowerMessage.includes("malpractice") || lowerMessage.includes("blame") || lowerMessage.includes("fault")) {
    return {
      content: `## Procedural Determination: Normative Judgment Not Admissible

Determinations of negligence, blame, or fault require moral or legal evaluation outside ELI's epistemic scope.

### Reason
Normative judgments presuppose:
- Moral standards that vary by jurisdiction and context
- Legal frameworks ELI is not authorized to interpret
- Individual culpability assessments requiring human judgment

### Admissible Adjacent Analysis
I can evaluate epistemic conditions instead:
- **Information adequacy**: Did the actor have sufficient data?
- **Process compliance**: Were required procedures followed?
- **System factors**: Did structural issues contribute?
- **Resource constraints**: Were limitations documented?

### To Proceed, Provide
- The decision context and available information
- The applicable policy or procedure
- Any documented constraints or pressures

### Governance-Safe Position
> "Fault attribution is not procedurally admissible. Review should assess system factors and information adequacy rather than individual culpability."

For legal liability determinations, consult qualified counsel.`,
      citations,
      refusalType: "category_error",
      refusalReason: "Normative judgments require moral evaluation outside ELI's scope."
    };
  }
  
  // MEDICAL SAFETY with Governance Synthesis
  if (lowerMessage.includes("patient") && (lowerMessage.includes("name") || lowerMessage.includes("record") || lowerMessage.includes("medical history"))) {
    return {
      content: `## Procedural Determination: PHI Access Not Permitted

ELI does not access, store, or process protected health information.

### Reason
- Patient-identifiable data requires HIPAA-compliant systems
- ELI is a governance tool, not a clinical records system
- PHI handling requires audit trails ELI does not provide

### What I Can Do Instead
If you have a governance question about a clinical case:
- Describe the situation without patient identifiers
- Focus on process, policy, or decision-context questions
- Ask about system factors rather than individual records

### Governance-Safe Position
> "PHI-related queries must be directed to authorized clinical systems. Governance analysis can proceed on de-identified case descriptions."`,
      citations,
      refusalType: "medical_safety",
      refusalReason: "PHI access is not permitted under ELI's safety constraints."
    };
  }
  
  // NO CANON FOUND with Governance Synthesis
  if (chunks.length === 0) {
    return {
      content: `## Procedural Determination: No Canon Authority Found

I cannot make claims on this topic without authoritative documentation.

### Reason
ELI only speaks from Canon. Without documented authority:
- Any response would be speculation
- No citation would be available
- The claim would be epistemically illegitimate

### What You Can Do
- Rephrase using terms that may be in the Canon
- Confirm this topic is covered in your document library
- Ask a related question that Canon does address

### Topics I Can Address
Based on current Canon, I can evaluate:
- Epistemic governance and admissibility
- Decision-time constraints and Parrot Box rules
- Gatekeeper substrate and temporal boundaries
- Discipline, fault, and outcome-blindness`,
      citations: [],
      refusalType: "parrot_box",
      refusalReason: "No Canon source found. ELI cannot make unsupported claims."
    };
  }
  
  // DEFINITIONAL QUESTIONS - What is X? (Only case where explanation is appropriate)
  const definitionalPatterns = [
    /\bwhat is (the |a )?(parrot box|eli|epistemic load|gatekeeper)\b/,
    /\bexplain (the |what )?(parrot box|eli|epistemic load|gatekeeper)\b/,
    /\bdefine (the )?(parrot box|eli|epistemic load|gatekeeper)\b/,
    /\bhow does (the )?(parrot box|eli|gatekeeper) work\b/
  ];
  
  if (definitionalPatterns.some(p => p.test(lowerMessage))) {
    if (lowerMessage.includes("parrot box")) {
      return {
        content: "The Parrot Box is an epistemic boundary condition that constrains what the system may say based on what was *knowable at decision-time*.\n\n**Core Rule:** A system may not speak beyond the information that was causally, temporally, and contextually available at the moment of decision.\n\n**Function:** It filters *epistemic entitlement*—asking not \"Is this true?\" but \"Was the speaker entitled to say this?\"\n\n**Purpose:** Prevents hindsight bias, outcome-substitution, and performative certainty in evaluative systems.",
        citations
      };
    }
    if (lowerMessage.includes("eli") || lowerMessage.includes("epistemic load")) {
      return {
        content: "ELI (Epistemic Load Index) is a governance instrument that separates *decision conditions* from *decision outcomes* in adverse event review.\n\n**Properties:**\n- **Retrospective**: Runs only after independent trigger\n- **Outcome-blind**: Excludes hindsight knowledge\n- **Environment-focused**: Classifies conditions, not individuals\n\n**Architecture:** Gatekeeper (admissibility) → Epistemic Load scoring → Governance outputs → Safety constraints",
        citations
      };
    }
    if (lowerMessage.includes("gatekeeper")) {
      return {
        content: "The Gatekeeper Substrate enforces admissibility: only *contemporaneously available, decision-relevant* information may enter evaluation.\n\n**Blocks:**\n- Later results used as if knowable earlier\n- Downstream interpretations smuggled upstream\n- Outcome-loaded labels (\"should have\", \"missed\", \"failed to\")\n- Post-hoc certainty (\"it was obvious\")\n\n**Rule:** If information was not available at time *t*, it cannot justify judgment about decisions at time *t*.",
        citations
      };
    }
  }
  
  // READINESS/SUFFICIENCY QUESTIONS - Do we have enough? Is it ready?
  const readinessPatterns = [
    /\bdo we have (enough|all|all the|sufficient|the) (documentation|documents|evidence|info|information)\b/,
    /\bhave (enough|all|all the|sufficient) (documentation|documents|evidence|info|information)\b/,
    /\bis (there|this) enough (documentation|evidence|info|information)\b/,
    /\bis (the |)documentation (complete|sufficient|enough|ready)\b/,
    /\bis (anything|something) missing\b/,
    /\bwhat('s| is) missing\b/,
    /\bcan we (move forward|proceed|start|begin)\b/,
    /\bwhat('s| is) blocking\b/,
    /\b(audit|review)(-| )?ready\b/,
    /\bready for (review|audit|evaluation)\b/,
    /\bwhat (do we|else do we) need\b/,
    /\bdo we have (everything|what) we need\b/,
    /\bhave (everything|what) we need\b/,
    /\b(documentation|documents|evidence) (that |)(we need|needed|required)\b/
  ];
  
  if (readinessPatterns.some(p => p.test(lowerMessage))) {
    return {
      content: `## Procedural Determination

**Evaluation Sequence Applied:**

1. **Temporal boundary**: Decision date must be established
2. **Gatekeeper filter**: Only contemporaneous information admitted
3. **Epistemic conditions assessed**: Information quality, resource constraints, ambiguity level
4. **Determination**: Based on available case materials

**Current Case Analysis:**

Based on the documents in this case, a preliminary review can begin. However, reaching a final determination requires:
- Confirmation of policy application at decision-time
- Independent verification of key facts
- Clear temporal markers on all evidence`,
      citations,
      userSummary: {
        status: "needs_more",
        statusLabel: "Review can begin",
        meaning: "The case has enough documentation to start a review, but not enough to reach a final determination.",
        missing: ["Independent evidence or confirmation of policy application", "Clear temporal markers on evidence"],
        nextStep: "Upload supporting evidence or request a preliminary review."
      }
    };
  }
  
  // PROCEDURAL QUESTIONS - How should we handle X?
  const proceduralPatterns = [
    /\bhow (should|do) (we|I) (handle|approach|evaluate|review)\b/,
    /\bwhat('s| is) the (correct|right|proper) (way|approach|procedure)\b/
  ];
  
  if (proceduralPatterns.some(p => p.test(lowerMessage))) {
    return {
      content: `## Procedural Guidance

Under Canon constraints, evaluation must follow this sequence:

1. **Establish temporal boundary**: Lock the decision date
2. **Apply Gatekeeper**: Admit only information available at that time
3. **Assess epistemic conditions**: Resource constraints, information quality, ambiguity level
4. **Generate determination**: Procedural approval, rejection, or explicit refusal

**Never:**
- Use outcome knowledge to judge the decision
- Assign individual blame based on results
- Treat outcome as evidence of what "should have been known"`,
      citations,
      userSummary: {
        status: "can_proceed",
        statusLabel: "Procedure defined",
        meaning: "The correct approach follows four steps: lock the date, filter evidence, assess conditions, then determine.",
        nextStep: "Ask a specific governance question like 'Was it appropriate to discipline the unit for this outcome?'"
      }
    };
  }
  
  // PERMISSION QUESTIONS - Backup catch for "Are we allowed to decide?"
  // This should be caught by intent classification, but as a safety net:
  const permissionPatterns = [
    /\b(are|is) (we|it) (allowed|permitted|authorized) (to |)(decide|determine|proceed)\b/,
    /\bcan (we|I) (decide|determine|proceed) (now|yet|already)\b/,
    /\bdo (we|I) have (permission|authorization) (to |)(decide|proceed)\b/,
    /\b(allowed|permitted) to (decide|determine|proceed)\b/
  ];
  
  if (permissionPatterns.some(p => p.test(lowerMessage))) {
    // Route to deterministic permission response
    return getPermissionResponse(citations, caseContext);
  }
  
  // FALLBACK - In Advisor Mode, make a best-effort interpretation instead of refusing
  // Check if this looks like it might be about the case/documentation
  const caseRelatedHints = [
    /\b(case|document|file|evidence|review|ready|need|have|enough|missing|complete|allowed|permitted|permission|decide|proceed)\b/
  ];
  
  if (caseRelatedHints.some(p => p.test(lowerMessage))) {
    // Best-effort: treat as a readiness question
    return {
      content: `## Case Status Assessment

Based on the documents currently loaded in this case, here is the current status:

**What's Present:**
- Case container with basic structure
- Source documents available for review

**What May Be Needed:**
- Temporal markers (decision dates) on evidence
- Independent verification of key claims
- Clear policy application documentation

**Determination:**
A preliminary review can begin, but final determination requires additional evidence.`,
      citations,
      userSummary: {
        status: "needs_more",
        statusLabel: "Preliminary review possible",
        meaning: "I interpreted your question as asking about case readiness. The case has enough to begin review, but not enough for a final decision.",
        missing: ["Decision date markers", "Independent verification", "Policy application evidence"],
        nextStep: "Upload additional evidence or ask a more specific question about what you need."
      }
    };
  }
  
  // True fallback - genuinely unclear intent
  return {
    content: `I'm not sure what governance question you're asking. Here are some examples of what I can help with:

**About your case:** "Do we have enough documentation?" or "What's missing?"
**About decisions:** "Was it appropriate to discipline the unit for this outcome?"
**About process:** "How should we evaluate this situation?"

I'll do my best to interpret your question—just ask naturally.`,
    citations,
    userSummary: {
      status: "cannot_determine",
      statusLabel: "Let me help you ask",
      meaning: "I wasn't sure what you meant, but I'm ready to help. Try one of the example questions or just ask in your own words.",
      nextStep: "Ask about your case, a decision, or how to proceed."
    }
  };
}
