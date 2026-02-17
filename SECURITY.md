# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

**Do not file public issues for security vulnerabilities.**

To report a security issue, please email: **albearpig@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Affected components (schema, audit trail, PHI handling, etc.)

You should receive a response within 48 hours.

## Production Security Requirements

ELI is designed for healthcare environments where security and compliance are mandatory. Production deployments MUST enforce:

### Fail-Fast Environment Validation

On startup, the following MUST exist or the system MUST exit immediately:

- **API_KEY**: Scoped by role (viewer/analyst/admin) with cryptographic signing
- **DATABASE_URL**: Immutable audit persistence with write-ahead logging
- **SIGNING_KEY**: Cryptographic key for audit chain integrity (minimum 2048-bit RSA or equivalent)
- **TLS**: Required for all network communication (minimum TLS 1.2)

Missing cryptographic keys cause immediate startup failure with structured error logging.

### PHI Boundary Enforcement

Production systems MUST:
- Never store raw patient identifiers (names, MRNs, SSNs, DOBs)
- Only store SHA-256 hashes of patient context for correlation
- Validate redaction before persistence using PHI pattern detection
- Block save operations if PHI patterns are detected
- Log sanitization failures to security audit log

### Actor-Bound Audit Trail

Every action MUST be attributed to:
- `actor_id`: Authenticated user identifier (non-null in production)
- `actor_role`: viewer | analyst | admin
- `action`: Specific operation type
- `timestamp`: ISO-8601 datetime with timezone

Anonymous or system-level actions are prohibited in production.

### RBAC & Permission Enforcement

API keys MUST be scoped by role:
- **viewer**: Read-only access to audit trails and compliance reports
- **analyst**: Read + generate compliance summaries
- **admin**: Full access including forensic exports and configuration

JWT or session tokens MUST include role claims validated at every endpoint.

### Immutable Audit Export

Forensic export packages MUST include:
- Complete audit chain JSON
- SHA-256 hash manifest of all files
- Cryptographic signature file
- Chain head hash for integrity verification
- Readable PDF summary for legal review
- Verification script for independent validation

### Deterministic Mode Default

Production systems MUST default to:
- Deterministic extraction mode (rule-based, non-LLM)
- LLM mode requires explicit opt-in
- LLM outputs labeled as "Exploratory Mode"
- LLM outputs excluded from compliance scoring
- Visual badges in UI distinguishing modes

### Compliance Logging

All security events MUST be logged with:
- Actor ID and role
- Action type
- Timestamp
- Success/failure status
- Patient context hash (if applicable)
- Model version (if AI-involved)

Logs MUST be immutable and stored in write-ahead format.

## Scope

ELI is a healthcare compliance framework for AI-assisted clinical documentation. It is NOT:
- A general-purpose AI governance platform
- A clinical decision support system
- A medical records system
- A PHI storage system

ELI provides audit trail schemas and forensic export contracts for legally defensible attestation.

## HIPAA Compliance

While ELI is designed to support HIPAA compliance through PHI-free audit trails, implementers are responsible for:
- Proper PHI sanitization in their specific environments
- Business Associate Agreements (BAAs) with AI model providers
- Comprehensive security risk assessments
- Ongoing compliance monitoring

ELI provides the framework; implementers must ensure proper usage.
