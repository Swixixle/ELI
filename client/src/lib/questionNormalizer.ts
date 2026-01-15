export type IntentType = "verdict" | "action" | "definition" | "meta" | "passthrough";

export interface NormalizedQuestion {
  original: string;
  normalized: string;
  intent: IntentType;
  interpretation?: string;
}

const VERDICT_PATTERNS = [
  /^does\s+/i,
  /^is\s+(this|it|the|that)\s+(enough|sufficient|compliant|acceptable|valid|correct)/i,
  /^can\s+(we|i|they|you)\s+(decide|determine|proceed|conclude)/i,
  /^should\s+(we|i|they)\s+(approve|reject|accept)/i,
  /\bmeet(s)?\s+(the\s+)?(requirements?|standards?|criteria)/i,
  /\bcompliant\b/i,
  /\bsufficient\b/i,
  /\benough\b/i,
];

const ACTION_PATTERNS = [
  /^apply\s+/i,
  /^evaluate\s+/i,
  /^run\s+/i,
  /^check\s+/i,
  /^analyze\s+/i,
  /^assess\s+/i,
  /^review\s+/i,
];

const DEFINITION_PATTERNS = [
  /^what\s+is\s+/i,
  /^define\s+/i,
  /^explain\s+/i,
  /^what\s+does\s+.*\s+mean/i,
  /^what\s+are\s+/i,
];

const META_PATTERNS = [
  /^how\s+do\s+i\s+use/i,
  /^what\s+can\s+you\s+do/i,
  /^help\s*/i,
  /^what\s+commands/i,
  /^how\s+does\s+this\s+work/i,
];

function classifyIntent(question: string): IntentType {
  const q = question.trim();
  
  if (META_PATTERNS.some(p => p.test(q))) return "meta";
  if (DEFINITION_PATTERNS.some(p => p.test(q))) return "definition";
  if (VERDICT_PATTERNS.some(p => p.test(q))) return "verdict";
  if (ACTION_PATTERNS.some(p => p.test(q))) return "action";
  
  return "passthrough";
}

function rewriteVerdictQuestion(question: string): { normalized: string; interpretation: string } {
  const q = question.trim();
  
  if (/^does\s+(.+)\s+meet\s+(the\s+)?(minimum\s+)?(documentation\s+)?requirements?/i.test(q)) {
    const match = q.match(/^does\s+(.+?)\s+meet/i);
    const subject = match?.[1] || "the current record";
    return {
      normalized: `How should we evaluate whether ${subject} meets the minimum documentation requirements under Canon v4.0?`,
      interpretation: "Procedural evaluation of documentation requirements"
    };
  }
  
  if (/^is\s+(this|it)\s+(enough|sufficient)\s*(documentation)?/i.test(q)) {
    return {
      normalized: "What procedural determination is reachable given the current documentation under Canon v4.0?",
      interpretation: "Documentation sufficiency evaluation"
    };
  }
  
  if (/^is\s+(this|it)\s+compliant/i.test(q)) {
    return {
      normalized: "Was it admissible under Canon v4.0 to treat the current record as compliant?",
      interpretation: "Compliance admissibility check"
    };
  }
  
  if (/^can\s+(we|i)\s+(decide|determine|proceed)/i.test(q)) {
    return {
      normalized: "What procedural determination is reachable under Canon v4.0 given the current record?",
      interpretation: "Procedural determination feasibility"
    };
  }
  
  if (/^should\s+(we|i)\s+(approve|accept)/i.test(q)) {
    return {
      normalized: "Under Canon v4.0, what is the admissible procedural path for approval given the current evidence?",
      interpretation: "Approval pathway evaluation"
    };
  }
  
  if (/^should\s+(we|i)\s+reject/i.test(q)) {
    return {
      normalized: "Under Canon v4.0, what is the admissible procedural path for rejection given the current evidence?",
      interpretation: "Rejection pathway evaluation"
    };
  }
  
  return {
    normalized: `How should we evaluate the following question under Canon v4.0: ${q}`,
    interpretation: "General procedural evaluation"
  };
}

function rewriteActionQuestion(question: string): { normalized: string; interpretation: string } {
  const q = question.trim();
  
  if (/^apply\s+(the\s+)?canon\s+evaluation/i.test(q)) {
    return {
      normalized: "How should the Canon evaluation sequence be applied to the current record in this case?",
      interpretation: "Canon evaluation sequence application"
    };
  }
  
  if (/^evaluate\s+/i.test(q)) {
    const subject = q.replace(/^evaluate\s+/i, "").trim();
    return {
      normalized: `How should we evaluate ${subject} under Canon v4.0 procedural constraints?`,
      interpretation: "Procedural evaluation request"
    };
  }
  
  if (/^(check|analyze|assess|review)\s+/i.test(q)) {
    const action = q.match(/^(\w+)/i)?.[1]?.toLowerCase() || "analyze";
    const subject = q.replace(/^(check|analyze|assess|review)\s+/i, "").trim();
    return {
      normalized: `How should we ${action} ${subject} under Canon v4.0 procedural constraints?`,
      interpretation: `Procedural ${action} request`
    };
  }
  
  return {
    normalized: `How should the following action be performed under Canon v4.0: ${q}`,
    interpretation: "General action interpretation"
  };
}

function rewriteDefinitionQuestion(question: string): { normalized: string; interpretation: string } {
  return {
    normalized: question,
    interpretation: "Definition request (passed through)"
  };
}

function getMetaResponse(): { normalized: string; interpretation: string } {
  return {
    normalized: "[META_QUERY]",
    interpretation: "System help request"
  };
}

export function normalizeQuestion(question: string): NormalizedQuestion {
  const intent = classifyIntent(question);
  
  let result: { normalized: string; interpretation: string };
  
  switch (intent) {
    case "verdict":
      result = rewriteVerdictQuestion(question);
      break;
    case "action":
      result = rewriteActionQuestion(question);
      break;
    case "definition":
      result = rewriteDefinitionQuestion(question);
      break;
    case "meta":
      result = getMetaResponse();
      break;
    default:
      result = {
        normalized: question,
        interpretation: undefined as any
      };
  }
  
  return {
    original: question,
    normalized: result.normalized,
    intent,
    interpretation: result.interpretation
  };
}

export function isMetaQuery(normalized: NormalizedQuestion): boolean {
  return normalized.intent === "meta";
}

export function getMetaHelpResponse(): string {
  return `I'm ELI Expert, a governance-grade assistant that provides verifiable, outcome-blind answers.

**What I can help with:**
- Evaluating whether documentation meets procedural requirements
- Checking if decisions are admissible under governance constraints
- Explaining Canon definitions and procedural terms
- Providing step-by-step evaluation of case records

**How to ask questions:**
Just ask naturally! For example:
- "Is this enough documentation?"
- "Does this case meet the requirements?"
- "Can we proceed with this decision?"

I'll interpret your question and apply the appropriate Canon evaluation.`;
}
