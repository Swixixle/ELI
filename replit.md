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
- `canon_documents` - Stores metadata about uploaded Canon documents (name, size, type, version, status)
- `canon_chunks` - Stores chunked Canon content for retrieval (72 chunks from 10 documents)

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