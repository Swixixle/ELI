# ELI Imaging — Fix Log

Append-only record of system changes.

---

## Fix #4: Case Archival (Soft Delete)

**Date:** 2026-01-17  
**Commit:** `0650429`

**What Changed:**
- Added archive fields to `cases` table: `archivedAt`, `archivedBy`, `archiveReasonCode`, `archiveReasonNote`
- Created `POST /api/cases/:id/archive` endpoint with 5 reason codes
- Modified `DELETE /api/cases/:id` to return 405 "Use Archive"
- Added `?status=` query param to `GET /api/cases`
- Implemented defense-in-depth guards across 8 storage methods

**Files Touched:**
- `shared/schema.ts` — Added archive fields and types
- `server/storage.ts` — Added `archiveCase()`, guards on 8 mutation methods
- `server/routes.ts` — Archive endpoint, 405 on DELETE, status filter
- `client/src/lib/casesApi.ts` — Archive mutation hook
- `client/src/components/cases/CaseSelector.tsx` — Archive UI, status filter

**Tests Added:**
- None (manual verification)

**Verification:**
1. Create a case
2. Archive it with reason code COMPLETED
3. Verify: DELETE returns 405
4. Verify: PATCH returns 409
5. Verify: Document upload returns 409
6. Verify: Case still readable via GET /api/cases/:id
7. Verify: Case appears with `?status=archived`

---

## Branding Consistency Update

**Date:** 2026-01-17  
**Commit:** `9721b5e`

**What Changed:**
- Updated `client/index.html` meta tags from "ELI Expert" to "ELI Imaging"

**Files Touched:**
- `client/index.html`

**Verification:**
- View page source, confirm og:title and twitter:title say "ELI Imaging"

---

## LSP Error Fix

**Date:** 2026-01-17  
**Commit:** `5e4798b`

**What Changed:**
- Removed unused `partialCount` variable causing type error
- Cast `prereqValues` to `string[]` to fix comparison

**Files Touched:**
- `server/routes.ts` (line 211-213)

**Verification:**
- `npm run dev` starts without LSP errors

---

## Documentation Hardening

**Date:** 2026-01-17  
**Commit:** (pending)

**What Changed:**
- Added scope disclaimer to SYSTEM_STATE.md header
- Added Error Semantics section (405/409/403 meanings)
- Made "Last Updated" mechanically meaningful with update rule

**Files Touched:**
- `docs/SYSTEM_STATE.md`

**Verification:**
- Read SYSTEM_STATE.md, confirm disclaimer and error semantics present

---

## Architecture Specification

**Date:** 2026-01-17  
**Commit:** (pending)

**What Changed:**
- Created docs/eli-imaging-architecture.md with implementation-ready specifications
- Added 4 Mermaid sequence diagrams: Archive, Determination Signing, Printout Issuance, Verification
- Added 3 JSON Schemas: DeterminationReceipt, CasePrintout, ArchiveEvent
- Documented signing field specification and canonicalization rules
- Documented WORM reference pattern

**Files Touched:**
- `docs/eli-imaging-architecture.md` (new)

**Verification:**
- Open docs/eli-imaging-architecture.md
- Confirm Mermaid diagrams render correctly
- Validate JSON schemas against existing code types

---

## Category A Hardening (Pre-Demo)

**Date:** 2026-01-17  
**Commit:** (pending)

**What Changed:**
- A1: Added Scope Integrity Statement at `GET /api` endpoint
- A2: Converted 11 error responses to machine-style codes (no explanatory text)
- A3: Added read-only verification endpoint at `GET /api/printouts/:id/verify`
- A4: Archive state confirmed hard-frozen (no changes needed)

**Error Code Mapping:**
| Old Message | New Code | Status |
|-------------|----------|--------|
| "Case is archived and cannot be modified." | ARCHIVED_RESOURCE_IMMUTABLE | 409 |
| "Cases cannot be deleted..." | DELETE_NOT_ALLOWED | 405 |
| "Case is already archived" | ALREADY_ARCHIVED | 409 |
| "Printouts are immutable..." | PRINTOUT_IMMUTABLE | 403 |

**Files Touched:**
- `server/routes.ts` (11 edits)

**Verification:**
- `curl localhost:5000/api` returns Scope Integrity Statement
- `curl localhost:5000/api/printouts/{id}/verify` returns verification fields
- All 409/403/405 responses return machine codes only

---

## RRS-1 / DISS-1 Compliance Patch

**Date:** 2026-01-17  
**Commit:** (pending)

**What Changed:**

**B) RRS-1 G5 "Where" Completeness:**
- Added `environment`, `service`, `requestId`, `origin` to audit event metadata
- Archive events now include full Who/What/When/Where context
- User-created timeline events also augmented with Where fields

**C) DISS-1 Neutral Codes:**
- Replaced interpretive threshold labels with neutral procedural tiers
- `unsafe` → `P0`, `high_risk` → `P3`, `defensible` → `P4`, `regulator_ready` → `P5`
- API response `currentRiskTier` now returns P0/P3/P4/P5

**D) DISS-1 Anti-Undo:**
- Removed `reasonNote` free-text field entirely
- Removed `OTHER` from valid reason codes
- Archive accepts only: DUPLICATE | ENTERED_IN_ERROR | COMPLETED | CANCELLED
- No editable free-text fields remain

**Files Touched:**
- `server/routes.ts` (archive endpoint, overview endpoint)
- `server/storage.ts` (ArchiveCaseParams, archiveCase)
- `shared/schema.ts` (ARCHIVE_REASON_CODES)
- `client/src/lib/casesApi.ts` (ArchiveCaseParams)
- `client/src/components/cases/CaseSelector.tsx` (archive modal UI)
- `docs/SYSTEM_STATE.md` (updated)

**Evidence Artifacts:**
- G1-E1: `GET /api` returns Scope Integrity Statement
- G4-E1: `DELETE /api/cases/:id` returns `{"error":"DELETE_NOT_ALLOWED","status":405}`
- G4-E2: Archived case mutation returns `{"error":"ARCHIVED_RESOURCE_IMMUTABLE","status":409}`
- G5-E1: Archive event metadata includes environment/service/requestId/origin
- G5-E2: Schema shows Where fields in metadata JSONB

---

## Seal Workflow Implementation

**Date:** 2026-01-17  
**Commit:** (pending)

**What Changed:**

**A) UI Labeling:**
- Button renamed: "Issue New Judgment Printout" → "Seal"
- Modal title: "Seal Artifact"
- Modal body: exact verbatim text per spec
- Buttons: "Seal" (primary), "Cancel" (secondary)
- Removed title input field (no free-text)

**B) API Seal Endpoint:**
- Added `POST /api/cases/:id/seal` - atomic sealing operation
- Response: artifactId, caseId, issuedAt, contentHash, caseStateHash, signatureB64, publicKeyId, sealStatus

**C) Retrieval Endpoints:**
- `GET /api/cases/:id/printouts` returns minimal: artifactId, issuedAt, verificationStatus
- `GET /api/cases/:caseId/printouts/:printoutId` returns: artifactId, caseId, issuedAt, hashes, signature fields, renderedContent
- `GET /api/printouts/:id/verify` unchanged (cryptographic verification only)

**D) Error Semantics:**
- All errors machine-only with stable keys
- Added: CASE_NOT_FOUND, ARTIFACT_NOT_FOUND, NO_DETERMINATION_EXISTS, SEAL_FAILED, FETCH_FAILED

**Files Touched:**
- `server/routes.ts` (seal endpoint, retrieval endpoints)
- `client/src/pages/PrintoutsList.tsx` (Seal button/modal, minimal list fields)
- `client/src/pages/PrintoutView.tsx` (updated interface for new response format)
