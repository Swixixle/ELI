# ELI Expert

## Overview

ELI Expert is a governance-grade epistemic assistant designed to provide verifiable, outcome-blind answers grounded strictly in authoritative documentation ("Canon") and public data sources. Unlike general-purpose chatbots, this system enforces strict admissibility rules, refuses to speculate or invent claims, and can prove its computations step-by-step without exposing proprietary logic.

The core principles are:
- **Outcome-blindness**: The system cannot use hindsight knowledge to justify what "should have been known" at decision time
- **Citation requirements**: Every factual claim must cite either private Canon documents or public data sources
- **Truth refusal**: When epistemic entitlement is absent, the system refuses to answer rather than guess
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

The frontend follows a page-based structure with three main routes:
- `/` - Home (main advisor chat interface with guided demo)
- `/canon` - Canon Library (document management)
- `/about` - How It Works (system explanation)

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
- `GET /api/cases/:id/documents` - List documents in case
- `POST /api/cases/:id/documents` - Create document in case
- `DELETE /api/cases/:caseId/documents/:docId` - Delete document (validates ownership)

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