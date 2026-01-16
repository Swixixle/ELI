import OpenAI from "openai";
import type { InterpreterOutput, EvidenceCandidate } from "./interpreter";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface GovernorInput {
  metadata: {
    decisionTimeT: string | null;
    laneRequest: "Lane_1_Certainty" | "Lane_2_Risk_Response" | null;
    policyVersion: string;
  };
  epistemicInputs: {
    I_t: EvidenceCandidate[];
    C_t: EvidenceCandidate[];
    O: EvidenceCandidate[];
  };
  proposedClaim: string;
  unknowns: string[];
}

export interface GovernorOutput {
  admissibility: "ALLOWED" | "DISALLOWED" | "CONDITIONAL";
  lane: "Lane_1_Certainty" | "Lane_2_Risk_Response" | "ADVISORY_ONLY";
  determination: string;
  requiredData: string[];
  admissiblePhrasing?: string;
  proceduralFlags: string[];
  riskLevel: "unsafe" | "high" | "medium" | "low";
}

const GOVERNOR_SYSTEM_PROMPT = `You are the ELI Speech Governor. You receive ONLY structured JSON from the Interpreter.

You determine PROCEDURAL ADMISSIBILITY — not truth, not judgment.

## Your Job

Given structured evidence, determine:
1. Is this claim procedurally admissible?
2. What lane applies (Certainty vs Risk Response)?
3. What data is missing?
4. What phrasing IS admissible?

## Five Procedural Prerequisites

1. **Decision Target** - Is there a specific decision being evaluated?
2. **Temporal Verification** - Is the decision time established?
3. **Independent Verification** - Is there third-party corroboration?
4. **Policy Application** - Is there a governing policy reference?
5. **Contextual Constraints** - Are the decision-maker's constraints documented?

## Admissibility Rules

- ALLOWED: 5/5 prerequisites, facts and artifacts only
- CONDITIONAL: 3-4/5 prerequisites, with explicit caveats
- DISALLOWED: 0-2/5 prerequisites, advisory only

## Lane Assignment

- Lane_1_Certainty: Only if claim is entailed by I_t (facts + artifacts)
- Lane_2_Risk_Response: If reasonable precaution under uncertainty
- ADVISORY_ONLY: If neither lane applies

## Output Format

Respond ONLY with valid JSON:
{
  "admissibility": "ALLOWED|DISALLOWED|CONDITIONAL",
  "lane": "Lane_1_Certainty|Lane_2_Risk_Response|ADVISORY_ONLY",
  "determination": "One sentence procedural determination",
  "requiredData": ["list of missing evidence needed for upgrade"],
  "admissiblePhrasing": "If DISALLOWED, suggest what CAN be said",
  "proceduralFlags": ["list of procedural concerns"],
  "riskLevel": "unsafe|high|medium|low"
}`;

export function prepareGovernorInput(
  interpreterOutput: InterpreterOutput,
  policyVersion: string = "v4.0"
): GovernorInput {
  const facts = interpreterOutput.evidenceCandidates.filter(
    (e) => e.type === "fact" || e.type === "artifact"
  );
  const allegations = interpreterOutput.evidenceCandidates.filter(
    (e) => e.type === "allegation"
  );
  const interpretations = interpreterOutput.evidenceCandidates.filter(
    (e) => e.type === "interpretation" || e.type === "unknown"
  );

  return {
    metadata: {
      decisionTimeT: interpreterOutput.metadata.decisionTimeT,
      laneRequest: interpreterOutput.metadata.laneRequest,
      policyVersion,
    },
    epistemicInputs: {
      I_t: facts,
      C_t: allegations,
      O: interpretations,
    },
    proposedClaim: interpreterOutput.proposedClaim,
    unknowns: interpreterOutput.unknowns,
  };
}

export async function evaluateClaim(input: GovernorInput): Promise<GovernorOutput> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: GOVERNOR_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    return JSON.parse(content) as GovernorOutput;
  } catch {
    return {
      admissibility: "DISALLOWED",
      lane: "ADVISORY_ONLY",
      determination: "Failed to evaluate claim due to processing error",
      requiredData: [],
      proceduralFlags: ["SYSTEM_ERROR"],
      riskLevel: "unsafe",
    };
  }
}
