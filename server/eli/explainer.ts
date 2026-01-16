import OpenAI from "openai";
import type { GovernorOutput } from "./governor";
import type { InterpreterOutput } from "./interpreter";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ExplainerOutput {
  summary: string;
  whatCanBeSaid: string;
  whatCannotBeSaid: string;
  nextSteps: string[];
  terminology: Record<string, string>;
}

const EXPLAINER_SYSTEM_PROMPT = `You are the ELI Explainer. You translate Governor decisions into plain English.

## Rules

1. NEVER upgrade admissibility — if Governor said DISALLOWED, it stays DISALLOWED
2. NEVER add facts — only restate what the Governor determined
3. Introduce terminology naturally — the user learns terms by seeing them
4. Be supportive but honest — acknowledge limitations clearly
5. Focus on what the user CAN do next

## Output Format

Respond with valid JSON:
{
  "summary": "One paragraph plain-English summary of the determination",
  "whatCanBeSaid": "What claims ARE procedurally admissible",
  "whatCannotBeSaid": "What claims are NOT admissible and why",
  "nextSteps": ["Actionable steps to upgrade admissibility"],
  "terminology": { "term": "definition" }
}`;

export async function explainDetermination(
  interpreterOutput: InterpreterOutput,
  governorOutput: GovernorOutput
): Promise<ExplainerOutput> {
  const context = {
    userProposedClaim: interpreterOutput.proposedClaim,
    evidenceProvided: interpreterOutput.evidenceCandidates.length,
    unknowns: interpreterOutput.unknowns,
    governorDetermination: governorOutput,
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXPLAINER_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(context, null, 2) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || "{}";

  try {
    return JSON.parse(content) as ExplainerOutput;
  } catch {
    return {
      summary: governorOutput.determination,
      whatCanBeSaid: governorOutput.admissiblePhrasing || "No admissible claims at this time.",
      whatCannotBeSaid: interpreterOutput.proposedClaim,
      nextSteps: governorOutput.requiredData.map((d) => `Provide: ${d}`),
      terminology: {},
    };
  }
}
