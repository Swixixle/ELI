# ELI Imaging — System State

This document is a fact-only snapshot of enforced system behavior.  
It contains no recommendations, priorities, or future intent.

**Last Updated:** 2026-01-19  
Updated automatically after each completed fix.

---

## Scope Integrity Statement (RRS-1 G1)

Available at: `GET /api`

> "ELI asserts only that sufficient system evidence exists to confirm entry into the results environment at a specific time."

---

## Error Semantics

All error responses are machine-only (no explanatory text).

| Code | Error Key | Meaning |
|------|-----------|---------|
| 400 | REASON_CODE_REQUIRED | Missing required field |
| 400 | INVALID_REASON_CODE | Invalid enum value |
| 404 | CASE_NOT_FOUND | Resource does not exist |
| 404 | PRINTOUT_NOT_FOUND | Resource does not exist |
| 405 | DELETE_NOT_ALLOWED | Operation structurally unsupported |
| 409 | ARCHIVED_RESOURCE_IMMUTABLE | Operation blocked by case state |
| 409 | ALREADY_ARCHIVED | Case is already in terminal state |
| 403 | PRINTOUT_IMMUTABLE | Immutability enforcement |
| 500 | ARCHIVE_FAILED | Internal error |
| 500 | VERIFICATION_FAILED | Internal error |

---

## Case Lifecycle

| State | Allowed Transitions | Behavior |
|-------|---------------------|----------|
| `active` | → `archived` | Full read/write |
| `archived` | (terminal) | Read-only |

- Cases cannot be deleted (DELETE returns 405)
- Cases cannot be restored from archived state
- Status changes via `updateCase` are blocked

---

## Mutation Guards (Defense-in-Depth)

All archived case mutations blocked at two layers:

**Route Layer (returns 409):**
- `PATCH /api/cases/:id`
- `POST /api/cases/:id/decision-target`
- `POST /api/cases/:id/decision-time`
- `POST /api/cases/:id/events`
- `POST /api/cases/:id/determine`
- `POST /api/cases/:id/printouts`
- `POST /api/cases/:id/documents`
- `DELETE /api/cases/:caseId/documents/:docId`

**Storage Layer (throws Error):**
- `updateCase()`
- `createCanonDocument()`
- `deleteCanonDocument()`
- `createCaseEvent()`
- `setDecisionTarget()`
- `lockDecisionTarget()`
- `createDetermination()`
- `createCasePrintout()`

---

## Immutability

| Entity | Immutable | Enforcement |
|--------|-----------|-------------|
| `case_printouts` | Yes | No UPDATE/DELETE routes exist |
| `determinations` | Yes | No UPDATE/DELETE routes exist |
| `cases` (archived) | Yes | Guards block all mutations |
| `canon_documents` | No | Can be deleted while case active |

---

## Archive Behavior (DISS-1 Compliant)

**Endpoint:** `POST /api/cases/:id/archive`

**Required Fields:**
- `reasonCode`: DUPLICATE | ENTERED_IN_ERROR | COMPLETED | CANCELLED

**No free-text fields.** `reasonNote` removed per DISS-1 Anti-Undo constraint.

**Records:**
- `archivedAt`: Timestamp
- `archivedBy`: Actor identifier
- `archiveReasonCode`: Reason code

**Audit Event:** `CASE_ARCHIVED` event created with Who/What/When/Where metadata

---

## Audit Event Metadata (RRS-1 G5)

All case mutation events include:

| Field | Description |
|-------|-------------|
| `reasonCode` | What action was taken |
| `environment` | demo / staging / prod |
| `service` | API service name (eli-imaging-api) |
| `requestId` | Trace identifier |
| `origin` | IP or client identifier |

---

## Case Listing

**Endpoint:** `GET /api/cases`

**Query Parameter:** `?status=active|archived|all`

**Default:** `active` (excludes archived)

---

## Verification Endpoint

**Endpoint:** `GET /api/printouts/:id/verify`

**Returns:**
- `id`: Printout identifier
- `contentHash`: SHA-256 of content
- `caseStateHash`: SHA-256 of case state
- `signatureB64`: Ed25519 signature
- `publicKeyId`: Signing key identifier
- `issuedAt`: Timestamp
- `verificationStatus`: SIGNATURE_PRESENT | UNSIGNED

---

## Data Integrity

**Foreign Key Constraints:**
- `canon_documents.caseId` → `cases.id` (NOT NULL)
- `decision_targets.caseId` → `cases.id`
- `case_events.caseId` → `cases.id`
- `determinations.caseId` → `cases.id`
- `case_printouts.caseId` → `cases.id`
- `case_printouts.determinationId` → `determinations.id`

**Hash Verification:**
- Documents: SHA-256 `contentHash`
- Printouts: SHA-256 `contentHash` + `caseStateHash`
- Determinations: SHA-256 `caseStateHash`

**Signatures:**
- Printouts: Ed25519 `signatureB64` with `publicKeyId`
- Determinations: Ed25519 `signatureB64` with `publicKeyId`

---

## Prerequisite Evaluation

**5 Prerequisites (Canon v4.0):**
1. A — Decision Target Defined
2. B — Temporal Verification (B1: timestamp, B2: sequence)
3. C — Independent Verification
4. D — Policy Application Record
5. E — Contextual Constraints

**Procedural Tier (DISS-1 Neutral Codes):**
- P0: 0-2 prerequisites met / advisory only
- P3: 3 prerequisites met / permitted
- P4: 4 prerequisites met / permitted
- P5: 5 prerequisites met / permitted

---

## Constitutional Gate Enforcement

**Gate Function:** `passConstitutionalGate()` in `server/constitutional/gates.ts`

**Endpoints Protected:**
- `POST /api/cases/:id/evaluate`
- `POST /api/cases/:id/determine`

**S1 (Decision Substrate) Requirements:**
- Decision Time Anchor (DTA) must be defined
- At least one artifact/fact evidence must be present

**S2 (Constraint Envelope) Requirements:**
- At least one non-placeholder constraint must be provided
- Placeholder values (`unknown`, `unspecified`, `n/a`, `none`) are inadmissible

**Refusal Behavior:**
- Returns 403 CONSTITUTIONAL_REFUSAL
- No partial evaluation data is leaked
- Includes refusal code, axiom citation, and hint

**Envelope Enforcement (AXIOM M5):**
- All permitted responses include MeasurementEnvelope
- Envelope contains: measurement_id, measurement_type, prohibited_uses, authorized_uses

**Tests:** 88 passing (69 constitutional + 13 gate + 6 HTTP)

---

## Branding

All user-facing labels: **ELI Imaging**

No references to "ELI Expert" in client or server code.
