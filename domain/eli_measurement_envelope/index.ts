/**
 * ELI Measurement Envelope Module
 * 
 * Constitutional Reference: eli_measurement_envelope.md v1.0
 * 
 * Exports for measurement envelope functionality.
 */

export {
  type MeasurementType,
  type AuthorizedUse,
  type ProhibitedUse,
  type ExcludedInformationClass,
  type EpistemicVolumeDescriptor,
  type MeasurementEnvelope,
  type EnvelopedMeasurement,
  isEnvelopeComplete,
  ELI_PROTOCOL_VERSION,
  MANDATORY_PROHIBITED_USES,
  MANDATORY_EXCLUSIONS,
} from "./envelope_types";

export {
  ELI_REFUSAL_CODES,
  type EliRefusalCode,
  type EliRefusal,
  createEliRefusal,
  EliRefusalError,
} from "./refusal_codes";

export {
  type EnvelopeValidationResult,
  validateEnvelopePresent,
  checkOutcomeBlindness,
  checkProhibitedUse,
  checkAuthorizedUse,
  checkEnvelopeCompatibility,
  detectEnvelopeStripping,
  verifyEnvelopeIntegrity,
  requireEnvelope,
  accessMeasurement,
  compareMeasurements,
} from "./envelope_gate";
