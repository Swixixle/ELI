# ELI Imaging — Fix Log

Append-only record of system changes.

---

## RATIFICATION: Constitutional Gate Enforcement v1.0

**Date:** 2026-01-19  
**Status:** RATIFIED

**Ratification Statement:**

Constitutional Gate Enforcement v1.0 is ratified. The `/api/cases/:id/evaluate` route fails closed on gate refusal, emits no partial evaluation payload on refusal, and enforces Measurement Envelope M5 such that no ELI measurement value is returned without its envelope and no raw score fields are present outside `measurement`. These guarantees are evidenced by route-level serialization enforcement and deterministic HTTP integration tests covering refusal non-leakage and permitted-path envelope presence.

**Artifacts (Ratification Basis):**

1. **Route Serialization** (`server/routes.ts:565-616`)
   - Gate refusal returns before `evaluateCanonConditions()` is called
   - `createEnvelopedMeasurement()` invoked before response serialization
   - Raw score fields (`conditionsMet`, `conditionsTotal`) stripped from response
   - Only `measurement.value` contains numeric score (inside envelope)

2. **HTTP Refusal Non-Leak Test** (`domain/tests/http_gate_enforcement.spec.ts:70-92`)
   - Asserts 10 fields are undefined on refusal: `checklist`, `summary`, `score`, `eli`, `procedural_status`, `prerequisitesMet`, `conditionsMet`, `measurement`, `canProceed`, `gapsEquation`

3. **HTTP Positive-Path Envelope Test** (`domain/tests/http_gate_enforcement.spec.ts:234-269`)
   - Deterministic: Hard assertion `expect(res.status).toBe(200)`
   - Asserts `measurement.value` exists (number)
   - Asserts `measurement.envelope` exists with required fields
   - Asserts no raw score outside measurement: `conditionsMet`, `conditionsTotal`, `score`, `eli` all undefined

---

## Fix #5: Constitutional S2 Constraint Enforcement

**Date:** 2026-01-19

**What Changed:**
- S2 semantic correction: DTA moved to S1 metadata; S2 now contains constraint envelope fields
- Route-layer bypass closed: Constraints pass through from client; undefined triggers S2 refusal
- Placeholder rejection: `isPlaceholderValue()` function added; "unknown", "unspecified", "n/a" values are inadmissible for S2 locking
- Envelope enforcement (AXIOM M5): /evaluate returns measurement with full envelope via `createEnvelopedMeasurement()`
- Axiom citation correction: A0 for default inadmissibility (not A1)
- Response sanitization: Raw score fields stripped from response; only `measurement.value` contains numeric value

**Files Touched:**
- `server/constitutional/gates.ts` — Added `isPlaceholderValue()`, updated `toConstraintEvidence()` to reject placeholders
- `server/routes.ts` — Removed constraint defaulting; added response sanitization to strip raw scores

**Tests Added:**
- 2 placeholder rejection tests in `domain/tests/gate_enforcement.spec.ts`
- 6 HTTP integration tests in `domain/tests/http_gate_enforcement.spec.ts`

**Verification:**
- 88 tests passing
- S2 cannot lock with placeholder "unknown" values
- Missing constraints trigger S2 refusal at HTTP boundary
- Envelopes present on all permitted responses
- No raw score exists outside measurement

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

---

## Blank Evaluate Response Fix

**Date:** 2026-01-17  
**Commit:** `71fb3fb`

**What Changed:**
- Fixed `handleSend` and `handleIntentClick` in Home.tsx
- Non-2xx responses now show "REQUEST_FAILED" machine-only key
- Empty/undefined content now shows "RESPONSE_EMPTY" machine-only key
- Users never see blank response bubbles

**Files Touched:**
- `client/src/pages/Home.tsx`

**Verification:**
1. Send an Evaluate query when API returns error
2. Verify machine-only error key is displayed, not blank

---

## Decision Time Dead-End Elimination

**Date:** 2026-01-17  
**Commit:** `71fb3fb`

**What Changed:**
- Added inline Decision Time selector in CaseOverview Next Step panel
- New `handleSetDecisionTime` in Home.tsx persists to backend via `PATCH /api/cases/:id`
- Invalidates overview query to refetch from server after change
- Added useEffect to hydrate `decisionTime` from `activeCase.decisionTime` on load
- Both header popover and inline selector use same handler
- Removed unused `useUpdateCase` import

**Files Touched:**
- `client/src/pages/Home.tsx`
- `client/src/components/cases/CaseOverview.tsx`

**Verification:**
1. Create case and see "Set the decision time" next step
2. Click "Set Decision Time" button in Next Step panel
3. Select a date in the inline calendar popover
4. Verify case overview updates and Next Step advances
5. Reload page and verify decision time persisted

---

## Decision Time Persistence + Modes (Spec Compliance)

**Date:** 2026-01-17  
**Commit:** `7b6abc3`

**What Changed:**

**A) Decision Time Control:**
- Added `decisionTimeMode` state: "live" | "fixed"
- Added `decisionTimeError` and `decisionTimeSaving` states for UX feedback
- Optimistic update with rollback on failure (no silent reversion)
- Error displayed inline in popover when commit fails
- Mode switcher: explicit Live (Now) vs Fixed Date buttons

**B) Home Page Redesign:**
- Removed amber warning box ("No Case Loaded")
- Replaced with neutral onboarding: "Start a Case" + "Upload materials or open an existing case"
- Consolidated 3 tiles into: Primary "Open Case" button + Secondary "Upload New Documents" + Tertiary link "Or try a sample case"
- Moved explanatory text to collapsible `<details>` element ("How ELI Imaging works")

**Files Touched:**
- `client/src/pages/Home.tsx` (state, handlers, UI)
- `server/routes.ts` (PATCH endpoint date conversion)

**Acceptance Criteria Met:**
- ✓ Selecting date persists after closing picker, tab navigation, page refresh
- ✓ "Decision time not anchored" disappears when set to FIXED
- ✓ Commit failure shows visible error, UI does not pretend success
- ✓ No false choice tiles on home page
- ✓ Center of page contains actionable primary CTA
- ✓ No warning/error styling on arrival
- ✓ Explanatory content is secondary (collapsible)
