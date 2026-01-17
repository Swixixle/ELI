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
