import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface EvidenceCandidate {
  type: "fact" | "artifact" | "allegation" | "interpretation" | "unknown";
  description: string;
  timestamp?: string;
  source?: string;
}

export interface InterpreterOutput {
  evidenceCandidates: EvidenceCandidate[];
  proposedClaim: string;
  unknowns: string[];
  clarifyingQuestions?: string[];
  metadata: {
    decisionTimeT: string | null;
    laneRequest: "Lane_1_Certainty" | "Lane_2_Risk_Response" | null;
  };
}

const INTERPRETER_SYSTEM_PROMPT = `You are the ELI Interpreter. Your job is to take messy, natural language input from users and produce structured evidence for the Speech Governor.

You are NOT a judge. You do NOT make conclusions. You extract and label.

## Your Three Outputs

1. **Evidence Candidates** - Extract and label each piece of information:
   - "fact": Observable, timestamped, verifiable
   - "artifact": Document, log, message, record
   - "allegation": Someone's account of events
   - "interpretation": Emotion, judgment, opinion
   - "unknown": Mentioned but not provided

2. **Proposed Claim** - Rewrite the user's intent as a formal claim
   - Convert "he lied" → "Employee intentionally misled supervisor about X"
   - Label it as user-proposed, not truth

3. **Unknowns** - List what evidence is missing:
   - Timestamps
   - Contemporaneous artifacts
   - Third-party verification
   - Policy references

## Rules

- NEVER make conclusions about truth or intent
- NEVER assign blame or responsibility
- ALWAYS label interpretations as interpretations
- If essential information is missing, provide clarifying questions
- Extract timestamps whenever mentioned

## Output Format

Respond ONLY with valid JSON matching this structure:
{
  "evidenceCandidates": [
    { "type": "fact|artifact|allegation|interpretation|unknown", "description": "...", "timestamp": "ISO-8601 or null", "source": "..." }
  ],
  "proposedClaim": "The user's intent rewritten as a formal claim",
  "unknowns": ["list of missing evidence"],
  "clarifyingQuestions": ["optional questions if essential info missing"],
  "metadata": {
    "decisionTimeT": "ISO-8601 or null",
    "laneRequest": "Lane_1_Certainty or Lane_2_Risk_Response or null"
  }
}`;

export async function interpretUserInput(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<InterpreterOutput> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: INTERPRETER_SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || "{}";
  
  try {
    return JSON.parse(content) as InterpreterOutput;
  } catch {
    return {
      evidenceCandidates: [],
      proposedClaim: "",
      unknowns: ["Failed to parse user input"],
      clarifyingQuestions: ["Could you please rephrase your question?"],
      metadata: { decisionTimeT: null, laneRequest: null },
    };
  }
}
