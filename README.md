# ELI — Continuous Attestation for AI-Assisted Clinical Documentation

**ELI provides legally defensible, immutable audit trails for AI-assisted clinical documentation in healthcare settings.**

## What ELI Does

ELI is a compliance framework that enables hospitals to:

- **Continuously attest** that AI-generated or AI-assisted clinical documentation meets regulatory standards
- **Create forensic-grade audit trails** with actor attribution, timestamps, and cryptographic verification
- **Enforce PHI boundaries** by design, storing only hashed references—never raw patient identifiers
- **Separate deterministic extraction** from exploratory AI inference for compliance reporting
- **Generate legal-grade export packages** suitable for regulatory audits and legal defense

## Primary Use Case

**Hospital Risk & Compliance Officers** need to prove that AI-assisted clinical documentation systems:
1. Never store Protected Health Information (PHI) in violation of HIPAA
2. Maintain actor-bound audit trails showing who accessed what, when
3. Can produce immutable forensic evidence for regulatory review
4. Distinguish between verified facts and AI-inferred content

ELI provides the schema, validation, and export framework to make this defensible.

## Why ELI Exists

Healthcare AI tools generate revenue but create legal risk. Compliance officers need to demonstrate:

- **Traceability**: Every action is bound to an authenticated user
- **Defensibility**: Audit chains are cryptographically verifiable and immutable
- **Safety**: PHI is never stored; only hashed context references
- **Clarity**: Deterministic extractions are clearly separated from exploratory AI outputs

Without this infrastructure, healthcare AI implementations cannot pass enterprise procurement.

## Quick Start

### Validate the Schema

```bash
node validate-schema.js
```

This validates that the sample ELI output conforms to the compliance schema contract.

### Run in Replit

This repository is configured to run in Replit:
1. Open this repository in Replit
2. Click "Run" to validate the ELI schema and compliance samples

## Repository Structure

- `contracts/` - JSON Schema definitions for compliance outputs
- `examples/` - Sample audit trail outputs for healthcare scenarios
- `references/` - Integration documentation (HALO-RECEIPTS, RBAC patterns)
- `SECURITY.md` - Production security requirements and environment enforcement

## Key Principles

1. **Narrow Scope**: ELI is purpose-built for clinical documentation attestation—not general AI governance
2. **Actor Attribution**: Every audit event is bound to an authenticated user with role enforcement
3. **PHI-Free**: Only cryptographic hashes of patient context, never identifiable data
4. **Deterministic First**: LLM-based inference is opt-in and excluded from compliance scoring
5. **Forensic Export**: One-click generation of legally defensible audit packages

## Production Readiness

ELI enforces fail-fast validation for production deployments:

- `API_KEY` must exist (scoped by role: viewer/analyst/admin)
- `DATABASE_URL` must exist (for immutable audit persistence)
- `SIGNING_KEY` must exist (for cryptographic chain integrity)
- TLS required for all network communication

Missing cryptographic keys cause immediate startup failure.

## Status

ELI is under active development to meet enterprise healthcare compliance requirements. This framework is designed for regulated environments where legal defensibility is non-negotiable.
