export interface MeasurementEnvelopeInput {
  measurement_id: string;
  measurement_type: string;
  ruleset_version: string;
  decision_time_anchor: string;
  locked_strata_referenced: readonly string[];
  admissible_record_hash: string;
  excluded_information_classes: readonly string[];
  dominant_constraints: readonly string[];
  epistemic_volume_descriptor?: {
    constraintDensity: string;
    dominantLimitingAxes: readonly string[];
    decisionSpaceCompression: number;
    informationCompleteness?: number;
    timePressure?: number;
  };
  authorized_uses: readonly string[];
  prohibited_uses: readonly string[];
}

export interface EpistemicTerrainSheet {
  header: EnvelopeHeader;
  terrain: EpistemicTerrainPlot;
  exclusions: RefusalExclusionLedger;
}

export interface EnvelopeHeader {
  measurementId: string;
  decisionTimeAnchor: {
    timestamp: string;
    source: "envelope";
  };
  rulesetVersion: string;
  lockedStrataReferenced: readonly string[];
  admissibleRecordHash: string;
  authorizedUses: readonly string[];
  prohibitedUses: readonly string[];
}

export interface EpistemicTerrainPlot {
  axes: {
    x: { label: "Information Completeness"; range: [0, 1]; value: number };
    y: { label: "Time Pressure"; range: [0, 1]; value: number };
  };
  constraintDensity: number;
  dominantLimitingAxes: readonly string[];
  decisionSpaceCompression: number;
}

export interface RefusalExclusionLedger {
  entries: RefusalEntry[];
}

export interface RefusalEntry {
  excludedClass: string;
  governingAxiom: string;
  refusalCode: string;
  noAuthorizedSubstitution: true;
}

export type SanitizedSummaryReason =
  | "prerequisites_satisfied"
  | "prerequisites_partial"
  | "prerequisites_insufficient"
  | "gate_refused"
  | "envelope_invalid";

export interface SanitizedSummary {
  status: string;
  reason: SanitizedSummaryReason;
}

export interface TerrainSheetInput {
  envelope: MeasurementEnvelopeInput;
  value: number;
  summary: SanitizedSummary;
}

export interface TerrainSheetValidation {
  valid: boolean;
  errors: string[];
}

const METRIC_PATTERNS = [
  /\d+\s*(of|\/)\s*\d+/i,
  /\d+(\.\d+)?%/,
  /\d+(\.\d+)?\s*percent/i,
  /score[:\s]+\d/i,
  /\d+\s*points?/i,
  /\d+\s*conditions?/i,
  /\d+\s*prerequisites?/i,
];

export function validateSanitizedSummary(summary: SanitizedSummary): { valid: boolean; error?: string } {
  if (!summary || !summary.status || !summary.reason) {
    return { valid: false, error: "Missing required summary fields (status, reason)" };
  }

  const validReasons: SanitizedSummaryReason[] = [
    "prerequisites_satisfied",
    "prerequisites_partial",
    "prerequisites_insufficient",
    "gate_refused",
    "envelope_invalid",
  ];

  if (!validReasons.includes(summary.reason)) {
    return { valid: false, error: `Invalid reason: ${summary.reason}. Must be one of: ${validReasons.join(", ")}` };
  }

  for (const pattern of METRIC_PATTERNS) {
    if (pattern.test(summary.status)) {
      return { valid: false, error: `METRIC_LEAKAGE: status contains score proxy matching pattern ${pattern}` };
    }
  }

  return { valid: true };
}

export function validateTerrainSheetInput(input: TerrainSheetInput): TerrainSheetValidation {
  const errors: string[] = [];

  if (!input.envelope) {
    errors.push("CONSTITUTIONAL_VIOLATION: Missing envelope (M5)");
    return { valid: false, errors };
  }

  if (!input.envelope.measurement_id) {
    errors.push("Missing measurement_id in envelope");
  }
  if (!input.envelope.decision_time_anchor) {
    errors.push("Missing decision_time_anchor in envelope");
  }
  if (!input.envelope.ruleset_version) {
    errors.push("Missing ruleset_version in envelope");
  }
  if (!input.envelope.locked_strata_referenced || input.envelope.locked_strata_referenced.length === 0) {
    errors.push("CONSTITUTIONAL_VIOLATION: No locked strata referenced (S5)");
  }
  if (!input.envelope.admissible_record_hash) {
    errors.push("Missing admissible_record_hash in envelope");
  }
  if (!input.envelope.prohibited_uses || input.envelope.prohibited_uses.length === 0) {
    errors.push("CONSTITUTIONAL_VIOLATION: Prohibited uses must not be empty (M2)");
  }
  if (typeof input.value !== "number" || input.value < 0 || input.value > 1) {
    errors.push("Measurement value must be between 0 and 1");
  }

  const summaryValidation = validateSanitizedSummary(input.summary);
  if (!summaryValidation.valid) {
    errors.push(summaryValidation.error!);
  }

  return { valid: errors.length === 0, errors };
}

export function createEpistemicTerrainSheet(input: TerrainSheetInput): EpistemicTerrainSheet | null {
  const validation = validateTerrainSheetInput(input);
  if (!validation.valid) {
    return null;
  }

  const { envelope, value } = input;

  const header: EnvelopeHeader = {
    measurementId: envelope.measurement_id,
    decisionTimeAnchor: {
      timestamp: envelope.decision_time_anchor,
      source: "envelope",
    },
    rulesetVersion: envelope.ruleset_version,
    lockedStrataReferenced: envelope.locked_strata_referenced,
    admissibleRecordHash: envelope.admissible_record_hash,
    authorizedUses: envelope.authorized_uses,
    prohibitedUses: envelope.prohibited_uses,
  };

  const xValue = deriveInformationCompleteness(envelope);
  const yValue = deriveTimePressure(envelope);

  const terrain: EpistemicTerrainPlot = {
    axes: {
      x: { label: "Information Completeness", range: [0, 1], value: xValue },
      y: { label: "Time Pressure", range: [0, 1], value: yValue },
    },
    constraintDensity: parseConstraintDensity(envelope.epistemic_volume_descriptor?.constraintDensity),
    dominantLimitingAxes: envelope.epistemic_volume_descriptor?.dominantLimitingAxes ?? envelope.dominant_constraints ?? [],
    decisionSpaceCompression: value,
  };

  const exclusions: RefusalExclusionLedger = {
    entries: envelope.prohibited_uses.map((use) => ({
      excludedClass: use,
      governingAxiom: getGoverningAxiom(use),
      refusalCode: `M2_PROHIBITED_USE_${use.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`,
      noAuthorizedSubstitution: true as const,
    })),
  };

  return { header, terrain, exclusions };
}

function deriveInformationCompleteness(envelope: MeasurementEnvelopeInput): number {
  if (envelope.epistemic_volume_descriptor?.informationCompleteness !== undefined) {
    return clamp(envelope.epistemic_volume_descriptor.informationCompleteness, 0, 1);
  }

  const excludedCount = envelope.excluded_information_classes?.length ?? 0;
  if (excludedCount === 0) return 0.9;
  if (excludedCount <= 2) return 0.7;
  if (excludedCount <= 4) return 0.5;
  return 0.3;
}

function deriveTimePressure(envelope: MeasurementEnvelopeInput): number {
  if (envelope.epistemic_volume_descriptor?.timePressure !== undefined) {
    return clamp(envelope.epistemic_volume_descriptor.timePressure, 0, 1);
  }

  const dominantAxes = envelope.epistemic_volume_descriptor?.dominantLimitingAxes ?? envelope.dominant_constraints ?? [];
  const hasTimePressure = dominantAxes.some((axis) =>
    axis.toLowerCase().includes("time") || axis.toLowerCase().includes("pressure") || axis.toLowerCase().includes("urgency")
  );

  if (hasTimePressure) return 0.8;

  const density = envelope.epistemic_volume_descriptor?.constraintDensity;
  if (density === "high") return 0.7;
  if (density === "medium") return 0.5;
  return 0.3;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseConstraintDensity(density: string | undefined): number {
  switch (density) {
    case "high": return 0.8;
    case "medium": return 0.5;
    case "low": return 0.2;
    default: return 0.5;
  }
}

function getGoverningAxiom(prohibitedUse: string): string {
  const axiomMap: Record<string, string> = {
    "justify_blame": "M2",
    "rank_individuals": "M2",
    "automate_discipline": "M2",
    "override_human_judgment": "M2",
    "predict_outcomes": "M1",
    "substitute_for_investigation": "M4",
  };
  return axiomMap[prohibitedUse] ?? "M2";
}
