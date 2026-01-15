export type Citation = {
  id: string;
  sourceType: "private_canon" | "public_dataset";
  title: string;
  version?: string;
  section?: string;
  url?: string;
  datasetId?: string;
  date?: string;
  provenance?: {
    institution: string;
    limitations?: string;
    retrievedAt?: string;
    asOf?: string;
  };
};

export type CalcStep = {
  description: string;
  operation: string;
  result: string;
  sourceRef?: string;
};

export type CalcProof = {
  inputs: { label: string; value: string; sourceRef?: string }[];
  steps: CalcStep[];
  finalResult: string;
  sensitivityNote?: string;
};

export type IPSafetyFlag = {
  code: string;
  message: string;
  type: "withheld_parameter" | "temporal_boundary" | "parrot_box" | "category_error" | "medical_safety" | "temporal_public_data" | "sales_unverified";
};

export type VisualSpec = {
  type: "sensitivity_slider" | "cfo_table" | "decision_tree";
  data: any;
};

export type Counterfactual = {
  condition: string;
  wouldChange: string;
};

// Decision Readiness System
export type CasePhase = "intake" | "review" | "decision" | "closure";

export type RequirementStatus = "satisfied" | "missing" | "partial";

export type Requirement = {
  id: string;
  category: string;
  label: string;
  status: RequirementStatus;
  detail?: string;
};

export type RequirementCategory = {
  name: string;
  requirements: Requirement[];
  satisfied: number;
  total: number;
  hint?: string;
};

export type DecisionReadiness = {
  decisionTarget: string | null;
  phase: CasePhase;
  permitted: boolean;
  categories: RequirementCategory[];
  totalSatisfied: number;
  totalRequired: number;
  blockedReason?: string;
  nextPhaseUnlocks?: string;
};

export type UserLayerSummary = {
  status: "can_proceed" | "needs_more" | "cannot_determine" | "refused";
  statusLabel: string;
  meaning: string;
  missing?: string[];
  nextStep: string;
  counterfactuals?: Counterfactual[];
};

// Canonical Intents - The 8 standardized evaluation paths
export type CanonicalIntent = 
  | "readiness"      // Is this case ready to be reviewed or decided?
  | "sufficiency"    // Do we have enough information?
  | "gaps"           // What's missing or weak?
  | "limits"         // What can't be concluded yet?
  | "risks"          // Is anything concerning or invalid?
  | "next_action"    // What should happen next?
  | "closure"        // Can this be closed responsibly?
  | "defensibility"; // Can this decision be justified under scrutiny?

export type IntentConfig = {
  id: CanonicalIntent;
  label: string;
  description: string;
  icon: string;
  question: string;
}

export const CANONICAL_INTENTS: IntentConfig[] = [
  { id: "readiness", label: "Readiness", description: "Is this case ready to be reviewed?", icon: "CheckCircle", question: "Is this case ready for review?" },
  { id: "sufficiency", label: "Sufficiency", description: "Do we have enough information?", icon: "FileText", question: "Do we have enough documentation?" },
  { id: "gaps", label: "What's Missing", description: "What's missing or weak?", icon: "AlertCircle", question: "What's missing from this case?" },
  { id: "limits", label: "Limits", description: "What can't be concluded yet?", icon: "Ban", question: "What can't be determined yet?" },
  { id: "risks", label: "Red Flags", description: "Is anything concerning?", icon: "AlertTriangle", question: "Are there any red flags or concerns?" },
  { id: "next_action", label: "Next Steps", description: "What should happen next?", icon: "ArrowRight", question: "What should we do next?" },
  { id: "closure", label: "Closure", description: "Can this be closed?", icon: "CheckSquare", question: "Can this case be closed?" },
  { id: "defensibility", label: "Defensibility", description: "Can this be justified?", icon: "Shield", question: "Is this decision defensible?" }
];

// Question Bank - Plain language questions organized by intent
export type QuestionBankCategory = {
  id: string;
  label: string;
  icon: string;
  questions: { id: string; label: string; query: string }[];
};

export const QUESTION_BANK: QuestionBankCategory[] = [
  {
    id: "permission",
    label: "Permission to Decide",
    icon: "Lock",
    questions: [
      { id: "can-decide", label: "Are we allowed to decide yet?", query: "Are we allowed to decide yet?" },
      { id: "what-missing", label: "What evidence is still missing?", query: "What evidence is still missing?" },
      { id: "what-blocks", label: "What would block this decision?", query: "What would block this decision?" }
    ]
  },
  {
    id: "evidence",
    label: "Evidence Status",
    icon: "FileSearch",
    questions: [
      { id: "enough-docs", label: "Do we have enough documentation?", query: "Do we have enough documentation?" },
      { id: "what-assumptions", label: "What assumptions are we relying on?", query: "What assumptions are we relying on?" },
      { id: "whats-weak", label: "What's the weakest part of our case?", query: "What's the weakest part of our case?" }
    ]
  },
  {
    id: "limits",
    label: "What We Can't Know",
    icon: "CircleSlash",
    questions: [
      { id: "cant-determine", label: "What can't be determined right now?", query: "What can't be determined right now?" },
      { id: "what-outside", label: "What's outside our scope?", query: "What's outside our scope?" },
      { id: "temporal-gaps", label: "What wasn't knowable at decision time?", query: "What wasn't knowable at decision time?" }
    ]
  },
  {
    id: "defensibility",
    label: "Audit & Defense",
    icon: "Shield",
    questions: [
      { id: "is-defensible", label: "Is this decision defensible?", query: "Is this decision defensible?" },
      { id: "regulator-asks", label: "What if a regulator asks why we decided this?", query: "What if a regulator asks why we decided this?" },
      { id: "can-close", label: "Can this case be closed?", query: "Can this case be closed?" }
    ]
  }
];

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  calcProof?: CalcProof;
  visualSpec?: VisualSpec;
  ipFlags?: IPSafetyFlag[];
  timestamp: number;
  temporalContext?: string;
  interpretation?: string;
  normalizedQuery?: string;
  userSummary?: UserLayerSummary;
};

export const MOCK_CITATIONS: Record<string, Citation> = {
  "c1": {
    id: "c1",
    sourceType: "private_canon",
    title: "Internal Canon (Tier-0)",
    version: "v2.1 (Final)",
    section: "3.2 - Revenue Adjustments",
    date: "2025-10-15"
  },
  "c2": {
    id: "c2",
    sourceType: "private_canon",
    title: "Internal Canon (Tier-0)",
    version: "v4.0",
    section: "Principle 7: Outcome Blindness",
    date: "2024-01-01"
  },
  "c3": {
    id: "c3",
    sourceType: "public_dataset",
    title: "Bureau of Labor Statistics",
    datasetId: "CPI-U-2025",
    url: "https://bls.gov/cpi",
    date: "2025-09-01",
    provenance: {
      institution: "U.S. Department of Labor",
      limitations: "Seasonally adjusted; subject to revision",
      retrievedAt: "2025-10-20T14:32:00Z",
      asOf: "2025-09-01"
    }
  },
  "c4": {
    id: "c4",
    sourceType: "private_canon",
    title: "Sales Canon (Tier-1)",
    version: "v1.3",
    section: "Approved Positioning - Enterprise",
    date: "2025-08-01"
  },
  "c5": {
    id: "c5",
    sourceType: "private_canon",
    title: "Internal Canon (Tier-0)",
    version: "v1.3",
    section: "Measurement Definitions - Compliance Cycle",
    date: "2025-08-01"
  }
};

export const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "ELI Expert System initialized. \n\nI am a governance-grade assistant grounded in **Canon v4.0**. I can assist with financial analysis, compliance queries, and strategic positioning.\n\n*Note: All outputs are outcome-blind and strictly cited.*",
    timestamp: Date.now(),
    temporalContext: "Decision Time: Now (Default)"
  }
];

export const SCENARIO_RESPONSES: Record<string, Partial<Message>> = {
  "revenue": {
    content: "Based on the Q3 performance data, the adjusted EBITDA is **$42.5M**. \n\nThis figure is derived from the reported gross revenue of $120M, applying the standard operating expense deductions and the internal governance adjustment factor.",
    citations: [MOCK_CITATIONS["c1"], MOCK_CITATIONS["c2"]],
    calcProof: {
      inputs: [
        { label: "Gross Revenue (Q3)", value: "$120,000,000", sourceRef: "c1" },
        { label: "Operating Expenses", value: "-$75,000,000", sourceRef: "c1" },
        { label: "Governance Adj. Factor", value: "[SEALED]", sourceRef: "c2" }
      ],
      steps: [
        { description: "Net Operating Income", operation: "$120M - $75M", result: "$45,000,000" },
        { description: "Apply Governance Adjustment", operation: "$45M × [SEALED PARAMETER]", result: "$42,500,000" }
      ],
      finalResult: "$42,500,000",
      sensitivityNote: "The withheld parameter is within the approved 0.92-0.98 variance band."
    },
    ipFlags: [
      { code: "IP_SEALED", message: "Applied an internal governance adjustment factor (withheld as IP) within permitted bounds.", type: "withheld_parameter" }
    ],
    visualSpec: {
      type: "sensitivity_slider",
      data: {
        label: "EBITDA Sensitivity",
        min: 40000000,
        max: 45000000,
        current: 42500000,
        zones: [{ range: [41000000, 44000000], color: "green", label: "Target" }]
      }
    }
  },
  "refusal": {
    content: "### Refusal: Epistemic Boundary Triggered\n\nI cannot answer why the target was missed. \n\nTo answer this would require **outcome knowledge** (hindsight) which is inadmissible at the decision time being simulated. I can only analyze the data available *ex-ante*.",
    ipFlags: [
      { code: "PARROT_BOX", message: "Context insufficient for inference / Outcome-blindness constraint.", type: "parrot_box" }
    ]
  },
  "category_error": {
    content: "### Refusal: Category Error\n\nI cannot determine **fault**, **blame**, or **whether someone should be punished**.\n\nThese are normative moral judgments that cannot be derived from admissible evidence. I am designed for system learning, not actor judgment.\n\n**What I can do instead:**\n- Identify what procedures were in place\n- Show what data was available at decision time\n- Explain governance framework requirements",
    ipFlags: [
      { code: "CATEGORY_ERROR", message: "Normative judgment not derivable from admissible evidence.", type: "category_error" }
    ]
  },
  "medical_safety": {
    content: "### Notice: Medical Safety Boundary\n\nI cannot provide **individualized clinical advice** or process **Protected Health Information (PHI)**.\n\nI can cite public medical guidelines and peer-reviewed literature, but I cannot:\n- Diagnose conditions for specific individuals\n- Recommend treatments for specific patients\n- Process or store patient-identifiable health data\n\n**If your query contains PHI, please redact it before continuing.**",
    ipFlags: [
      { code: "MEDICAL_SAFETY", message: "Individualized clinical advice inadmissible. PHI must be redacted.", type: "medical_safety" }
    ]
  },
  "temporal_public_data": {
    content: "### Refusal: Temporal Data Constraint\n\nThe public dataset you referenced has an **as-of date** that is **after** your set Decision Time.\n\nTo maintain outcome-blindness, I can only use public data with an effective date ≤ your Decision Time. The requested data would not have been available at the point of decision.",
    ipFlags: [
      { code: "TEMPORAL_PUBLIC_DATA", message: "Public data as-of date exceeds decision time boundary.", type: "temporal_public_data" }
    ]
  },
  "sales": {
    content: "Here is the approved positioning for the Enterprise Tier:\n\n> \"Our platform streamlines compliance workflows, allowing your teams to focus on strategy rather than audit prep.\"\n\n**Qualitative benefit supported by Canon.** Quantified deltas require explicit measurement definitions in canon.",
    citations: [MOCK_CITATIONS["c4"]],
    ipFlags: [
      { code: "SALES_QUALITATIVE", message: "Quantified claims withheld: measurement definition not found in Sales Canon.", type: "sales_unverified" }
    ]
  },
  "sales_with_metrics": {
    content: "Here is the approved positioning for the Enterprise Tier:\n\n> \"Our platform delivers **30% faster compliance cycles** by automating the governance layer.\"\n\nThis claim is supported by the Sales Canon with explicit measurement definition.",
    citations: [MOCK_CITATIONS["c4"], MOCK_CITATIONS["c5"]],
    calcProof: {
      inputs: [
        { label: "Baseline (Competitor Avg)", value: "14 Days", sourceRef: "c5" },
        { label: "ELI Enterprise", value: "9.8 Days", sourceRef: "c5" },
        { label: "Measurement Period", value: "Q2-Q3 2025", sourceRef: "c5" }
      ],
      steps: [
        { description: "Calculate Reduction", operation: "14 - 9.8", result: "4.2 Days" },
        { description: "Calculate Percentage", operation: "(4.2 / 14) × 100", result: "30%" }
      ],
      finalResult: "30% Reduction",
      sensitivityNote: "Based on median enterprise customer data. Individual results may vary."
    },
    visualSpec: {
      type: "cfo_table",
      data: {
        headers: ["Metric", "Competitor Avg", "ELI Enterprise", "Delta"],
        rows: [
          ["Compliance Cycle", "14 Days", "9.8 Days", "-30%"]
        ]
      }
    }
  },
  "cpi_query": {
    content: "The latest inflation data indicates a **3.2% increase** in the Consumer Price Index (CPI-U) over the last 12 months. This external benchmark suggests a need to re-evaluate our cost-of-labor assumptions for the upcoming fiscal year.",
    citations: [MOCK_CITATIONS["c3"]],
    calcProof: {
       inputs: [
         { label: "Previous Index", value: "305.2", sourceRef: "c3" },
         { label: "Current Index", value: "315.0", sourceRef: "c3" }
       ],
       steps: [
         { description: "Calculate Percentage Change", operation: "((315.0 - 305.2) / 305.2) × 100", result: "3.21%" },
         { description: "Rounding", operation: "Round to nearest tenth", result: "3.2%" }
       ],
       finalResult: "3.2%",
       sensitivityNote: "Based on unadjusted data. Seasonally adjusted figures may differ."
    }
  }
};
