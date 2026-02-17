# ELI Clinical Risk Dashboard Specification

## Overview

The Clinical Risk Dashboard provides executive-friendly compliance visibility for Hospital Risk & Compliance Officers. It focuses on legally defensible metrics, not engineering details.

**Purpose**: Enable non-technical stakeholders to understand AI-assisted clinical documentation risk and compliance status at a glance.

## Dashboard Sections

### 1. Executive Summary (Top Panel)

#### Compliance Status Indicator
- **GREEN**: All systems compliant, no high-risk flags
- **YELLOW**: Minor issues, trending watched
- **RED**: High-risk flags present, immediate review needed

#### Key Metrics (Last 30 Days)
```
┌─────────────────────────────────────────────────────────┐
│ AI-Assisted Documentation: 87.3%                        │
│ Compliance-Safe Processing: 96.2%                       │
│ Verified Attestations: 89.5%                            │
│ PHI Boundary Compliance: 100%                           │
└─────────────────────────────────────────────────────────┘
```

### 2. AI Usage Breakdown

Visual breakdown of how AI is being used:

```
Deterministic Mode (Compliance-Safe):  ████████████████░░  96.2%
Exploratory Mode (Non-Compliance):     ██░░░░░░░░░░░░░░░   3.8%
```

**Explanation for executives**:
- **Deterministic Mode**: Rule-based extraction, included in compliance reports, legally defensible
- **Exploratory Mode**: LLM-assisted analysis, excluded from compliance, requires expert validation

### 3. Confidence Tier Distribution

Confidence in AI-assisted documentation:

```
VERIFIED   (Cryptographically proven):  ███████████████░  89.5%
INFERRED   (Structurally derived):      ███░░░░░░░░░░░░░   7.7%
UNKNOWN    (Insufficient evidence):     █░░░░░░░░░░░░░░░   2.8%
```

**Key Insight**: Higher VERIFIED percentage = lower legal risk

### 4. Actor Activity & Attribution

Who is using the system and how:

```
┌──────────────────┬───────────┬──────────────┬─────────────┐
│ Role             │ Users     │ Actions      │ Avg/Day     │
├──────────────────┼───────────┼──────────────┼─────────────┤
│ Analyst          │ 12        │ 8,472        │ 282         │
│ Admin            │ 3         │ 847          │ 28          │
│ Viewer           │ 5         │ 1,234        │ 41          │
└──────────────────┴───────────┴──────────────┴─────────────┘
```

**Actor Override Frequency**: 0.03% (users overriding AI suggestions)

**Explanation**: Low override rate suggests high AI accuracy; high override rate may indicate model issues.

### 5. PHI Boundary Enforcement

Critical for HIPAA compliance:

```
┌─────────────────────────────────────────────────────────┐
│ PHI Sanitization Checks:        15,234 ✓                │
│ Failed Validations:             0                        │
│ Success Rate:                   100%                     │
│ Raw PHI Stored:                 NO ✓                     │
│ Only Hashes Used:               YES ✓                    │
└─────────────────────────────────────────────────────────┘
```

**Status**: ✅ COMPLIANT

### 6. Model Version Drift Tracking

Track when AI models change to assess impact:

```
Timeline (Last 90 Days):
Jan ────clinical-extractor-v2.0.0────┐
Feb                                    └─v2.1.0──────────→
                                       ↑
                                   Upgrade Event
                                   (2026-02-01)

Version Distribution:
  v2.1.0: ████████████████░░  92.4%  (Current)
  v2.0.0: ███░░░░░░░░░░░░░░    7.6%  (Deprecated)
```

**Alert**: Model version drift detected
**Action**: Review v2.1.0 attestations for consistency with v2.0.0

### 7. Safety Flags & Escalations

High-risk scenarios requiring attention:

```
┌─────────────────────────────────────────────────────────┐
│ High-Risk Flags (Last 30 Days):     12                  │
│ Safety Blocks Triggered:            3                   │
│ Expert Escalations:                 87                  │
│                                                          │
│ Most Common Escalation Reasons:                         │
│   1. Insufficient context (42)                          │
│   2. High clinical risk domain (28)                     │
│   3. Contradictory evidence (17)                        │
└─────────────────────────────────────────────────────────┘
```

**Status**: Within normal parameters

### 8. Audit Trail Health

Integrity of the immutable audit chain:

```
┌─────────────────────────────────────────────────────────┐
│ Total Audit Records:            15,234                  │
│ Chain Integrity:                VERIFIED ✓              │
│ Signature Coverage:             98.7%                   │
│ Actor Attribution:              100% ✓                  │
│ Last Chain Verification:        2026-02-17 00:45 UTC   │
└─────────────────────────────────────────────────────────┘
```

**Status**: ✅ AUDIT READY

## API Endpoint

### GET /api/v1/compliance/summary

Returns JSON with all dashboard metrics:

```json
{
  "period": {
    "start": "2026-01-18T00:00:00Z",
    "end": "2026-02-17T00:00:00Z",
    "days": 30
  },
  "compliance_status": "green",
  "ai_usage": {
    "total_records": 15234,
    "ai_assisted_percentage": 87.3,
    "deterministic_mode_percentage": 96.2,
    "exploratory_mode_percentage": 3.8
  },
  "confidence_distribution": {
    "VERIFIED": 89.5,
    "INFERRED": 7.7,
    "UNKNOWN": 2.8
  },
  "actor_activity": {
    "by_role": {
      "analyst": {
        "user_count": 12,
        "action_count": 8472,
        "avg_per_day": 282
      },
      "admin": {
        "user_count": 3,
        "action_count": 847,
        "avg_per_day": 28
      },
      "viewer": {
        "user_count": 5,
        "action_count": 1234,
        "avg_per_day": 41
      }
    },
    "override_frequency": 0.0003
  },
  "phi_compliance": {
    "sanitization_checks": 15234,
    "failed_validations": 0,
    "success_rate": 100.0,
    "raw_phi_stored": false,
    "only_hashes_used": true,
    "status": "compliant"
  },
  "model_versions": {
    "current": "clinical-extractor-v2.1.0",
    "distribution": {
      "clinical-extractor-v2.1.0": 92.4,
      "clinical-extractor-v2.0.0": 7.6
    },
    "drift_detected": true,
    "last_change": "2026-02-01T00:00:00Z"
  },
  "safety": {
    "high_risk_flags": 12,
    "safety_blocks": 3,
    "expert_escalations": 87,
    "top_escalation_reasons": [
      {"reason": "INSUFFICIENT_CONTEXT", "count": 42},
      {"reason": "HIGH_RISK_DOMAIN", "count": 28},
      {"reason": "CONTRADICTORY_EVIDENCE", "count": 17}
    ]
  },
  "audit_health": {
    "total_records": 15234,
    "chain_integrity": "verified",
    "signature_coverage_percentage": 98.7,
    "actor_attribution_percentage": 100.0,
    "last_verification": "2026-02-17T00:45:00Z",
    "status": "audit_ready"
  }
}
```

### Query Parameters

- `period_days`: Number of days to include (default: 30, max: 365)
- `actor_role`: Filter by role (optional)
- `execution_mode`: Filter by deterministic/exploratory (optional)

### Authorization

Requires: `viewer`, `analyst`, or `admin` role

## UI/UX Guidelines

### Tone & Language

❌ **Avoid Engineering Jargon**:
- "AST parsing"
- "Token embeddings"
- "Confidence scores" (use "Confidence Tier" instead)
- "Latency" (use "Response Time" if needed)

✅ **Use Business Language**:
- "Compliance-safe processing"
- "Legally defensible attestations"
- "PHI boundary enforcement"
- "Audit trail integrity"

### Visual Design

- **Color Coding**:
  - Green: Compliant, healthy
  - Yellow: Warning, needs attention
  - Red: Critical, requires immediate action
  - Blue: Informational

- **Progress Bars**: Use for percentages
- **Trend Lines**: Show changes over time
- **Status Badges**: Clear visual indicators

### Accessibility

- High contrast text
- Screen reader compatible
- Keyboard navigation support
- Clear labels and descriptions

## Alert Thresholds

Dashboard should highlight concerning trends:

| Metric | Warning | Critical |
|--------|---------|----------|
| Deterministic Mode % | < 90% | < 80% |
| VERIFIED Confidence % | < 80% | < 70% |
| PHI Sanitization Success | < 100% | < 99.9% |
| Actor Attribution % | < 100% | < 100% |
| Override Frequency | > 5% | > 10% |

## Export Capabilities

### PDF Export

Generate executive report PDF with:
- Cover page with organization branding
- Executive summary (1 page)
- Detailed metrics (2-3 pages)
- Trend charts
- Compliance attestation statement

**Endpoint**: `GET /api/v1/compliance/summary/export-pdf`

### CSV Export

For detailed analysis:
- Raw metrics data
- Time series data
- Actor activity logs (sanitized, no PHI)

**Endpoint**: `GET /api/v1/compliance/summary/export-csv`

## Dashboard Access Control

- **Viewer**: Can view dashboard, export PDF/CSV
- **Analyst**: Can view, export, configure date ranges
- **Admin**: Full access, including historical trend analysis

## Mobile View

Simplified mobile dashboard shows:
- Compliance status indicator
- Top 3 key metrics
- Recent alerts
- Link to full dashboard

## Refresh Rate

- Dashboard data: Refresh every 5 minutes
- Real-time alerts: Push notifications for critical events
- Historical trends: Recalculated daily at 00:00 UTC

## Implementation Notes

### Database Queries

Efficient queries for dashboard metrics:

```sql
-- AI Usage Breakdown
SELECT 
  execution_mode,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM audit_records
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY execution_mode;

-- Confidence Tier Distribution
SELECT 
  confidence_tier,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM audit_records
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND execution_mode = 'deterministic'
GROUP BY confidence_tier;

-- Actor Activity
SELECT 
  actor_role,
  COUNT(DISTINCT actor_id) as user_count,
  COUNT(*) as action_count,
  COUNT(*) / 30.0 as avg_per_day
FROM audit_records
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY actor_role;
```

### Caching Strategy

- Cache dashboard data for 5 minutes
- Invalidate cache on new audit records
- Pre-compute daily aggregates for historical trends

### Performance Considerations

- Index on `created_at`, `actor_role`, `execution_mode`, `confidence_tier`
- Materialized views for complex aggregations
- Query timeout: 10 seconds (return cached data if timeout)

## Example Dashboard Scenarios

### Scenario 1: New Model Deployment

**Timeline**: Model v2.1.0 deployed on 2026-02-01

**Dashboard shows**:
- Model version drift alert
- Comparison of v2.1.0 vs v2.0.0 confidence tiers
- Recommendation: "Monitor for 7 days, review if VERIFIED % drops"

### Scenario 2: Regulatory Audit Request

**Timeline**: Hospital receives audit notice

**Compliance officer action**:
1. Views dashboard → compliance status GREEN
2. Exports PDF summary
3. Generates forensic export for audit period
4. Provides both to auditor with verification instructions

### Scenario 3: High Override Rate Detected

**Timeline**: Override frequency jumps to 8%

**Dashboard shows**:
- Yellow alert: "Override frequency above threshold"
- Top reasons for overrides
- Recommendation: "Review model accuracy for these cases"

## Success Metrics

Dashboard is successful when compliance officers can:

1. **Answer in < 30 seconds**: "Are we compliant?"
2. **Generate audit package in < 5 minutes**: For regulatory requests
3. **Identify trends**: Without data science expertise
4. **Make decisions**: Based on clear, actionable metrics

## What NOT to Include

The dashboard should NOT show:

- ❌ Raw log files or stack traces
- ❌ API response times or latency metrics
- ❌ Memory usage or system resources
- ❌ Code deployment history
- ❌ Database schema details
- ❌ Token counts or embedding dimensions

**Focus**: Legal defensibility and compliance, not engineering operations.
