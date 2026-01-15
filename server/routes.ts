import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCanonDocumentSchema, type CanonChunk } from "@shared/schema";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["advisor", "sales"]).default("advisor")
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all canon documents
  app.get("/api/canon", async (req, res) => {
    try {
      const documents = await storage.getAllCanonDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching canon documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Create a new canon document
  app.post("/api/canon", async (req, res) => {
    try {
      const validatedData = insertCanonDocumentSchema.parse(req.body);
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

  // Delete a canon document
  app.delete("/api/canon/:id", async (req, res) => {
    try {
      await storage.deleteCanonDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting canon document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
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
      const { message, mode } = chatRequestSchema.parse(req.body);
      
      const relevantChunks = await storage.searchCanonChunks(message, 5);
      
      const response = generateEpistemicResponse(message, relevantChunks, mode);
      
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

interface ChatResponse {
  content: string;
  citations: Citation[];
  refusalType?: string;
  refusalReason?: string;
  calcProof?: {
    steps: string[];
    sealedParams: string[];
  };
}

function generateEpistemicResponse(message: string, chunks: CanonChunk[], mode: string): ChatResponse {
  const lowerMessage = message.toLowerCase();
  
  const temporalPatterns = [
    /\bshould have\b/,
    /\bwhy didn't\b/,
    /\bwhy did (we|they|you) miss\b/,
    /\bmiss(ed)? the\b/,
    /\bfailed to\b/,
    /\bcould have been avoided\b/,
    /\bwas obvious\b/,
    /\bshould've\b/,
    /\bin hindsight\b/,
    /\blooking back\b/,
    /\bwith the benefit of\b/,
    /\bif only\b/
  ];
  
  if (temporalPatterns.some(pattern => pattern.test(lowerMessage))) {
    return {
      content: "",
      citations: [],
      refusalType: "temporal_boundary",
      refusalReason: "This question uses outcome-laden language that presupposes hindsight knowledge. ELI cannot evaluate what 'should have' been known—only what was knowable at decision time. Please rephrase without retrospective framing."
    };
  }
  
  if (lowerMessage.includes("negligent") || lowerMessage.includes("malpractice") || lowerMessage.includes("blame") || lowerMessage.includes("fault")) {
    return {
      content: "",
      citations: [],
      refusalType: "category_error",
      refusalReason: "Normative judgments about blame, fault, or negligence require moral evaluation that ELI cannot provide. ELI measures epistemic conditions, not moral culpability. For legal determinations, consult qualified counsel."
    };
  }
  
  if (lowerMessage.includes("patient") && (lowerMessage.includes("name") || lowerMessage.includes("record") || lowerMessage.includes("medical history"))) {
    return {
      content: "",
      citations: [],
      refusalType: "medical_safety",
      refusalReason: "ELI does not access, store, or process protected health information (PHI). For patient-specific questions, use authorized clinical systems."
    };
  }
  
  if (chunks.length === 0) {
    return {
      content: "",
      citations: [],
      refusalType: "parrot_box",
      refusalReason: "No Canon source found for this query. ELI cannot make claims without authoritative documentation. Please rephrase your question or confirm the topic is covered in the Canon library."
    };
  }
  
  const citations: Citation[] = chunks.slice(0, 3).map(chunk => ({
    type: "canon" as const,
    source: chunk.sourceFile,
    section: chunk.section || undefined,
    version: chunk.version || undefined,
    canonTier: chunk.canonTier
  }));
  
  const primaryChunk = chunks[0];
  let responseContent = "";
  
  if (lowerMessage.includes("parrot box") || lowerMessage.includes("epistemic boundary")) {
    responseContent = `The Parrot Box is an epistemic boundary condition that enforces the following rule: A system may not speak beyond the information that was causally, temporally, and contextually available at the moment of decision. Anything outside that boundary is classified as inadmissible, non-actionable, or epistemically silent.

The name "Parrot Box" is deliberate—a parrot repeats sounds without understanding; evaluative systems often repeat outcomes, norms, or narratives without legitimate access to the knowledge that would justify them. The Parrot Box exists to prevent parroting certainty.

Critically, the Parrot Box does not filter information for accuracy in the usual sense. It filters epistemic entitlement—asking not "Is this statement true?" but "Was the speaker ever entitled to say this?"`;
  } else if (lowerMessage.includes("eli") || lowerMessage.includes("epistemic load")) {
    responseContent = `ELI (Epistemic Load Index) is a governance instrument designed to separate "decision conditions" from "decision outcome" when reviewing adverse events. Its core properties:

1. **Retrospective**: Only runs after a case independently triggers review
2. **Outcome-blind**: Refuses to let knowledge of the outcome leak into what counts as "what should have been known"
3. **Environment-focused**: Classifies epistemic environments, not individual performance

The architecture consists of: Gatekeeper (admissible evidence) + Epistemic Load scoring (conditions) + Governance outputs (how review is constrained) + Safety hard-coding (anti-surveillance / anti-repurposing).`;
  } else if (lowerMessage.includes("gatekeeper")) {
    responseContent = `The Gatekeeper Substrate enforces a strict boundary: only contemporaneously available, decision-relevant information is admissible.

It explicitly blocks typical contamination channels:
- Later imaging results used as if knowable at time-of-decision
- Downstream specialist interpretations smuggled upstream  
- Outcome-loaded labels ("noncompliant," "should have," "failed to," "missed")
- Post hoc certainty ("it was obvious")

Think of this as a causal DAG constraint: If a variable was not available to the decision-maker at time t, it is not allowed to become a parent node of judgment about the decision at time t.`;
  } else if (lowerMessage.includes("refusal") || lowerMessage.includes("refuse")) {
    responseContent = `ELI implements multiple refusal types to maintain epistemic integrity:

1. **Parrot Box**: Epistemic entitlement absent—no Canon source supports the claim
2. **Category Error**: Wrong type of question (normative judgments, moral evaluations)
3. **Medical Safety**: PHI-related queries that ELI cannot access
4. **Temporal Boundary**: Outcome-blindness enforcement (hindsight contamination)
5. **Withheld Parameter**: Sealed proprietary values in computation proofs

Refusal is a positive epistemic act—it preserves system integrity by constraining speech when conditions for legitimate knowledge are absent.`;
  } else {
    const excerpt = primaryChunk.content.substring(0, 500);
    responseContent = `Based on Canon documentation:\n\n${excerpt}...`;
  }
  
  return {
    content: responseContent,
    citations
  };
}
