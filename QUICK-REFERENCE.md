# ELI Quick Reference Guide

## 🎯 Start Here

**New to ELI?** Read these in order:
1. `README.md` - What ELI is and why it exists
2. `TRANSFORMATION.md` - Executive summary of the transformation
3. `IMPLEMENTATION.md` - How to build it

## 📁 Document Index

### Core Documentation
| Document | Purpose | Audience |
|----------|---------|----------|
| `README.md` | ELI overview and value proposition | Everyone |
| `CLAIM.md` | What is a claim in healthcare context | Developers, Compliance |
| `EVIDENCE.md` | Evidence requirements for compliance | Developers, Compliance |
| `SECURITY.md` | Security policy and HIPAA considerations | Security, Compliance |
| `TRANSFORMATION.md` | Executive summary of changes | Leadership, Stakeholders |
| `IMPLEMENTATION.md` | Complete implementation roadmap | Engineering Teams |

### Schema & Validation
| File | Purpose |
|------|---------|
| `contracts/eli-output.schema.json` | Schema v0.2 (source of truth) |
| `examples/eli-output.sample.json` | Deterministic mode example |
| `examples/eli-output-exploratory.sample.json` | Exploratory mode example |
| `validate-schema.js` | Schema validation script |

### Reference Specifications
| Document | Purpose | Words |
|----------|---------|-------|
| `references/rbac-api-keys.md` | Role-based access control and API key scoping | 6,500 |
| `references/forensic-export.md` | Legal-grade export package format | 12,000 |
| `references/clinical-risk-dashboard.md` | Executive-friendly compliance dashboard | 11,800 |
| `references/environment-setup.md` | Fail-fast startup validation and production requirements | 14,400 |
| `references/migration-guide.md` | Step-by-step v0.1 to v0.2 upgrade path | 13,200 |

## 🔍 Find What You Need

### I want to understand...

**What ELI does**
→ `README.md`

**Why ELI was transformed**
→ `TRANSFORMATION.md` (10-minute read)

**How to implement ELI**
→ `IMPLEMENTATION.md` (8-phase roadmap)

**Healthcare compliance requirements**
→ `EVIDENCE.md` + `references/forensic-export.md`

### I need to implement...

**Actor-bound audit trail**
→ Schema: `contracts/eli-output.schema.json` (actor field)
→ Guide: `IMPLEMENTATION.md` (Phase 2)

**PHI boundary enforcement**
→ Schema: `contracts/eli-output.schema.json` (phi_sanitization field)
→ Guide: `IMPLEMENTATION.md` (Phase 3)
→ Rules: `EVIDENCE.md` (PHI Boundary Rules section)

**RBAC and API keys**
→ `references/rbac-api-keys.md` (complete specification)
→ Guide: `IMPLEMENTATION.md` (Phase 1.3)

**Forensic export package**
→ `references/forensic-export.md` (complete specification)
→ Guide: `IMPLEMENTATION.md` (Phase 5)

**Clinical risk dashboard**
→ `references/clinical-risk-dashboard.md` (complete specification)
→ Guide: `IMPLEMENTATION.md` (Phase 6)

**Environment setup and fail-fast validation**
→ `references/environment-setup.md` (complete specification)
→ Guide: `IMPLEMENTATION.md` (Phase 1.1)

**Migrating from v0.1**
→ `references/migration-guide.md` (step-by-step guide)

### I need to validate...

**Schema compliance**
```bash
node validate-schema.js
```

**My understanding of confidence tiers**
→ `CLAIM.md` (Confidence Tiers section)
→ Schema: `contracts/eli-output.schema.json` (VERIFIED/INFERRED/UNKNOWN)

**PHI handling rules**
→ `EVIDENCE.md` (PHI Boundary Rules section)
→ Sample: `examples/eli-output.sample.json` (see phi_sanitization)

## 📊 Key Concepts

### Actor Attribution
Every audit record MUST include:
- `actor_id`: Authenticated user identifier
- `actor_role`: viewer | analyst | admin
- `action`: Operation type
- `timestamp`: ISO-8601 datetime

**Why**: Forensic traceability - who did what, when

**Where**: Schema field `actor`, docs in `references/rbac-api-keys.md`

### PHI Boundary Enforcement
ELI NEVER stores Protected Health Information:
- ✅ Store: SHA-256 hashes of patient context
- ❌ Never store: Names, MRNs, SSNs, DOBs, dates

**Why**: HIPAA compliance by design

**Where**: Schema field `patient_context_hash`, docs in `EVIDENCE.md`

### Deterministic vs Exploratory
- **Deterministic**: Rule-based extraction, compliance-safe, included in reports
- **Exploratory**: LLM-based, excluded from compliance, requires opt-in

**Why**: Safely experiment with AI without compromising compliance

**Where**: Schema field `execution_mode`, samples in `examples/`

### Confidence Tiers
- **VERIFIED**: Cryptographically provable
- **INFERRED**: Structurally derived from deterministic rules
- **UNKNOWN**: Insufficient evidence or LLM-based

**Why**: Legal defensibility - clarity about certainty level

**Where**: Schema field `confidence_tier`, docs in `CLAIM.md`

### Audit Chain
Each record links to previous record via SHA-256 hash:
- Current record hash: `audit.chain_head_hash`
- Previous record hash: `audit.previous_hash`

**Why**: Detect tampering, prove immutability

**Where**: Schema field `audit`, docs in `references/forensic-export.md`

## 🎬 Quick Start Scenarios

### Scenario 1: "I need to understand ELI in 15 minutes"
1. Read `README.md` (5 min)
2. Read `TRANSFORMATION.md` (10 min)
3. Skim `examples/eli-output.sample.json` (example audit record)

### Scenario 2: "I need to implement the API server"
1. Read `IMPLEMENTATION.md` (Phase 1-2)
2. Review `contracts/eli-output.schema.json` (schema structure)
3. Read `references/rbac-api-keys.md` (authentication)
4. Read `references/environment-setup.md` (configuration)

### Scenario 3: "I need to prepare for a compliance audit"
1. Read `references/forensic-export.md` (what you can provide)
2. Read `references/clinical-risk-dashboard.md` (compliance visibility)
3. Review `SECURITY.md` (security policy)

### Scenario 4: "I need to migrate existing data"
1. Read `references/migration-guide.md` (complete guide)
2. Review `examples/` (before/after format)
3. Test migration script on sample data

### Scenario 5: "I need to explain ELI to non-technical stakeholders"
1. Use `TRANSFORMATION.md` (executive summary)
2. Show `references/clinical-risk-dashboard.md` (UI mockups)
3. Explain: "Legally defensible audit trails for AI-assisted documentation"

## 🚀 Implementation Checklist

Before starting implementation, ensure you understand:

- [ ] Schema v0.2 structure (`contracts/eli-output.schema.json`)
- [ ] Actor attribution requirements (`actor` field)
- [ ] PHI boundary rules (no raw PHI, only hashes)
- [ ] Deterministic vs exploratory modes
- [ ] Confidence tier meanings (VERIFIED/INFERRED/UNKNOWN)
- [ ] RBAC roles (viewer/analyst/admin)
- [ ] Required environment variables (API_KEY, DATABASE_URL, SIGNING_KEY, TLS)
- [ ] Fail-fast startup validation approach
- [ ] Forensic export package structure
- [ ] Clinical risk dashboard metrics

**Ready to implement?** → `IMPLEMENTATION.md` (8-phase roadmap)

## 🎯 Success Metrics

You'll know ELI is working when:

1. **Validation passes**: `node validate-schema.js` returns ✓
2. **Actor attribution**: 100% of records have non-null `actor_id`
3. **PHI compliance**: 0 PHI patterns detected in stored data
4. **Audit chain integrity**: Chain verification passes on all records
5. **Forensic export**: Generate package in < 5 minutes
6. **Dashboard accessibility**: Non-technical users understand compliance status

## 📞 Getting Help

### During Implementation
Reference specifications are comprehensive:
- Schema questions → `contracts/eli-output.schema.json` + `CLAIM.md`
- RBAC questions → `references/rbac-api-keys.md`
- Export questions → `references/forensic-export.md`
- Dashboard questions → `references/clinical-risk-dashboard.md`
- Environment questions → `references/environment-setup.md`

### Understanding Healthcare Requirements
- PHI rules → `EVIDENCE.md` (PHI Boundary Rules)
- Actor attribution → `CLAIM.md` (Actor-Bound Audit Trail)
- Confidence levels → `CLAIM.md` (Confidence Tiers)
- Forensic readiness → `references/forensic-export.md`

## 📈 Documentation Stats

- **Total documentation**: 60,000+ words
- **Core docs**: 6 files
- **Reference specs**: 5 files (58,000 words)
- **Implementation guide**: 14,700 words
- **Schema examples**: 2 samples (deterministic + exploratory)
- **Code examples**: Throughout `IMPLEMENTATION.md`

## ✅ Final Checklist

Before claiming "we use ELI":

- [ ] Schema v0.2 implemented correctly
- [ ] All audit records have actor attribution
- [ ] PHI boundary enforcement validated
- [ ] Deterministic/exploratory modes separated
- [ ] Forensic export package generation working
- [ ] Clinical risk dashboard deployed
- [ ] Fail-fast startup validation in place
- [ ] External security audit passed
- [ ] HIPAA compliance review passed

**Everything in this repository is specification and documentation. Implementation code is your responsibility.**

---

**Next Steps**: Review `TRANSFORMATION.md` → Read `IMPLEMENTATION.md` → Start Phase 1
