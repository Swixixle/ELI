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
  
  const citations: Citation[] = chunks.slice(0, 3).map(chunk => ({
    type: "canon" as const,
    source: chunk.sourceFile,
    section: chunk.section || undefined,
    version: chunk.version || undefined,
    canonTier: chunk.canonTier
  }));

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
    
    // Check if outcome-based (uses outcome knowledge to justify judgment)
    const outcomeIndicators = [
      /\bfor this outcome\b/,
      /\bbecause (of|it) (the )?(result|outcome|failure|error)\b/,
      /\bthe (result|outcome) was\b/,
      /\bafter (the|this) (happened|occurred|failed)\b/
    ];
    
    const isOutcomeBased = outcomeIndicators.some(p => p.test(lowerMessage));
    
    if (isOutcomeBased) {
      return {
        content: "**Procedural Determination: Inadmissible**\n\nDisciplinary or evaluative judgment based solely on outcome information is not permitted under Canon constraints.\n\n**Reason:** Outcome information alone does not establish:\n- Policy violation at decision-time\n- Individual fault or responsibility\n- That the decision-maker could have known or acted differently\n\n**Required for admissibility:**\n1. Evidence of the policy in force at decision-time\n2. The decision context available to the actor\n3. Proof that a violation was knowable pre-outcome\n\nOutcome data may inform *system-level review* but cannot justify *unit-level discipline*.",
        citations,
        refusalType: "temporal_boundary",
        refusalReason: "Discipline based on outcome knowledge violates temporal admissibility. The question presupposes hindsight."
      };
    }
    
    // Check for normative/moral judgment (blame, fault, guilt)
    const normativeIndicators = [
      /\b(blame|fault|guilty|negligent|responsible for)\b/,
      /\bshould be (punished|fired|held accountable)\b/
    ];
    
    if (normativeIndicators.some(p => p.test(lowerMessage))) {
      return {
        content: "**Procedural Determination: Category Error**\n\nThis question requests a normative judgment (blame, fault, guilt) which falls outside ELI's epistemic scope.\n\n**ELI can determine:**\n- Whether the epistemic conditions at decision-time were adequate\n- Whether the information available supported the action taken\n- Whether the decision context was appropriately resourced\n\n**ELI cannot determine:**\n- Moral culpability\n- Legal liability\n- Individual punishment\n\nFor normative determinations, consult qualified legal or HR counsel.",
        citations,
        refusalType: "category_error",
        refusalReason: "Normative judgments require moral evaluation that ELI cannot provide."
      };
    }
    
    // Generic governance question without sufficient context
    return {
      content: "**Procedural Evaluation Required**\n\nTo assess the admissibility of this governance action, I need:\n\n1. **Temporal context**: What was the decision date?\n2. **Policy context**: What rules or standards were in force?\n3. **Decision context**: What information was available to the actor?\n4. **Action taken**: What specific action is being evaluated?\n\nWithout this information, I cannot make a procedural determination. Please provide the decision-time record.",
      citations
    };
  }
  
  // TEMPORAL BOUNDARY VIOLATIONS - Hindsight language
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
  
  // CATEGORY ERRORS - Normative judgments
  if (lowerMessage.includes("negligent") || lowerMessage.includes("malpractice") || lowerMessage.includes("blame") || lowerMessage.includes("fault")) {
    return {
      content: "",
      citations: [],
      refusalType: "category_error",
      refusalReason: "Normative judgments about blame, fault, or negligence require moral evaluation that ELI cannot provide. ELI measures epistemic conditions, not moral culpability. For legal determinations, consult qualified counsel."
    };
  }
  
  // MEDICAL SAFETY
  if (lowerMessage.includes("patient") && (lowerMessage.includes("name") || lowerMessage.includes("record") || lowerMessage.includes("medical history"))) {
    return {
      content: "",
      citations: [],
      refusalType: "medical_safety",
      refusalReason: "ELI does not access, store, or process protected health information (PHI). For patient-specific questions, use authorized clinical systems."
    };
  }
  
  // NO CANON FOUND
  if (chunks.length === 0) {
    return {
      content: "",
      citations: [],
      refusalType: "parrot_box",
      refusalReason: "No Canon source found for this query. ELI cannot make claims without authoritative documentation. Please rephrase your question or confirm the topic is covered in the Canon library."
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
  
  // PROCEDURAL QUESTIONS - How should we handle X?
  const proceduralPatterns = [
    /\bhow (should|do) (we|I) (handle|approach|evaluate|review)\b/,
    /\bwhat('s| is) the (correct|right|proper) (way|approach|procedure)\b/
  ];
  
  if (proceduralPatterns.some(p => p.test(lowerMessage))) {
    return {
      content: "**Procedural Guidance**\n\nUnder Canon constraints, evaluation must follow this sequence:\n\n1. **Establish temporal boundary**: Lock the decision date\n2. **Apply Gatekeeper**: Admit only information available at that time\n3. **Assess epistemic conditions**: Resource constraints, information quality, ambiguity level\n4. **Generate determination**: Procedural approval, rejection, or explicit refusal\n\n**Never:**\n- Use outcome knowledge to judge the decision\n- Assign individual blame based on results\n- Treat outcome as evidence of what \"should have been known\"",
      citations
    };
  }
  
  // FALLBACK - But never dump raw Canon content
  // Instead, ask for clarification or provide structured guidance
  return {
    content: "I can assist with governance questions under Canon constraints. Please specify:\n\n**For evaluations:** \"Was it admissible to [action] given [context]?\"\n**For procedures:** \"How should we evaluate [situation]?\"\n**For definitions:** \"What is [concept]?\"\n\nI apply Canon rules to make procedural determinations—I do not summarize documents.",
    citations
  };
}
