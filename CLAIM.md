# ELI Claim — v0.2 (Healthcare Compliance Edition)

A claim is a legally defensible assertion about AI-assisted clinical documentation, supported by cryptographically verifiable audit trails.

## Required Fields for Healthcare Compliance

- **Statement**: Human-readable assertion about the clinical documentation
- **Evidence**: Links to signed artifacts (receipts, content hashes) - never raw PHI
- **Confidence Tier**: VERIFIED (cryptographically provable) | INFERRED (structurally derived) | UNKNOWN (insufficient evidence)
- **Actor Attribution**: User ID and role who generated or reviewed the claim
- **Patient Context Hash**: SHA-256 hash of patient context (not PHI)
- **Model Version**: Specific version of AI model used (if any)
- **Timestamp**: ISO-8601 timestamp for audit chain integrity
- **Mode**: deterministic | exploratory (for compliance reporting)
- **Scope**: Explicit limits of the claim's validity

## Actor-Bound Audit Trail

Every claim must include:
- `actor_id`: Authenticated user identifier
- `actor_role`: viewer | analyst | admin
- `action`: Type of operation performed
- `timestamp`: ISO-8601 datetime

This enables forensic reconstruction of who did what, when.

## PHI Boundary Enforcement

Claims must NEVER include:
- Patient names
- Medical record numbers
- Social security numbers
- Dates of birth
- Any HIPAA-defined PHI identifiers

Instead, use:
- `patient_context_hash`: SHA-256 hash for correlation without identification
- Redacted field indicators
- PHI sanitization confirmation flags

## Confidence Tiers (Legally Defensible)

- **VERIFIED**: Cryptographically proven with signature chain validation
- **INFERRED**: Derived from structured data using deterministic rules
- **UNKNOWN**: Insufficient evidence; requires expert review

LLM-based outputs default to UNKNOWN unless validated by deterministic methods.

## Compliance Separation

- **Deterministic Mode**: Safe for compliance reporting, uses rule-based extraction
- **Exploratory Mode**: LLM-assisted, excluded from compliance metrics, requires explicit opt-in

## Non-Goals

- Claims do not self-verify beyond their cryptographic evidence
- Claims are not medical diagnoses or clinical recommendations
- Claims do not imply truth beyond their verifiable evidence and stated confidence tier

**ELI exists to make AI-assisted clinical documentation legally defensible.**
