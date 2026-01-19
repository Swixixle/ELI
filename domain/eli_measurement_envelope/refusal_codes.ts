/**
 * ELI Measurement Envelope Refusal Codes
 * 
 * Constitutional Reference: eli_measurement_envelope.md v1.0
 * 
 * Per Section 12: Failure handling must produce specific errors.
 */

export const ELI_REFUSAL_CODES = Object.freeze({
  ENVELOPE_MISSING: "ELI_ENVELOPE_MISSING",
  ENVELOPE_INCOMPLETE: "ELI_ENVELOPE_INCOMPLETE",
  ENVELOPE_HASH_MISMATCH: "ELI_ENVELOPE_HASH_MISMATCH",
  OUTCOME_IN_MEASUREMENT: "ELI_M1_OUTCOME_IN_MEASUREMENT",
  UPWARD_AUTHORITY_ATTEMPT: "ELI_M2_UPWARD_AUTHORITY_ATTEMPT",
  NO_ENVELOPE_INSPECTION: "ELI_M3_NO_ENVELOPE_INSPECTION",
  INCOMPATIBLE_COMPARISON: "ELI_M4_INCOMPATIBLE_COMPARISON",
  ENVELOPE_STRIPPED: "ELI_M5_ENVELOPE_STRIPPED",
  PROHIBITED_USE_INVOKED: "ELI_PROHIBITED_USE_INVOKED",
  SCORE_EXTRACTION: "ELI_SCORE_EXTRACTION",
  THRESHOLD_REDEFINITION: "ELI_THRESHOLD_REDEFINITION",
  INCOMPATIBLE_AGGREGATION: "ELI_INCOMPATIBLE_AGGREGATION",
  NARRATIVE_REINTERPRETATION: "ELI_NARRATIVE_REINTERPRETATION",
  BLAME_JUSTIFICATION: "ELI_BLAME_JUSTIFICATION",
  INDIVIDUAL_RANKING: "ELI_INDIVIDUAL_RANKING",
} as const);

export type EliRefusalCode = typeof ELI_REFUSAL_CODES[keyof typeof ELI_REFUSAL_CODES];

export interface EliRefusal {
  readonly code: EliRefusalCode;
  readonly axiom?: string;
  readonly message: string;
  readonly timestamp: string;
}

const REFUSAL_MESSAGES: Record<EliRefusalCode, string> = {
  [ELI_REFUSAL_CODES.ENVELOPE_MISSING]: "Measurement envelope is missing. A measurement without an envelope is epistemically invalid.",
  [ELI_REFUSAL_CODES.ENVELOPE_INCOMPLETE]: "Measurement envelope is incomplete. All mandatory fields are required.",
  [ELI_REFUSAL_CODES.ENVELOPE_HASH_MISMATCH]: "Envelope hash mismatch. Measurement invalidated.",
  [ELI_REFUSAL_CODES.OUTCOME_IN_MEASUREMENT]: "Outcome knowledge detected in measurement. S3/S4 strata are categorically excluded.",
  [ELI_REFUSAL_CODES.UPWARD_AUTHORITY_ATTEMPT]: "Measurement cannot infer competence, assign blame, justify discipline, or override admissibility.",
  [ELI_REFUSAL_CODES.NO_ENVELOPE_INSPECTION]: "Interpretation without envelope inspection is invalid.",
  [ELI_REFUSAL_CODES.INCOMPATIBLE_COMPARISON]: "Measurements cannot be compared without compatible envelopes.",
  [ELI_REFUSAL_CODES.ENVELOPE_STRIPPED]: "Envelope stripping detected. Score cannot be separated from envelope.",
  [ELI_REFUSAL_CODES.PROHIBITED_USE_INVOKED]: "Prohibited use invoked. This use is categorically forbidden.",
  [ELI_REFUSAL_CODES.SCORE_EXTRACTION]: "Score extraction without context is forbidden.",
  [ELI_REFUSAL_CODES.THRESHOLD_REDEFINITION]: "Post hoc threshold redefinition is forbidden.",
  [ELI_REFUSAL_CODES.INCOMPATIBLE_AGGREGATION]: "Aggregation across incompatible envelopes is forbidden.",
  [ELI_REFUSAL_CODES.NARRATIVE_REINTERPRETATION]: "Narrative reinterpretation of scores is forbidden.",
  [ELI_REFUSAL_CODES.BLAME_JUSTIFICATION]: "Scores cannot be used to justify blame or sanctions.",
  [ELI_REFUSAL_CODES.INDIVIDUAL_RANKING]: "Scores cannot be used to rank individuals.",
};

const AXIOM_MAP: Partial<Record<EliRefusalCode, string>> = {
  [ELI_REFUSAL_CODES.OUTCOME_IN_MEASUREMENT]: "M1",
  [ELI_REFUSAL_CODES.UPWARD_AUTHORITY_ATTEMPT]: "M2",
  [ELI_REFUSAL_CODES.NO_ENVELOPE_INSPECTION]: "M3",
  [ELI_REFUSAL_CODES.INCOMPATIBLE_COMPARISON]: "M4",
  [ELI_REFUSAL_CODES.ENVELOPE_STRIPPED]: "M5",
};

export function createEliRefusal(code: EliRefusalCode): EliRefusal {
  return Object.freeze({
    code,
    axiom: AXIOM_MAP[code],
    message: REFUSAL_MESSAGES[code],
    timestamp: new Date().toISOString(),
  });
}

export class EliRefusalError extends Error {
  public readonly refusal: EliRefusal;
  
  constructor(refusal: EliRefusal) {
    super(`ELI Refusal [${refusal.code}]: ${refusal.message}`);
    this.name = "EliRefusalError";
    this.refusal = refusal;
    Object.freeze(this);
  }
}
