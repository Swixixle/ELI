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
    x: { label: "Information Completeness"; range: [0, 1] };
    y: { label: "Time Pressure"; range: [0, 1] };
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

export interface SanitizedSummary {
  status: string;
  explanationPlain: string;
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
  if (!input.summary || !input.summary.status) {
    errors.push("Missing sanitized summary");
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

  const terrain: EpistemicTerrainPlot = {
    axes: {
      x: { label: "Information Completeness", range: [0, 1] },
      y: { label: "Time Pressure", range: [0, 1] },
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
