# ELI Imaging — System Review + Change Audit
## January 2026

---

## 0) Snapshot & Change Audit

### Repo Snapshot

| Component | Technology |
|-----------|------------|
| **Framework** | React 18 + Express (TypeScript) |
| **Frontend Routing** | Wouter |
| **State Management** | TanStack React Query (server state), useState (local) |
| **UI Components** | shadcn/ui + Radix primitives + Tailwind CSS v4 |
| **Database** | PostgreSQL (Neon-backed) via Drizzle ORM |
| **Runtime** | Node.js 20, tsx for development |
| **Build** | Vite (client), esbuild (server) |
| **Hosting** | Replit with workflow-based process management |

**Key Directories:**
- `client/src/pages/` - Route pages (Home, CanonLibrary, About, PrintoutsList, PrintoutView, ValueImaging)
- `client/src/components/` - UI components (chat, cases, layout, shared, ui)
- `server/` - Express backend (routes.ts, storage.ts, crypto.ts, canonEvaluator.ts)
- `server/eli/` - ELI pipeline (interpreter, governor, explainer)
- `shared/schema.ts` - Drizzle schema + Zod validators

**Runtime Entrypoints:**
- `server/index.ts` - Main server entry
- `npm run dev` - Development workflow

### Change Audit (Recent Commits)

| Commit | Area | Description |
|--------|------|-------------|
| `9721b5e` | Branding | Updated meta tags to "ELI Imaging" |
| `0650429` | Cases | Case archival system with defense-in-depth guards |
| `737bd06` | Branding | Corrected "ELI Expert" → "ELI Imaging" naming |
| `6619e39` | LLM | Added fallback handling for permission-related questions |
| `b44a3a6` | LLM | Fixed incorrect routing of canonical readiness questions |
| `781eac3` | UI | Restructured navigation to align with case hierarchy |
| `ce3939e` | Branding | Updated system identity and documentation |
| `e92cfea` | Canon | Added procedural imaging model canon (§0.3, §0.4) |

**Breaking Changes Audit:**
- ✅ Case-binding enforced: All mutations require valid caseId
- ✅ Archive guards protect all mutation paths (route + storage layer)
- ✅ DELETE /api/cases/:id returns 405 (soft delete only)
- ⚠️ `partialCount` variable removed (was unused, caused LSP error)

**Tech Debt Identified:**
1. `Home.tsx` is 1350 lines — should be decomposed
2. Duplicate readiness computation in `Home.tsx` (frontend) vs `canonEvaluator.ts` (backend)
3. Legacy endpoints `/api/canon` still exist (marked deprecated but not removed)

---

## 1) Current-State Architecture Map

### Frontend Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Home | Main case builder with chat interface |
| `/canon` | CanonLibrary | Case-scoped document management |
| `/canon/document/:documentId` | DocumentViewer | View uploaded document |
| `/about` | About | System explanation |
| `/cases/:caseId/printouts` | PrintoutsList | List/issue judgment records |
| `/cases/:caseId/printouts/:printoutId` | PrintoutView | View immutable printout |
| `/value-imaging` | ValueImaging | CFO value model (static explainer) |

### Backend Endpoints

**Case Management:**
- `GET /api/cases` - List cases (filter: `?status=active|archived|all`)
- `POST /api/cases` - Create case
- `GET /api/cases/:id` - Get case
- `PATCH /api/cases/:id` - Update case (rejects archived)
- `DELETE /api/cases/:id` - Returns 405 (use Archive)
- `POST /api/cases/:id/archive` - Archive case with reason

**Case Context:**
- `GET /api/cases/:id/overview` - Derived read-only snapshot
- `POST /api/cases/:id/decision-target` - Set decision target
- `GET /api/cases/:id/decision-target` - Get active target
- `POST /api/cases/:id/decision-time` - Set decision time
- `GET /api/cases/:id/events` - Get timeline events
- `POST /api/cases/:id/events` - Create timeline event

**Evaluation & Determination:**
- `POST /api/cases/:id/evaluate` - Evaluate prerequisites (no side effects)
- `POST /api/cases/:id/determine` - Create signed determination
- `GET /api/cases/:id/receipt/latest` - Get latest receipt

**Printouts (Immutable):**
- `POST /api/cases/:id/printouts` - Issue new printout
- `GET /api/cases/:id/printouts` - List printouts
- `GET /api/cases/:caseId/printouts/:printoutId` - View printout

**Documents:**
- `GET /api/cases/:id/documents` - List case documents
- `POST /api/cases/:id/documents` - Upload document
- `DELETE /api/cases/:caseId/documents/:docId` - Delete document

**ELI Pipeline:**
- `POST /api/intake` - Interpreter stage
- `POST /api/govern` - Governor stage
- `POST /api/explain` - Explainer stage
- `POST /api/eli/query` - Full pipeline

**LLM Chat:**
- `POST /api/chat` - Case-context aware chat

### Database Schema

| Table | Key Fields | FK Constraints |
|-------|------------|----------------|
| `cases` | id, name, decisionTarget, decisionTime, phase, status, archivedAt | — |
| `canon_documents` | id, caseId, name, contentHash | → cases.id |
| `canon_chunks` | id, sourceFile, content | — (System Canon) |
| `decision_targets` | id, caseId, text, isActive, lockedAt | → cases.id |
| `case_events` | id, caseId, eventType, eventTime | → cases.id |
| `determinations` | id, caseId, status, receiptJson, caseStateHash | → cases.id |
| `case_printouts` | id, caseId, determinationId, renderedContent | → cases.id, → determinations.id |

### LLM Pipeline

```
User Message
    ↓
[Interpreter] → Extract intent, evidence, unknowns
    ↓
[Governor] → Evaluate admissibility against [CANON_REF]
    ↓
[Explainer] → Generate response with citations
    ↓
Response (with citations, proofs, refusal flags)
```

**Citation Plumbing:** `[CANON_REF]` references to canon chunks by ID
**Safety Flags:** `parrot_box`, `temporal_boundary`, `category_error`, `withheld_parameter`

### Auth/Session
- No authentication currently (demo mode)
- Session state: React state in `Home.tsx` (selectedCase, messages)

### File Upload + Chunking
- Client computes SHA-256 hash before upload
- Text files stored in `content` field
- Binary files get placeholder text with verified hash
- Duplicate detection by hash or name+size

---

## 2) What's Broken / Confusing

| Severity | Issue | Repro Steps |
|----------|-------|-------------|
| **High** | Case context stored only in React state — resets on page refresh | 1. Select a case 2. Refresh page 3. Case selection lost |
| **High** | Decision target flow: PATCH vs dedicated endpoint | Frontend uses PATCH `/api/cases/:id`, but dedicated `/api/cases/:id/decision-target` exists — inconsistent |
| **Medium** | "Case Canon" navigation not clearly nested under active case | 1. Go to /canon 2. No case selected 3. Confusing empty state |
| **Medium** | Chat responses may not always bind to case context | 1. Ask "Are we allowed to decide yet?" without case 2. May get generic response instead of CONTEXT REQUIRED |
| **Low** | Naming inconsistency fixed | All user-facing labels now say "ELI Imaging" ✅ |
| **Low** | Value Imaging page is static explainer only | No dynamic calculation — just educational content |

---

## 3) Missing-Field Audit

| Field | UI Location | DB Location | Enforcement |
|-------|-------------|-------------|-------------|
| `caseId` binding | CaseSelector in Home | FK on all tables | ✅ Backend validates |
| `decisionTarget` | Decision Target dialog | cases.decision_target + decision_targets.text | ✅ Both |
| `decisionTime` | Calendar popover in Home | cases.decision_time | ✅ Backend |
| Prerequisites state | DecisionReadiness panel | Computed from checklist | ✅ Backend evaluator |
| Evidence type classification | Document upload | canon_documents.type | ⚠️ Inferred from extension only |
| Provenance/citations | Citation badges | [CANON_REF] in responses | ✅ LLM pipeline |
| Case status | CaseSelector badge | cases.status | ✅ Both |
| Printout immutability | 403 on mutation endpoints | No UPDATE/DELETE routes | ✅ Route-level |

**Gaps:**
- Evidence type classification is extension-based only — no semantic classification
- No explicit version tracking on cases (only documents)

---

## 4) Data Model Sanity & Governance Constraints

### FK Constraints
- ✅ `canon_documents.caseId` → `cases.id` (NOT NULL)
- ✅ `decision_targets.caseId` → `cases.id`
- ✅ `case_events.caseId` → `cases.id`
- ✅ `determinations.caseId` → `cases.id`
- ✅ `case_printouts.caseId` → `cases.id`
- ✅ `case_printouts.determinationId` → `determinations.id`

### Immutability
- ✅ Printouts have no UPDATE/DELETE endpoints
- ✅ DELETE returns 403 "Immutable record"
- ✅ Printouts carry `contentHash` and `signatureB64`

### Archive vs Delete
- ✅ Cases use soft delete (archive) only
- ✅ DELETE /api/cases/:id returns 405
- ✅ Archive stores reason code, timestamp, archivedBy
- ✅ All mutations blocked on archived cases (defense-in-depth)

### Indexes (Recommended)
- `cases(status)` — for filtered listing
- `canon_documents(caseId, uploadedAt)` — for case document queries
- `case_events(caseId, eventTime)` — for timeline queries
- `determinations(caseId, createdAt)` — for latest determination lookup

### Migration Integrity
- Drizzle ORM with `npm run db:push`
- No destructive migrations detected

---

## 5) LLM Governance Wiring

### Required Case Context in LLM Calls

The `/api/chat` endpoint accepts:
```typescript
caseContext: {
  caseId: number;
  caseName: string;
  decisionTarget: string | null;
  decisionTime: string | null;
  prerequisitesMet: number;
  reviewPermission: "advisory_only" | "permitted" | "strong" | "regulator_ready";
}
```

**Current Behavior:**
- If `caseContext` is undefined, the LLM can still respond
- ⚠️ **Gap:** No structured `CONTEXT REQUIRED` response when case context missing

### Refusal Flag Rendering
- ✅ `ipSafetyFlags` array rendered in `MessageBubble`
- ✅ `parrot_box`, `temporal_boundary`, `category_error` types handled
- ✅ Refusal messages displayed deterministically

### Out-of-Case Blocking
- ⚠️ **Gap:** LLM can answer without case binding if user doesn't select a case
- **Fix needed:** Return structured `CONTEXT_REQUIRED` when caseContext undefined

---

## 6) CFO / Value Imaging Engine

### Current State
- **Location:** `client/src/pages/ValueImaging.tsx`
- **Type:** Static explainer page (no dynamic calculation)
- **Integration:** Not connected to case data

### Contents (Summarized — No Protected Values)
1. Value Model Structure (5-stage pipeline)
2. Credibility Caps table with [SEALED] ranges
3. Procedural Resolution Yield (PRY) formula
4. Governance Constraints (What it Does / Does Not Do)

### Recommendation
The CFO/Value Imaging engine is present as an educational page. To make it dynamic:
1. Create `server/valueImaging.ts` with config file for [SEALED] parameters
2. Add endpoint `POST /api/cases/:id/value-imaging` that takes case data
3. Return computed PRY with [SEALED] parameter placeholders
4. Display in ValueImaging page with case-specific values

---

## 7) Naming Sweep

### User-Facing Labels — All "ELI Imaging" ✅

| Location | Status |
|----------|--------|
| Sidebar header | ✅ "ELI Imaging" |
| Meta tags (og:title, twitter:title) | ✅ "ELI Imaging" |
| Client code | ✅ No "ELI Expert" references |
| Server code | ✅ No "ELI Expert" references |
| replit.md | ✅ Updated to "ELI Imaging" |

**Note:** Attached assets and Canon documents retain "ELI Expert" references (historical/canonical — not user-facing in app).

---

## 8) Prioritized Fix Plan (Top 10)

| Rank | Fix | Impact | Effort | Risk | Files |
|------|-----|--------|--------|------|-------|
| 1 | Add CONTEXT_REQUIRED response when caseContext missing in chat | High | S | Low | `server/routes.ts` (chat endpoint) |
| 2 | Persist selected case in URL params | High | S | Low | `client/src/pages/Home.tsx` |
| 3 | Unify decision target flow (use dedicated endpoint only) | Medium | M | Low | `Home.tsx`, remove PATCH usage |
| 4 | Add caseId to URL in /canon navigation | Medium | S | Low | `client/src/components/layout/Sidebar.tsx` |
| 5 | Decompose Home.tsx into smaller components | Medium | L | Low | Create `client/src/components/cases/CaseBuilder.tsx` |
| 6 | Remove deprecated /api/canon endpoints | Low | S | Low | `server/routes.ts` |
| 7 | Add database indexes for performance | Low | S | Low | `shared/schema.ts` |
| 8 | Add semantic evidence type classification | Medium | M | Low | `server/routes.ts`, `shared/schema.ts` |
| 9 | Make ValueImaging dynamic with case data | Medium | M | Low | Create `server/valueImaging.ts` |
| 10 | Add automated tests for archive guards | Low | M | Low | Create `tests/archive.test.ts` |

---

## 9) Verification Checklist (Demo Cases)

### Test Case: SYN-DEMO-007

1. **Create Case**
   - Navigate to `/`
   - Click "New Case"
   - Name: "SYN-DEMO-007"
   - ✅ Case appears in selector

2. **Set Decision Target**
   - Open case
   - Set target: "Determine if hiring decision was procedurally compliant"
   - ✅ Target displays in Case Overview

3. **Upload Documents**
   - Go to Canon Library
   - Upload 2+ documents (policy, interview)
   - ✅ Documents listed with hash

4. **Add Timeline Events**
   - Add at least 2 events with timestamps
   - ✅ Events appear in timeline

5. **Evaluate**
   - Click "Evaluate Readiness"
   - ✅ Checklist shows prerequisites met

6. **Ask Question (Case-Bound)**
   - Ask: "Are we allowed to decide yet?"
   - ✅ Response references case state, not generic

7. **Issue Printout**
   - Create determination
   - Issue printout
   - ✅ Printout is immutable (cannot edit)

### Test Case: SYN-DEMO-008 & SYN-DEMO-009

Follow same steps with different decision targets:
- SYN-DEMO-008: "Evaluate termination due process"
- SYN-DEMO-009: "Assess vendor selection compliance"

---

## Summary

The ELI Imaging system is architecturally sound with:
- ✅ Comprehensive case-centric data model
- ✅ Defense-in-depth archive protection
- ✅ Consistent "ELI Imaging" branding
- ✅ Immutable printout system
- ✅ Canon evaluation pipeline

**Primary gaps to address:**
1. Case context persistence across page refresh
2. Structured CONTEXT_REQUIRED response in LLM calls
3. Home.tsx decomposition for maintainability

All Canon content, formulas, thresholds marked as `[SEALED]` or `[CANON_REF]`.
