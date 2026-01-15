import { CanonicalIntent } from "./types";

type IntentPattern = {
  intent: CanonicalIntent;
  patterns: RegExp[];
  keywords: string[];
};

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "readiness",
    patterns: [
      /\b(is|are) (this|the|it) (case |)(ready|prepared)\b/,
      /\bready (for|to) (review|evaluate|assess|decide)\b/,
      /\bcan (we|I) (start|begin|proceed with) (the |a )?(review|evaluation|assessment)\b/,
      /\b(review|audit)(-| )?ready\b/
    ],
    keywords: ["ready", "prepared", "start review", "begin evaluation"]
  },
  {
    intent: "sufficiency",
    patterns: [
      /\b(do|have) (we|I) have (enough|all|sufficient|all the|the) (documentation|documents|evidence|info|information)\b/,
      /\bis (there|this) enough (documentation|evidence|info|information)\b/,
      /\b(documentation|evidence|information) (is |)(complete|sufficient|enough)\b/,
      /\bhave (everything|what) we need\b/,
      /\b(enough|sufficient) (to|for) (decide|determine|conclude|review)\b/
    ],
    keywords: ["enough", "sufficient", "complete", "all documentation", "have everything"]
  },
  {
    intent: "gaps",
    patterns: [
      /\bwhat('s| is| are) missing\b/,
      /\bis (anything|something) missing\b/,
      /\bwhat (do we|else do we) need\b/,
      /\bwhat('s| is) (weak|incomplete|lacking)\b/,
      /\bgaps? in (the |)(evidence|documentation|case)\b/,
      /\bmissing (from |in )?(the |this )?(case|documentation|evidence)\b/
    ],
    keywords: ["missing", "gaps", "need more", "incomplete", "weak", "lacking"]
  },
  {
    intent: "limits",
    patterns: [
      /\bwhat (can('t| not)|cannot) (be |)(concluded|determined|decided|known)\b/,
      /\blimits? (of|on) (the |this |)(analysis|review|determination)\b/,
      /\bwhat (are |is )?(the |)limit(s|ations)\b/,
      /\bcannot (be |)(determined|concluded|decided)\b/,
      /\bbeyond (the |)scope\b/
    ],
    keywords: ["limits", "limitations", "cannot determine", "beyond scope", "can't conclude"]
  },
  {
    intent: "risks",
    patterns: [
      /\b(red flags?|concerns?|warning signs?|issues?|problems?)\b/,
      /\bis (anything|something) (concerning|wrong|problematic)\b/,
      /\b(are there|is there) (any |)(concerns?|issues?|problems?|risks?)\b/,
      /\bwhat (should|could) (we|I) (be |)worried about\b/,
      /\b(invalid|suspicious|questionable)\b/
    ],
    keywords: ["red flags", "concerns", "risks", "issues", "problems", "warning", "worried"]
  },
  {
    intent: "next_action",
    patterns: [
      /\bwhat (should|do) (we|I) do next\b/,
      /\bwhat('s| is) (the |)next step\b/,
      /\bnext (step|action|move)\b/,
      /\bwhat now\b/,
      /\bhow (should|do) (we|I) proceed\b/,
      /\bwhat (to|should I) do\b/
    ],
    keywords: ["next step", "what now", "proceed", "do next", "action"]
  },
  {
    intent: "closure",
    patterns: [
      /\bcan (this|the|we) (case |)(be |)closed\b/,
      /\bclose (this|the) (case|review|matter)\b/,
      /\b(ready|able) to close\b/,
      /\bclosure (eligible|ready|possible)\b/,
      /\bfinalize (this|the) (case|review)\b/
    ],
    keywords: ["close", "closure", "finalize", "wrap up", "complete"]
  },
  {
    intent: "defensibility",
    patterns: [
      /\b(is|can) (this|the|it) (decision |)(be |)(defensible|justified|supported)\b/,
      /\bcan (we|I) (defend|justify|support) (this|the)\b/,
      /\bwill (this|it) (hold up|stand up|withstand) (to |)(scrutiny|audit|review)\b/,
      /\b(audit|legal|regulatory) (proof|ready|safe)\b/
    ],
    keywords: ["defensible", "justified", "defend", "scrutiny", "hold up", "stand up"]
  }
];

export type ClassificationResult = {
  intent: CanonicalIntent | null;
  confidence: "high" | "medium" | "low";
  matchedPattern?: string;
};

export function classifyIntent(message: string): ClassificationResult {
  const lowerMessage = message.toLowerCase().trim();
  
  for (const { intent, patterns, keywords } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          intent,
          confidence: "high",
          matchedPattern: pattern.source
        };
      }
    }
  }
  
  for (const { intent, keywords } of INTENT_PATTERNS) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          intent,
          confidence: "medium",
          matchedPattern: keyword
        };
      }
    }
  }
  
  return {
    intent: null,
    confidence: "low"
  };
}

export function getIntentFromMessage(message: string): CanonicalIntent | null {
  const result = classifyIntent(message);
  return result.intent;
}
