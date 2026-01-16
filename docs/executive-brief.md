# ELI Imaging — Executive Brief

**One-page summary for leadership, legal, and strategic partners**

---

## What It Is

ELI Imaging is a **procedural admissibility gate** — a governance system that determines whether case reviews are procedurally permitted before substantive evaluation begins.

> "ELI doesn't make decisions. It makes sure we're allowed to make them."

---

## The Problem It Solves

Organizations face three recurring governance failures:

1. **Inconsistent review standards** — "Why was this allowed last time?"
2. **Hindsight bias in evaluation** — Judging decisions by outcomes that weren't knowable
3. **Undefendable determinations** — No audit trail, no reproducibility

ELI eliminates these by enforcing structural prerequisites before any judgment occurs.

---

## How It Works

### Five Procedural Prerequisites

Before any case can be evaluated, it must satisfy:

| # | Prerequisite | Question Answered |
|---|--------------|-------------------|
| 1 | Decision Target | What decision needs support? |
| 2 | Temporal Verification | Is the timeline verifiable? |
| 3 | Independent Verification | Is there third-party confirmation? |
| 4 | Policy Application | Is the governing rule documented? |
| 5 | Contextual Constraints | Are decision-maker constraints recorded? |

### Threshold Policy

| Prerequisites Met | Status |
|-------------------|--------|
| 0-2 | Advisory only — review unsafe |
| 3 | Review permitted — high procedural risk |
| 4 | Review strong — defensible |
| 5 | Review robust — regulator-ready |

---

## What ELI Does NOT Do

- Does not evaluate outcomes, clinical correctness, or fault
- Does not assign blame or liability
- Does not replace legal counsel or ethics boards
- Does not use hindsight to judge past decisions

**ELI determines jurisdiction, not judgment.**

---

## Proof, Not Persuasion

ELI's value is provable through **invariant satisfaction**:

- Presence/absence of required inputs (binary, testable)
- Ordering of events (deterministic)
- Consistency between artifacts (hashable)
- Immutability after issuance (cryptographically enforced)

A regulator, auditor, or engineer can verify:
- "Was the decision time set?" → Yes/No
- "Was the policy effective at that time?" → Yes/No
- "Has the record been altered?" → Cryptographic proof

---

## Technical Foundation

| Capability | Implementation |
|------------|----------------|
| Case state integrity | SHA-256 hashing |
| Non-repudiation | Ed25519 signing |
| Immutability | 403 rejection on mutation |
| Replayability | Deterministic serialization |

---

## Who Cares

| Audience | What They Get |
|----------|---------------|
| **Engineering** | Determinism, replayability, no black-box inference |
| **Legal/Risk** | Defensibility, restraint, refusal to overclaim |
| **Operations** | Stable answers: "The case wasn't ready then. Here's what changed." |

---

## One-Sentence Positioning

ELI Imaging is a pre-process auditor that enforces jurisdiction before judgment — infrastructure for decisions that must withstand scrutiny.

---

*For technical integration details, see the system documentation.*
*For live demonstration, contact [your team].*
