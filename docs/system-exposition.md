# ELI Expert: Complete System Exposition

**Version:** Canon v4.0  
**Last Updated:** January 2026  
**Status:** Base Camp v1.0 Complete

---

## Canon Terminology

This document uses two distinct terms for "Canon":

| Term | Definition | Location |
|------|------------|----------|
| **System Canon** | The binding constitutional ruleset governing ELI Expert's behavior, jurisdiction, guarantees, and limits. | `ELI_CANON/` directory |
| **Case Canon** | Case-specific governing standards (policies, rules, procedures) uploaded into an individual case. | `canon_documents` table |

If any system behavior conflicts with the System Canon, the System Canon prevails.

---

## 1. Conceptual Model (Human-Readable)

### What Problem It Solves

ELI Expert addresses a critical gap in governance decisions: **the absence of verifiable, outcome-blind procedural evaluation**.

Traditional review processes suffer from:
- **Hindsight bias**: Evaluators know outcomes before assessing whether decisions were procedurally sound
- **Undocumented reasoning**: Decisions get made, but the evidentiary basis is lost
- **Inconsistent standards**: Different reviewers apply different thresholds
- **No audit trail**: Impossible to prove "what we knew, when we knew it"

ELI Expert provides a governance-grade system that evaluates whether a decision **can be fairly evaluated**, not whether it was correct.

### Who It Is For

| Audience | Use Case |
|----------|----------|
| Compliance Officers | Verify procedural completeness before regulatory submission |
| Board Members | Assess whether disciplinary/strategic decisions meet fair process standards |
| Legal Counsel | Document defensible decision-making procedures |
| Auditors | Verify governance hygiene without accessing proprietary logic |
| Risk Managers | Identify procedural gaps before they become liabilities |

### What It Explicitly Does Not Do

**ELI Expert is NOT:**
- A decision-maker (it evaluates admissibility, not outcomes)
- A fault-finder (it assesses procedure, not blame)
- A general chatbot (it refuses questions outside its epistemic scope)
- A summarizer (it applies Canon rules, not recites them)
- A legal advisor (it provides procedural scaffolding, not legal conclusions)

**Core Distinction:**
> "ELI doesn't make decisions. It makes sure we're allowed to make them."

This is **jurisdiction**, not **judgment**.

### Core Philosophy

**1. Guided Procedural Literacy**
Users don't ask open-ended questions. They select from a curated question bank organized by governance concern (jurisdiction, temporal constraints, evidentiary sufficiency). Each question maps to specific Canon provisions.

**2. Outcome-Blindness**
The system enforces temporal boundaries. It refuses to use hindsight knowledge ("What should have been known at decision time?") and explicitly flags when outcome-blindness would be violated.

**3. Citation Requirements**
Every factual claim must cite an authoritative source:
- **Canon documents** (private, authoritative governing standards)
- **Public datasets** (verified external data sources) — *planned, not yet integrated*

Currently, all citations derive from Canon documents. Dataset integration is modeled but not active. Claims without citation are refused, not fabricated.

**4. IP Protection**
Computation proofs show arithmetic without revealing proprietary parameters. Values from sealed sources appear as `[SEALED PARAMETER]` while the calculation logic remains transparent.

### System Invariants

These principles are enforced architecturally, not by prompt engineering:

| Invariant | Enforcement Mechanism |
|-----------|----------------------|
| **Outcome-blindness** | `temporal_boundary` refusal flag; decision time stored per case |
| **Citation required** | Responses tagged with `canon` or `dataset` provenance |
| **Refusal over hallucination** | Safety flag taxonomy (`parrot_box`, `category_error`, etc.) |
| **Immutability of judgments** | 403 rejection on DELETE/PATCH/PUT to printout endpoints |
| **Cryptographic verification** | SHA-256 content hash + Ed25519 signature on all determinations |
| **Case-centric operations** | All document/event operations require case FK validation |

---

## 2. System Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           UI LAYER                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Tailwind CSS + shadcn/ui            │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │   │
│  │  │  Home.tsx  │ │ Canon.tsx  │ │ About.tsx  │ │ Printouts  │ │   │
│  │  │ (Overview/ │ │ (Document  │ │ (How It    │ │ (Judgment  │ │   │
│  │  │ Build/     │ │  Library)  │ │  Works)    │ │  Records)  │ │   │
│  │  │ Evaluate/  │ │            │ │            │ │            │ │   │
│  │  │ Audit)     │ │            │ │            │ │            │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION LAYER                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Express.js + TypeScript (ESM)                                │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │   │
│  │  │ routes.ts   │ │ eli/        │ │ crypto.ts   │             │   │
│  │  │ (REST API)  │ │ routes.ts   │ │ (Signing)   │             │   │
│  │  │             │ │ (ELI API)   │ │             │             │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LLM INTERACTION LAYER                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ELI Pipeline (Three-Stage)                                   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │   │
│  │  │ Interpreter │ │  Governor   │ │  Explainer  │             │   │
│  │  │ (Classify   │→│ (Apply      │→│ (Generate   │             │   │
│  │  │  intent)    │ │  Canon)     │ │  response)  │             │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘             │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │  OpenAI API (via Replit AI Integration)                 │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Neon-backed) + Drizzle ORM                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │   │
│  │  │  cases   │ │ canon_   │ │ canon_   │ │decision_ │         │   │
│  │  │          │ │documents │ │ chunks   │ │ targets  │         │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │   │
│  │  │  case_   │ │determin- │ │  case_   │                      │   │
│  │  │  events  │ │ ations   │ │printouts │                      │   │
│  │  └──────────┘ └──────────┘ └──────────┘                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Separation

| Layer | Responsibility | Technology |
|-------|----------------|------------|
| **UI** | Render case status, collect user input, display responses | React, Wouter, TanStack Query |
| **Orchestration** | Route requests, validate inputs, manage sessions | Express, Zod |
| **LLM Interaction** | Apply Canon rules, generate governed responses | OpenAI API, Three-stage pipeline |
| **Persistence** | Store cases, documents, events, determinations | PostgreSQL, Drizzle ORM |

---

## 3. Data Model

### Core Entities

#### Case (Container)
```typescript
{
  id: number              // Auto-generated PK
  name: string            // Human-readable case name
  description: string?    // Optional case summary
  status: string          // 'draft' | 'active' | 'closed'
  decisionTime: Date?     // When the decision was/will be made
  policyThresholdMin: number? // Minimum prerequisites required
  createdAt: Date         // IMMUTABLE after creation
  updatedAt: Date         // Mutable
}
```

#### Canon Document (Governing Standard)

> **Note:** Canon documents are authoritative rule sets (policies, standards, procedures), NOT evidentiary records. If a case requires factual evidence documents (logs, testimony, third-party verification), they should be classified with a distinct `type` field value.

```typescript
{
  id: number              // Auto-generated PK
  caseId: number          // FK to cases (NOT NULL)
  name: string            // Document title
  type: string            // 'pdf' | 'text' | 'markdown'
  size: number            // File size in bytes
  version: string?        // Document version
  status: string          // 'pending' | 'processed' | 'error'
  contentHash: string     // SHA-256 of content
  createdAt: Date         // IMMUTABLE
}
```

#### Canon Chunk (Retrieval Unit)
```typescript
{
  id: number              // Auto-generated PK
  documentId: number      // FK to canon_documents
  content: string         // Chunk text (~2000 chars)
  chunkIndex: number      // Position in document
  sectionTitle: string?   // Section header if detected
  embedding: float[]?     // Vector for semantic search
}
```

#### Decision Target
```typescript
{
  id: number              // Auto-generated PK
  caseId: number          // FK to cases
  text: string            // What decision is being evaluated
  setAt: Date             // IMMUTABLE
  setBy: string?          // Who set it
  isActive: boolean       // Only one active per case
}
```

#### Case Event (Timeline)
```typescript
{
  id: number              // Auto-generated PK
  caseId: number          // FK to cases
  type: string            // 'document_added' | 'decision_set' | 'event' | ...
  description: string     // Human-readable event
  timestamp: Date         // When event occurred
  documentRef: string?    // Optional document reference
}
```

#### Determination (Evaluation Result)
```typescript
{
  id: number              // Auto-generated PK
  caseId: number          // FK to cases
  reviewPermission: string // 'advisory_only' | 'permitted'
  proceduralRiskTier: string // 'unsafe' | 'high_risk' | 'defensible' | 'regulator_ready'
  prerequisitesMet: number // Count of satisfied prerequisites (0-5)
  conditionsMet: object   // Detailed prerequisite satisfaction state
  receiptJson: object     // Full determination payload
  caseStateHash: string   // SHA-256 of case state at evaluation time
  signature: string?      // Ed25519 signature
  createdAt: Date         // IMMUTABLE
}
```

**Threshold Mapping:**
| Prerequisites Met | reviewPermission | proceduralRiskTier |
|-------------------|------------------|---------------------|
| 0-2 | `advisory_only` | `unsafe` |
| 3 | `permitted` | `high_risk` |
| 4 | `permitted` | `defensible` |
| 5 | `permitted` | `regulator_ready` |

#### Case Printout (Immutable Judgment Record)
```typescript
{
  id: number              // Auto-generated PK
  caseId: number          // FK to cases
  title: string           // Printout title
  renderedContent: object // Full judgment record
  summary: string         // Brief summary
  prerequisites: object   // Snapshot of prerequisite state
  contentHash: string     // SHA-256 of renderedContent
  signature: string       // Ed25519 signature
  publicKeyId: string     // Which key signed it
  issuedAt: Date          // IMMUTABLE
  // NO updatedAt - truly immutable
}
```

### Mutability Rules

| Entity | Create | Update | Delete |
|--------|--------|--------|--------|
| Case | Yes | Yes (metadata only) | No (soft delete) |
| Canon Document | Yes | Status only | Yes (before determination) |
| Canon Chunk | Yes | No | Yes (cascade from document) |
| Decision Target | Yes | isActive only | No |
| Case Event | Yes | No | No |
| Determination | Yes | No | No |
| Case Printout | Yes | **Never** | **Never (403)** |

### Continuity Preservation

Continuity is preserved through:

1. **Case-centric ownership**: All entities belong to a case via FK
2. **Timeline immutability**: Events cannot be modified after creation
3. **Determination snapshots**: Each determination captures case state hash
4. **Printout permanence**: Judgment records are cryptographically sealed

---

## 4. Request/Response Flow

### Flow 1: Initial Case Evaluation

```
User                    Frontend                Backend                  Database
  │                        │                       │                        │
  │  Select case           │                       │                        │
  │───────────────────────>│                       │                        │
  │                        │  GET /api/cases/:id   │                        │
  │                        │──────────────────────>│                        │
  │                        │                       │  SELECT case, docs     │
  │                        │                       │───────────────────────>│
  │                        │                       │<───────────────────────│
  │                        │<──────────────────────│                        │
  │                        │                       │                        │
  │  Click "Evaluate"      │                       │                        │
  │───────────────────────>│                       │                        │
  │                        │ POST /api/cases/:id/  │                        │
  │                        │      evaluate         │                        │
  │                        │──────────────────────>│                        │
  │                        │                       │  [ELI Pipeline]        │
  │                        │                       │  1. Check decision     │
  │                        │                       │     target exists      │
  │                        │                       │  2. Check temporal     │
  │                        │                       │     constraints        │
  │                        │                       │  3. Check evidence     │
  │                        │                       │     sufficiency        │
  │                        │                       │  4. Check policy       │
  │                        │                       │     application        │
  │                        │                       │  5. Check contextual   │
  │                        │                       │     constraints        │
  │                        │                       │                        │
  │                        │  { prerequisites,     │                        │
  │                        │    permitted: bool }  │                        │
  │<───────────────────────│<──────────────────────│                        │
```

**Stored at this step:**
- Nothing new (evaluation is stateless query)

**Context preserved by:**
- Case ID in request path
- All case data queried fresh from database

### Flow 2: Question from Question Bank

```
User                    Frontend                Backend                  Database
  │                        │                       │                        │
  │  Select question       │                       │                        │
  │  from bank             │                       │                        │
  │───────────────────────>│                       │                        │
  │                        │ POST /api/eli/ask     │                        │
  │                        │ { caseId, question }  │                        │
  │                        │──────────────────────>│                        │
  │                        │                       │                        │
  │                        │                       │  [Three-Stage Pipeline]│
  │                        │                       │  ┌─────────────────┐   │
  │                        │                       │  │ 1. INTERPRETER  │   │
  │                        │                       │  │ - Classify      │   │
  │                        │                       │  │   question type │   │
  │                        │                       │  │ - Check safety  │   │
  │                        │                       │  │   flags         │   │
  │                        │                       │  └────────┬────────┘   │
  │                        │                       │           │            │
  │                        │                       │  ┌────────▼────────┐   │
  │                        │                       │  │ 2. GOVERNOR     │   │
  │                        │                       │  │ - Apply Canon   │   │
  │                        │                       │  │   rules         │   │
  │                        │                       │  │ - Retrieve      │   │
  │                        │                       │  │   relevant      │   │
  │                        │                       │  │   chunks        │   │
  │                        │                       │  └────────┬────────┘   │
  │                        │                       │           │            │
  │                        │                       │  ┌────────▼────────┐   │
  │                        │                       │  │ 3. EXPLAINER    │   │
  │                        │                       │  │ - Generate      │   │
  │                        │                       │  │   governed      │   │
  │                        │                       │  │   response      │   │
  │                        │                       │  │ - Add citations │   │
  │                        │                       │  └─────────────────┘   │
  │                        │                       │                        │
  │                        │  { response,          │                        │
  │                        │    citations[],       │                        │
  │                        │    safetyFlags }      │                        │
  │<───────────────────────│<──────────────────────│                        │
```

**Stored at this step:**
- Response may be logged for audit (optional)

**Context loss prevented by:**
- Case context passed in request
- Canon chunks retrieved per query
- No session state required (stateless)

### Flow 3: Create Determination + Printout

```
User                    Frontend                Backend                  Database
  │                        │                       │                        │
  │  Click "Issue          │                       │                        │
  │  Determination"        │                       │                        │
  │───────────────────────>│                       │                        │
  │                        │ POST /api/cases/:id/  │                        │
  │                        │      determine        │                        │
  │                        │──────────────────────>│                        │
  │                        │                       │                        │
  │                        │                       │  1. Run evaluation     │
  │                        │                       │  2. Compute case hash  │
  │                        │                       │  3. Sign receipt       │
  │                        │                       │  4. INSERT determin-   │
  │                        │                       │     ation              │
  │                        │                       │───────────────────────>│
  │                        │                       │<───────────────────────│
  │                        │  { receipt, sig }     │                        │
  │<───────────────────────│<──────────────────────│                        │
  │                        │                       │                        │
  │  Click "Create         │                       │                        │
  │  Printout"             │                       │                        │
  │───────────────────────>│                       │                        │
  │                        │ POST /api/cases/:id/  │                        │
  │                        │      printouts        │                        │
  │                        │──────────────────────>│                        │
  │                        │                       │  1. Get latest         │
  │                        │                       │     determination      │
  │                        │                       │  2. Render full        │
  │                        │                       │     judgment record    │
  │                        │                       │  3. Compute content    │
  │                        │                       │     hash               │
  │                        │                       │  4. Sign printout      │
  │                        │                       │  5. INSERT printout    │
  │                        │                       │───────────────────────>│
  │                        │                       │<───────────────────────│
  │                        │  { printout }         │                        │
  │<───────────────────────│<──────────────────────│                        │
  │                        │                       │                        │
  │                        │                       │                        │
  │  [BLOCKED FOREVER]     │                       │                        │
  │  DELETE/PATCH/PUT      │                       │                        │
  │  printout              │                       │                        │
  │───────────────────────>│                       │                        │
  │                        │ DELETE /api/cases/    │                        │
  │                        │ :id/printouts/:pid    │                        │
  │                        │──────────────────────>│                        │
  │                        │                       │  [REJECT]              │
  │                        │  403 Forbidden        │  Printouts are         │
  │<───────────────────────│<──────────────────────│  immutable             │
```

**Stored at this step:**
- Determination record (immutable)
- Printout record (immutable, cryptographically signed)

**Immutability enforced by:**
- No UPDATE/DELETE routes exposed
- Explicit 403 on mutation attempts
- No `updatedAt` field on printout table

---

## 5. Endpoint Map

### Case Management

| Method | Endpoint | Purpose | Inputs | Outputs | Side Effects |
|--------|----------|---------|--------|---------|--------------|
| GET | `/api/cases` | List all cases | - | Case[] | - |
| POST | `/api/cases` | Create case | { name, description? } | Case | INSERT case |
| GET | `/api/cases/:id` | Get case details | - | Case | - |
| PATCH | `/api/cases/:id` | Archive case (soft delete) | { status: 'archived' } | Case | UPDATE case.status |

> **Note:** Cases are never physically deleted. The `DELETE` method is not exposed. To remove a case from active view, set its status to `'archived'`. This preserves audit trail integrity.

### Document Management

| Method | Endpoint | Purpose | Inputs | Outputs | Side Effects |
|--------|----------|---------|--------|---------|--------------|
| GET | `/api/cases/:id/documents` | List case documents | - | Document[] | - |
| POST | `/api/cases/:id/documents` | Upload document | FormData | Document | INSERT document + chunks |
| DELETE | `/api/cases/:caseId/documents/:docId` | Delete document | - | { success } | DELETE document + chunks |

### Decision Readiness

| Method | Endpoint | Purpose | Inputs | Outputs | Side Effects |
|--------|----------|---------|--------|---------|--------------|
| GET | `/api/cases/:id/decision-target` | Get active target | - | DecisionTarget | - |
| POST | `/api/cases/:id/decision-target` | Set target | { text } | DecisionTarget | INSERT target, deactivate old |
| POST | `/api/cases/:id/decision-time` | Set decision time | { time } | Case | UPDATE case |
| GET | `/api/cases/:id/events` | Get timeline | - | Event[] | - |
| POST | `/api/cases/:id/events` | Add event | { type, description, timestamp } | Event | INSERT event |
| POST | `/api/cases/:id/evaluate` | Evaluate prerequisites | - | EvaluationResult | - |
| POST | `/api/cases/:id/determine` | Create determination | - | Determination | INSERT determination |
| GET | `/api/cases/:id/receipt/latest` | Get latest receipt | - | Determination | - |

### Printouts (Immutable)

| Method | Endpoint | Purpose | Inputs | Outputs | Side Effects |
|--------|----------|---------|--------|---------|--------------|
| GET | `/api/cases/:id/printouts` | List printouts | - | Printout[] | - |
| POST | `/api/cases/:id/printouts` | Issue printout | { title? } | Printout | INSERT printout (signed) |
| GET | `/api/cases/:caseId/printouts/:printoutId` | Get printout | - | Printout | - |
| DELETE | `/api/cases/:caseId/printouts/:printoutId` | **BLOCKED** | - | 403 | - |
| PATCH | `/api/cases/:caseId/printouts/:printoutId` | **BLOCKED** | - | 403 | - |
| PUT | `/api/cases/:caseId/printouts/:printoutId` | **BLOCKED** | - | 403 | - |

### ELI Pipeline

| Method | Endpoint | Purpose | Inputs | Outputs | Side Effects |
|--------|----------|---------|--------|---------|--------------|
| POST | `/api/eli/ask` | Ask governed question | { caseId, question } | Response | Optional audit log |

---

## 6. Failure & Refusal Modes

### Safety Flag Taxonomy

| Flag | Trigger | System Response | Enforcement |
|------|---------|-----------------|-------------|
| `parrot_box` | Question requires speculation | Explicit refusal with reason | Interpreter stage |
| `temporal_boundary` | Answer would use hindsight | Refusal + explain decision-time constraint | Governor stage |
| `category_error` | Question outside governance domain | Redirect to appropriate authority | Interpreter stage |
| `medical_safety` | Health-related question | Immediate refusal | Interpreter stage |
| `withheld_parameter` | Proprietary value requested | Show `[SEALED PARAMETER]` in calculation | Explainer stage |
| `insufficient_evidence` | Canon lacks relevant provisions | State limitation, refuse to fabricate | Governor stage |

> **Note on `medical_safety`:** Because ELI may receive free-form user input, certain high-risk domains (e.g., medical advice, mental health crises) trigger immediate refusal regardless of case context. This prevents misuse outside the governance domain.

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| No Canon documents | System functions, but all questions return "insufficient evidence" |
| OpenAI API unavailable | Return 503 with retry guidance |
| Invalid case ID | Return 404, not partial data |
| Malformed request | Return 400 with Zod validation errors |
| Database unavailable | Return 503, no silent failures |

### Architectural Enforcement (Not Prompt-Based)

1. **Refusal flags are structured data**, not free-text. The frontend renders them with specific UI treatments.
2. **Citation requirements are schema-enforced**. Response objects require `citations: Citation[]` field.
3. **Immutability is route-level**. No code path exists to mutate printouts.
4. **Case ownership is FK-constrained**. Database rejects orphan documents.

---

## 7. User Experience Flow

### First Interaction

1. User arrives at Home page
2. System shows "No Case Loaded" state with three options:
   - Upload Documents (go to Canon Library)
   - Review Sample Case (pre-loaded demo)
   - Open Existing Case (case selector)
3. User selects option and enters case context

### Overview (Default Tab)

Upon loading a case, user sees:

1. **Decision Target Card** - What decision is being evaluated
2. **Prerequisite Strip** - 5 visual indicators (green/amber/gray)
3. **Case Snapshot** - Document count, event count, last activity
4. **Next Action CTA** - Context-aware guidance on what to do next
5. **Quick Actions** - Set target, add event, upload document

This enables **<10 second comprehension** of case status.

### Working on a Case

**Build Tab:**
- Upload and manage documents
- View and add timeline events
- Set decision target and time

**Evaluate Tab:**
- Question bank organized by governance concern
- Ask governed questions
- View responses with citations and safety flags

**Audit Tab:**
- View determination history
- Issue immutable printouts
- Access cryptographic verification

### Returning to a Prior Case

1. User opens case selector from header
2. Sees list of all cases with status badges
3. Selects case
4. Returns to Overview tab with current state

### UI Reflects System State

| System State | UI Treatment |
|--------------|--------------|
| No decision target | Prominent "Set Decision Target" CTA |
| Prerequisites incomplete | Amber status dot, blocked actions |
| Prerequisites complete | Green status dot, "Evaluate" enabled |
| Determination issued | "Issue Printout" available |
| Printout exists | Read-only view, verification info |

---

## 8. Non-Goals

ELI Expert explicitly does **NOT** attempt to be:

| Non-Goal | Reason |
|----------|--------|
| **General-purpose chatbot** | Questions must be governance-relevant and case-bound |
| **Document summarizer** | Canon is applied, not recited |
| **Decision-maker** | Evaluates admissibility, not outcomes |
| **Fault-finder** | Assesses procedure, not blame |
| **Legal advisor** | Provides scaffolding, not legal conclusions |
| **Tutor** | Users select from curated questions, not open exploration |
| **Real-time collaboration** | Single-user case construction |
| **Version control system** | Checkpoints are external (Replit) |

---

## 9. Implementation Status

### Implemented (Production-Ready)

| Component | Status | Notes |
|-----------|--------|-------|
| Case CRUD | Complete | Full lifecycle management |
| Document upload/chunking | Complete | PDF extraction, 2K chunks |
| Decision target management | Complete | Single active target per case |
| Timeline events | Complete | Immutable event log |
| 5 Prerequisite evaluation | Complete | All checks implemented |
| Determination with signing | Complete | Ed25519, SHA-256 |
| Immutable printouts | Complete | 403 on mutation |
| Three-stage ELI pipeline | Complete | Interpreter/Governor/Explainer |
| Tab navigation (Overview/Build/Evaluate/Audit) | Complete | Overview is default |
| Question bank | Complete | Curated by category |
| Citation display | Complete | Canon vs Dataset badges |
| Safety flag rendering | Complete | Explicit refusal UI |

### Partially Implemented

| Component | Status | Missing |
|-----------|--------|---------|
| Semantic search | Chunking done | Vector embeddings not indexed |
| Multi-case comparison | Schema supports | No UI |
| Batch evaluation | API exists | No bulk UI |

### Planned (Not Started)

| Component | Priority | Notes |
|-----------|----------|-------|
| Public dataset integration | Medium | External data source verification |
| Export to PDF | Low | Printout rendering |
| User authentication | Medium | Currently single-user |
| Role-based access | Low | Reviewer vs. Builder |
| Audit log export | Medium | Compliance requirement |

### Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| OpenAI dependency | Medium | Graceful 503, no fallback LLM |
| Key rotation | Low | Ed25519 keys in env vars, manual rotation |
| Canon versioning | Medium | Version field exists, no migration UI |
| Large document handling | Low | Chunking handles, no file size limit enforced |

### Technical Debt

| Debt | Impact | Resolution |
|------|--------|------------|
| Demo mode bypasses some checks | Low | Flagged in UI as demo |
| Some legacy endpoints disabled | None | Can be removed |
| No automated UI tests | Medium | Manual testing only |

---

## 10. Provability & Verification Steps

This section enables auditors and regulators to independently verify ELI's claims. Each verification can be performed without access to source code.

### Verifying a Determination

**Objective:** Confirm that a determination receipt has not been tampered with.

**Steps:**
1. **Retrieve the determination** via `GET /api/cases/:id/receipt/latest`
2. **Extract `caseStateHash`** from the receipt
3. **Recompute the hash:**
   - Serialize case state deterministically (sorted keys, no whitespace)
   - Apply SHA-256
   - Compare to stored `caseStateHash`
4. **Verify signature:**
   - Retrieve public key from `ED25519_PUBLIC_KEY` (or published key registry)
   - Apply Ed25519 verification to `signature` field against `receiptJson`
5. **Confirm match:** If hash and signature both verify, the determination is authentic and unmodified

### Verifying Printout Immutability

**Objective:** Confirm that a judgment record cannot be modified.

**Steps:**
1. **Retrieve the printout** via `GET /api/cases/:caseId/printouts/:printoutId`
2. **Compare stored hash:**
   - Extract `contentHash` from printout metadata
   - Apply SHA-256 to `renderedContent`
   - Values must match
3. **Verify signature:**
   - Apply Ed25519 verification using `publicKeyId` to locate correct key
   - Verify `signature` against `renderedContent`
4. **Attempt mutation:**
   - Send `DELETE /api/cases/:caseId/printouts/:printoutId`
   - Expect `403 Forbidden` response
   - Send `PATCH` and `PUT` — both must return `403`
5. **Confirm immutability:** 403 on all mutation endpoints + valid signature = immutable

### Verifying Temporal Boundary Compliance

**Objective:** Confirm that no hindsight knowledge contaminated the evaluation.

**Steps:**
1. **Check decision time exists:**
   - Retrieve case via `GET /api/cases/:id`
   - Confirm `decisionTime` field is populated
2. **Verify evidence timestamps:**
   - Retrieve timeline via `GET /api/cases/:id/events`
   - For each event, confirm `timestamp ≤ decisionTime`
   - Any event with `timestamp > decisionTime` should be flagged
3. **Verify document dates:**
   - Retrieve documents via `GET /api/cases/:id/documents`
   - Check `createdAt` timestamps against `decisionTime`
4. **Review determination receipt:**
   - Check that `receiptJson` includes temporal verification status
   - Status should indicate whether temporal constraints were satisfied

### Verifying Citation Provenance

**Objective:** Confirm that all factual claims are traceable to System Canon or Case Canon.

**Steps:**
1. **Review any ELI response** from `POST /api/eli/ask`
2. **Extract `citations[]` array** from response
3. **For each citation:**
   - `type: 'system_canon'` — Verify reference exists in `ELI_CANON/` directory
   - `type: 'case_canon'` — Verify document exists via `GET /api/cases/:id/documents`
   - `chunkId` if present — Verify chunk exists in `canon_chunks` table
   - `type: 'dataset'` — Currently not active (planned feature)
4. **Flag uncited claims:** Any substantive factual claim without a citation entry indicates a system failure

### Verification Checklist (One-Page Summary)

| Verification | Method | Expected Result |
|--------------|--------|-----------------|
| Determination hash | SHA-256 recompute | Matches `caseStateHash` |
| Determination signature | Ed25519 verify | Valid |
| Printout hash | SHA-256 recompute | Matches `contentHash` |
| Printout signature | Ed25519 verify | Valid |
| Printout DELETE | HTTP request | 403 Forbidden |
| Printout PATCH/PUT | HTTP request | 403 Forbidden |
| Decision time exists | GET case | `decisionTime` populated |
| Timeline temporal order | Compare timestamps | All ≤ `decisionTime` |
| Citations present | Inspect response | All claims have citations |

---

## Appendix A: System Canon Index

The System Canon is located in `ELI_CANON/` and contains:

| File | Purpose |
|------|---------|
| `00_CANON_CHARTER.md` | What ELI is allowed, required, and forbidden to do |
| `01_SYSTEM_JURISDICTION.md` | Procedural admissibility scope |
| `02_PROCEDURAL_PREREQUISITES.md` | The 5 prerequisites |
| `03_EPISTEMIC_GOVERNANCE.md` | Outcome-blindness as structural invariant |
| `04_PARROT_BOX.md` | Epistemic containment doctrine |
| `05_DETERMINATIONS_AND_PRINTS.md` | Immutability requirements |
| `06_TRUST_GUARANTEES_AND_LIMITS.md` | What ELI guarantees and refuses |
| `07_OPERATOR_AUTHORITY.md` | Operator attestation requirements |
| `08_FAILURE_MODES.md` | Accepted failure modes |
| `09_NON_GOALS.md` | What ELI is explicitly not |
| `10_CANON_CHANGE_CONTROL.md` | Versioning and forward-only changes |
| `11_CITATION_AND_PROVENANCE.md` | Citation requirements |
| `12_VERIFICATION_PLAYBOOK.md` | Independent verification requirements |
| `13_SEALED_PARAMETERS_AND_DISCLOSURE.md` | IP protection rules |

All Determinations must reference the System Canon version in force at issuance.

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **System Canon** | Binding constitutional ruleset governing ELI Expert (in `ELI_CANON/`) |
| **Case Canon** | Case-specific governing standards uploaded to a case |
| **Prerequisite** | One of 5 procedural requirements for fair evaluation |
| **Determination** | Signed evaluation result (can be issued multiple times) |
| **Printout** | Immutable judgment record (cannot be modified after creation) |
| **Decision Target** | The specific decision being evaluated for procedural admissibility |
| **Decision Time** | When the decision was/will be made (temporal boundary anchor) |
| **Outcome-blindness** | Refusal to use hindsight knowledge in evaluation |
| **Sealed Parameter** | Proprietary value hidden from computation proofs |
| **Parrot Box** | Epistemic containment doctrine governing refusal |

---

*This document should stand alone as canonical reference for any engineer, auditor, or stakeholder seeking to understand ELI Expert without further explanation.*
