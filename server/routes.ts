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
        refusalReason: "Fault attribution requires normative judgment outside ELI's scope."
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
        refusalReason: "Discipline based on outcome knowledge violates temporal admissibility."
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
      citations
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
