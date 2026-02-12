# ELI Imaging

## BASE CAMP — v1.1 (January 2026)

This checkpoint represents the complete **procedural imaging system** ready for:
- Regulatory sandbox demonstrations
- Procurement conversations
- Compliance reviews
- Strategic partner demos

**Key commits to return to:**
- `9721b5e` - System review + branding consistency
- `0650429` - Case archival with defense-in-depth guards
- `e92cfea` - Rebranded to ELI Imaging with Canon §0.3 and §0.4
- `06cff98` - Integration positioning docs added
- `431a28a` - Published app

**Living State:** `docs/SYSTEM_STATE.md` (fact-only, updated after each fix)  
**Fix History:** `docs/FIX_LOG.md` (append-only change log)

---

## Constitutional Governance (Three Pillars)

ELI Imaging enforces three-pillar constitutional governance. These are frozen documents — immutable, versioned, no modification permitted:

| Pillar | Document | Version | Tests | Purpose |
|--------|----------|---------|-------|---------|
| **Parrot Box** | `domain/parrot_box/axioms.md` | v1.0 | 19 | Speech entitlement — triad enforcement (temporal, causal, contextual) |
| **SRE Stratum Locking** | `domain/sre_stratum_locking/sre_stratum_locking.md` | v1.0 | 22 | Temporal integrity — irreversible S1→S2→S3 locking with hash verification |
| **ELI Measurement Envelope** | `domain/eli_measurement_envelope/eli_measurement_envelope.md` | v1.0 | 28 | Metric authority — envelope mandatory for all measurements |

**Design Principle:** Fail-closed by default (AXIOM A0, S5, M5) — refusal is terminal, no fallback.

**Key Constitutional Constraints:**
- Scores cannot justify blame or rank individuals (AXIOM M2)
- No outcome knowledge in measurements (AXIOM M1 — only S1/S2 strata)
- Envelope stripping is impossible (AXIOM M5)
- Lock sequence S1→S2→S3 is irreversible (AXIOM S5)
- Speech requires temporal, causal, and contextual entitlement

**Total Constitutional Tests:** 88 passing (69 constitutional + 13 gate enforcement + 6 HTTP integration)

---

## Overview

ELI Imaging is a **procedural imaging system** — like an MRI for governance decisions. It produces structured representations of a decision's procedural and epistemic state at a specific point in time, determining whether evaluation is procedurally possible, not whether decisions were correct.

**Core distinction:** Imaging does not diagnose; it determines whether diagnosis is possible.

### Canon Terminology

| Term | Definition | Location |
|------|------------|----------|
| **System Canon** | Binding constitutional ruleset governing ELI Imaging behavior | `ELI_CANON/` directory (16 files) |
| **Case Canon** | Case-specific governing standards uploaded into a case | `canon_documents` table |

If any system behavior conflicts with System Canon, System Canon prevails.

The core imaging principles are:
- **Imaging separates measurement from interpretation**: ELI measures procedural structure; human authorities interpret and decide
- **Incomplete scans are reported as limited**: Failure to satisfy acquisition requirements results in a limited or unsafe scan, not synthesized conclusions
- **Outcome-blindness**: The system cannot use hindsight knowledge to justify what "should have been known" at decision time
- **Refusal over hallucination**: When epistemic entitlement is absent, the system refuses to answer rather than guess
- **IP protection**: Computation proofs show arithmetic without revealing proprietary parameters (marked as `[SEALED PARAMETER]`)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Fonts**: Inter (sans), Space Grotesk (display), JetBrains Mono (mono)

The frontend follows a page-based structure with these routes:
- `/` - Home (main advisor chat interface with guided demo)
- `/canon` - Case Canon Library (case-specific document management)
- `/about` - How It Works (system explanation)
- `/cases/:caseId/terrain` - Epistemic Terrain Sheet (Visual Spec v1 - envelope visualization)
- `/cases/:caseId/printouts` - Judgment records list (issue new printouts)
- `/cases/:caseId/printouts/:printoutId` - View immutable judgment record

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build**: Vite for client, esbuild for server bundling
- **API Pattern**: RESTful endpoints under `/api/*`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)

Current tables:
- `users` - Basic user authentication
- `cases` - Case containers for document management (name, description, status, timestamps, decisionTime, policyThresholdMin)
- `canon_documents` - Stores metadata about uploaded Canon documents (name, size, type, version, status, caseId FK, contentHash)
- `canon_chunks` - Stores chunked Canon content for retrieval (72 chunks from 10 documents)
- `decision_targets` - Stores decision target history per case (text, setAt, setBy, isActive)
- `case_events` - Stores timeline events for cases (type, description, timestamp, documentRef)
- `determinations` - Stores signed determination receipts (status, conditionsMet, receiptJson, caseStateHash)
- `case_printouts` - Immutable judgment records (title, renderedContent, summary, prerequisites, cryptographic signature)

### Case-Centric Document Management
All documents are bound to cases. The system enforces case ownership at multiple layers:
- **Schema**: `canon_documents.caseId` is NOT NULL with foreign key to `cases`
- **Storage**: `createCanonDocument` validates case existence before insert
- **API**: All document endpoints require case context; legacy global endpoints are disabled or case-gated
- **UI**: CaseSelector component required before any document operations

Case-scoped API endpoints:
- `GET /api/cases` - List all cases
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case details
- `GET /api/cases/:id/overview` - Get derived case overview (read-only aggregation)
- `GET /api/cases/:id/documents` - List documents in case
- `POST /api/cases/:id/documents` - Create document in case
- `DELETE /api/cases/:caseId/documents/:docId` - Delete document (validates ownership)

### External Tool Integration

**Ingest endpoint:** `POST /api/integrations/ingest`
- Bearer token auth via `ELI_INGEST_TOKEN` environment variable
- Source allowlist via `ELI_INGEST_SOURCES` (default: "lantern")
- Creates or appends to cases with `origin: "EXTERNAL_INGEST"`
- Appends audit trail event for forensic logging
- Rejects archived cases (409)
- Idempotency via optional `requestId` field — rejects duplicate `(source, requestId)` per case (409 DUPLICATE_REQUEST)
- Returns `{ caseId, eventId, url }`

**EFX Protocol v0.1 (Envelope Acknowledgments):**
- `POST /api/acks` - Create envelope acknowledgment (binds downstream agent to intended_use)
- `GET /api/cases/:id/acks` - List acknowledgments for case
- `GET /api/cases/:id/acks/check` - Check ACK status for measurement

### Case Overview (Derived View)

The `/api/cases/:id/overview` endpoint provides a computed, read-only snapshot for immediate case comprehension:
- **No LLM calls** - Pure aggregation from existing tables
- **No mutations** - Read-only derived data
- **< 10 second comprehension** - Designed for quick case understanding

**Overview contents:**
- Case ID, title, domain, type, phase
- Decision target and decision time
- Document and evidence counts (verified vs unverified)
- Prerequisite status (all 5 prerequisites from Canon evaluator)
- Risk tier and review permission
- "What We Know" / "What's Missing" narrative lists
- Next action hint
- Last evaluation and printout timestamps

### Canon v4.0 Evaluation System

**Decision Readiness endpoints:**
- `POST /api/cases/:id/decision-target` - Set/update decision target
- `GET /api/cases/:id/decision-target` - Get active decision target
- `POST /api/cases/:id/decision-time` - Set decision time
- `GET /api/cases/:id/events` - Get case timeline events
- `POST /api/cases/:id/events` - Create timeline event
- `POST /api/cases/:id/evaluate` - Evaluate case against 5 procedural prerequisites
- `POST /api/cases/:id/determine` - Create signed determination receipt
- `GET /api/cases/:id/receipt/latest` - Get latest determination receipt

**5 Procedural Prerequisites (Canon v4.0):**
1. **Decision Target** - What decision is this case trying to support?
2. **Temporal Verification** - When was the decision made? Can we verify the timeline?
3. **Independent Verification** - Is there third-party confirmation of claims?
4. **Policy Application** - What rule, policy, or standard governed this decision?
5. **Contextual Constraints** - What constraints shaped the decision-maker's options?

**Threshold Policy:**
- 0-2 prerequisites: Review unsafe — advisory only
- 3 prerequisites: Review permitted, high procedural risk
- 4 prerequisites: Review strong, defensible
- 5 prerequisites: Review robust, regulator-ready

**Cryptographic Receipts:**
- SHA-256 hashing for case state verification
- Ed25519 signing for receipt authenticity
- Keys loaded from ED25519_PRIVATE_KEY/ED25519_PUBLIC_KEY environment variables
- Deterministic serialization ensures reproducible hashes

### Immutable Judgment Printouts

**Purpose:** Creates permanent, cryptographically signed judgment records that cannot be modified or deleted once issued.

**Printout endpoints:**
- `POST /api/cases/:id/printouts` - Issue new printout from latest determination
- `GET /api/cases/:id/printouts` - List all printouts for a case
- `GET /api/cases/:caseId/printouts/:printoutId` - Get single printout (read-only)
- `DELETE/PATCH/PUT /api/cases/:caseId/printouts/:printoutId` - Explicitly rejected (403) for immutability

**Printout contents:**
- Case information (name, decision target, decision time)
- Determination status and Canon version
- Full procedural prerequisite checklist with evidence
- Evidence roster (documents and timeline events)
- Cryptographic verification (SHA-256 content hash, Ed25519 signature, public key ID)
- Issuance timestamp

**Frontend routes:**
- `/cases/:caseId/printouts` - List and issue printouts
- `/cases/:caseId/printouts/:printoutId` - View/print judgment record

### Canon Ingestion System
- **Ingestion Script**: `server/ingestCanon.ts` - Extracts, chunks, and indexes Canon PDFs
- **Source Files**: 10 Canon documents including Parrot Box, PhdELI, Gatekeeper Substrate, Five Lens Framework, etc.
- **Chunking**: Conservative ~2000 char chunks, preserves section boundaries
- **Storage**: PostgreSQL with content hash for deduplication

### Key Design Patterns

**Epistemic Governance Components**:
- `MessageBubble` - Renders responses with citation badges, refusal states, and computation proofs
- `CitationCard` - Displays source provenance (Canon vs. public dataset)
- `CalculationProof` - Collapsible component showing step-by-step math with sealed parameters
- `Badge` variants for epistemic status: `canon`, `dataset`, `sealed`

**IP Safety Flags**:
The system tracks different refusal/safety types:
- `parrot_box` - Epistemic entitlement absent
- `category_error` - Wrong type of question
- `medical_safety` - Health-related refusal
- `temporal_boundary` - Outcome-blindness enforcement
- `withheld_parameter` - Sealed proprietary values

**Mode Separation**:
- Advisor Mode - Epistemic governance behavior
- Sales Mode - Restricted to approved positioning language only

### Critical Behavioral Rule: Canon Application vs. Canon Recitation

**Canon is a rule set, not an encyclopedia.**

For governance questions (e.g., "Was it appropriate to discipline the unit for this outcome?"):
- The system APPLIES Canon constraints to make procedural determinations
- It does NOT summarize or cite Canon documents as the answer
- Response must include: judgment type → admissibility check → procedural approval/rejection/refusal

**Question Types and Response Patterns:**
1. **Governance Judgment** → Procedural admissibility evaluation
2. **Temporal Boundary Violation** → Explicit refusal with reason
3. **Category Error** → Redirect to appropriate authority
4. **Definitional** → Concise applied definition (only case where explanation is appropriate)
5. **Procedural** → Step-by-step guidance under Canon constraints

**Guardrail:** If a response contains only Canon titles/summaries with no procedural determination, treat as system failure.

## External Dependencies

### Database
- PostgreSQL (via `DATABASE_URL` environment variable)
- Connection pooling via `pg` package
- Session storage via `connect-pg-simple`

### UI Framework
- Radix UI primitives (dialog, popover, tooltip, accordion, etc.)
- Tailwind CSS with `@tailwindcss/vite` plugin
- Class Variance Authority for component variants

### Development Tools
- Vite dev server with HMR
- Replit-specific plugins for error overlay and dev banner
- Drizzle Kit for database migrations (`npm run db:push`)

### Planned Integrations (from attached requirements)
- RAG system for Canon document retrieval and chunking
- LLM integration for response generation (likely OpenAI or Google Generative AI based on package.json)
- Public dataset API integrations for verified external data