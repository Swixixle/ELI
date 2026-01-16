export { interpretUserInput, type InterpreterOutput, type EvidenceCandidate } from "./interpreter";
export { evaluateClaim, prepareGovernorInput, type GovernorInput, type GovernorOutput } from "./governor";
export { explainDetermination, type ExplainerOutput } from "./explainer";

import { interpretUserInput } from "./interpreter";
import { evaluateClaim, prepareGovernorInput } from "./governor";
import { explainDetermination } from "./explainer";

export interface ELIPipelineResult {
  interpreterOutput: Awaited<ReturnType<typeof interpretUserInput>>;
  governorOutput: Awaited<ReturnType<typeof evaluateClaim>>;
  explanation: Awaited<ReturnType<typeof explainDetermination>>;
  clarifyingQuestions?: string[];
}

export async function processUserQuery(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  policyVersion: string = "v4.0"
): Promise<ELIPipelineResult> {
  const interpreterOutput = await interpretUserInput(userMessage, conversationHistory);

  if (interpreterOutput.clarifyingQuestions && interpreterOutput.clarifyingQuestions.length > 0) {
    return {
      interpreterOutput,
      governorOutput: {
        admissibility: "DISALLOWED",
        lane: "ADVISORY_ONLY",
        determination: "Insufficient information to proceed",
        requiredData: interpreterOutput.unknowns,
        proceduralFlags: ["NEEDS_CLARIFICATION"],
        riskLevel: "unsafe",
      },
      explanation: {
        summary: "I need a bit more information before I can evaluate this.",
        whatCanBeSaid: "",
        whatCannotBeSaid: "",
        nextSteps: interpreterOutput.clarifyingQuestions,
        terminology: {},
      },
      clarifyingQuestions: interpreterOutput.clarifyingQuestions,
    };
  }

  const governorInput = prepareGovernorInput(interpreterOutput, policyVersion);
  const governorOutput = await evaluateClaim(governorInput);
  const explanation = await explainDetermination(interpreterOutput, governorOutput);

  return {
    interpreterOutput,
    governorOutput,
    explanation,
  };
}
