# ELI Imaging — System State

**Last Updated:** 2026-01-17

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

## Archive Behavior

**Endpoint:** `POST /api/cases/:id/archive`

**Required Fields:**
- `reasonCode`: DUPLICATE | ENTERED_IN_ERROR | COMPLETED | CANCELLED | OTHER
- `reasonNote`: Required if reasonCode is OTHER

**Records:**
- `archivedAt`: Timestamp
- `archivedBy`: Actor identifier
- `archiveReasonCode`: Reason code
- `archiveReasonNote`: Optional note

**Audit Event:** `CASE_ARCHIVED` event created with metadata

---

## Case Listing

**Endpoint:** `GET /api/cases`

**Query Parameter:** `?status=active|archived|all`

**Default:** `active` (excludes archived)

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

**Threshold Policy:**
- 0-2 met: `unsafe` / advisory only
- 3 met: `high_risk` / permitted
- 4 met: `defensible` / permitted
- 5 met: `regulator_ready` / permitted

---

## Branding

All user-facing labels: **ELI Imaging**

No references to "ELI Expert" in client or server code.
