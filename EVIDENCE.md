# ELI Evidence Contract — v0.2 (Healthcare Compliance Edition)

ELI does not store raw evidence or PHI. ELI stores cryptographic pointers to evidence and the minimum verification metadata required for legal defensibility.

## Evidence Object (Healthcare-Compliant)

An evidence item MUST include:

- **kind**: receipt | file | url | transcript | audit_entry | other
- **locator**: Where to find it (path, URL, or opaque reference) - must not contain PHI
- **hash**:
  - alg: sha256 (v0.1+ default)
  - value: hex digest (64 characters)
- **actor_attribution** (REQUIRED for healthcare):
  - actor_id: authenticated user identifier
  - actor_role: viewer | analyst | admin
  - action: operation performed
  - timestamp: ISO-8601 datetime
- **patient_context_hash** (REQUIRED if patient-related):
  - alg: sha256
  - value: hex digest of patient context (not PHI)
- **signature** (optional but strongly recommended for compliance):
  - scheme: openssh-ssh-keygen-y
  - namespace: halo-receipt (or other explicit namespace)
  - signer_id: string (matches allowed_signers identity)
  - sig_locator: where the signature file is stored
  - allowed_signers_locator: where the allowed_signers file is stored
- **model_version** (REQUIRED if AI-generated):
  - identifier: specific model version string
  - mode: deterministic | exploratory
- **confidence_tier**: VERIFIED | INFERRED | UNKNOWN
- **captured_at**: ISO-8601 timestamp (REQUIRED for audit trail)

## PHI Boundary Rules

Evidence items MUST NOT include:
- Patient names, MRNs, SSNs, DOB, or any HIPAA PHI identifiers
- Raw clinical content with identifiable information
- Unredacted transcripts or documentation

Evidence items MUST include:
- PHI sanitization confirmation flag
- Redacted field list
- Patient context hash for correlation

## Verification Expectations (Healthcare-Grade)

- **Hash verification** is REQUIRED when a hash is present
- **Signature verification** is REQUIRED when signature fields are present
- **Actor authentication** is REQUIRED for all audit entries
- **PHI sanitization** must be validated before persistence
- If verification cannot be performed, the evidence item must be marked as "unverified" and any dependent claims must use UNKNOWN confidence tier

## Forensic Export Requirements

Evidence chains must support:
- Immutable audit trail reconstruction
- Actor-bound traceability (who accessed what, when)
- Cryptographic chain integrity verification
- Legal-grade PDF summary generation
- SHA-256 manifest for all included files

## Mode Separation for Compliance

- **Deterministic Mode**: Rule-based extraction, included in compliance reports
- **Exploratory Mode**: LLM-assisted, excluded from compliance scoring, requires explicit opt-in label

## Non-Goals

- ELI does not define clinical truth or medical accuracy
- ELI does not adjudicate clinical credibility beyond cryptographic verification
- ELI does not require evidence content to be public
- ELI does not store PHI - only cryptographic references to patient context

**ELI exists to make audit trails legally defensible, not to replace clinical judgment.**
