# ELI Forensic Export Package Specification

## Overview

The Forensic Export Package provides a legally defensible, immutable audit trail package suitable for regulatory audits, legal defense, and compliance verification.

## Package Structure

A forensic export is delivered as a ZIP file with the following structure:

```
eli-forensic-export-YYYY-MM-DD-UUID.zip
├── manifest.json
├── audit-chain.json
├── audit-chain.sha256
├── signature.sig (if available)
├── summary.pdf
├── verification-script.sh
├── metadata/
│   ├── export-info.json
│   ├── actor-summary.json
│   ├── compliance-metrics.json
│   └── phi-sanitization-report.json
└── verification/
    ├── chain-verification-tool.js
    └── README-VERIFICATION.md
```

## File Specifications

### 1. manifest.json

Complete file listing with SHA-256 hashes for integrity verification.

```json
{
  "export_version": "1.0",
  "created_at": "2026-02-17T00:52:00Z",
  "created_by": {
    "actor_id": "user-admin-1337",
    "actor_role": "admin"
  },
  "export_id": "export-uuid-here",
  "date_range": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-02-17T00:00:00Z"
  },
  "record_count": 1523,
  "chain_head_hash": {
    "alg": "sha256",
    "value": "abc123..."
  },
  "files": [
    {
      "path": "audit-chain.json",
      "sha256": "abc123...",
      "size_bytes": 524288,
      "description": "Complete audit chain records"
    },
    {
      "path": "summary.pdf",
      "sha256": "def456...",
      "size_bytes": 102400,
      "description": "Executive summary report"
    }
  ],
  "verification_status": {
    "chain_integrity": "verified",
    "signature_present": true,
    "phi_sanitization": "confirmed"
  }
}
```

### 2. audit-chain.json

Complete, immutable audit trail records.

```json
{
  "chain_version": "0.2",
  "records": [
    {
      "schema_version": "0.2",
      "created_at": "2026-02-17T00:52:00Z",
      "actor": {
        "actor_id": "user-analyst-8472",
        "actor_role": "analyst",
        "action": "review_clinical_documentation",
        "timestamp": "2026-02-17T00:52:00Z"
      },
      "eli": { ... },
      "subject": { ... },
      "inputs": { ... },
      "decision": { ... },
      "evidence": [ ... ],
      "safety": { ... },
      "audit": {
        "chain_head_hash": {
          "alg": "sha256",
          "value": "current-record-hash"
        },
        "signature_present": true,
        "previous_hash": {
          "alg": "sha256",
          "value": "previous-record-hash"
        }
      }
    }
  ]
}
```

### 3. audit-chain.sha256

SHA-256 hash manifest for all included files.

```
abc123...  audit-chain.json
def456...  summary.pdf
789abc...  manifest.json
```

Format: `<hash>  <filename>` (compatible with `shasum -c`)

### 4. signature.sig (optional but recommended)

Cryptographic signature of the audit chain using the organization's signing key.

```
-----BEGIN SIGNATURE-----
<base64-encoded-signature>
-----END SIGNATURE-----
```

### 5. summary.pdf

Executive-friendly PDF summary for legal review. Includes:

- **Cover Page**: Export ID, date range, organization details
- **Executive Summary**: High-level compliance metrics
- **Audit Statistics**: 
  - Total records
  - Actor breakdown
  - Confidence tier distribution
  - PHI sanitization confirmation
- **Timeline Visualization**: Activity over time
- **Compliance Attestation**: Statement of audit chain integrity
- **Verification Instructions**: How to independently verify the export

### 6. verification-script.sh

Standalone verification script that can be run independently.

```bash
#!/bin/bash
# ELI Forensic Export Verification Script
# Run this to verify audit chain integrity

echo "ELI Forensic Export Verification"
echo "================================"

# Verify file hashes
echo "Verifying file integrity..."
shasum -c audit-chain.sha256

# Verify chain head hash
echo "Verifying audit chain..."
node verification/chain-verification-tool.js

# Verify signature (if present)
if [ -f signature.sig ]; then
  echo "Verifying cryptographic signature..."
  # Add signature verification logic
fi

echo "Verification complete."
```

### 7. metadata/export-info.json

Export metadata for legal documentation.

```json
{
  "export_id": "export-uuid-here",
  "export_purpose": "regulatory_audit",
  "requested_by": {
    "actor_id": "user-admin-1337",
    "actor_role": "admin",
    "organization": "Example Hospital System"
  },
  "export_timestamp": "2026-02-17T00:52:00Z",
  "eli_version": "0.2",
  "date_range": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-02-17T00:00:00Z"
  },
  "filters_applied": {
    "actor_roles": ["analyst", "admin"],
    "execution_modes": ["deterministic"],
    "confidence_tiers": ["VERIFIED", "INFERRED"]
  },
  "records_included": 1523,
  "records_excluded": 42,
  "exclusion_reasons": {
    "exploratory_mode": 42
  }
}
```

### 8. metadata/actor-summary.json

Summary of all actors involved in the audit trail.

```json
{
  "actors": [
    {
      "actor_id": "user-analyst-8472",
      "actor_role": "analyst",
      "action_count": 847,
      "first_action": "2026-01-05T09:15:00Z",
      "last_action": "2026-02-16T17:30:00Z",
      "most_common_actions": [
        "review_clinical_documentation",
        "generate_compliance_summary"
      ]
    }
  ],
  "role_distribution": {
    "viewer": 0,
    "analyst": 2,
    "admin": 1
  },
  "total_unique_actors": 3
}
```

### 9. metadata/compliance-metrics.json

Compliance-specific metrics for regulatory review.

```json
{
  "date_range": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-02-17T00:00:00Z"
  },
  "metrics": {
    "total_records": 1523,
    "deterministic_mode_percentage": 96.2,
    "exploratory_mode_percentage": 3.8,
    "confidence_tier_distribution": {
      "VERIFIED": 89.5,
      "INFERRED": 7.7,
      "UNKNOWN": 2.8
    },
    "phi_sanitization": {
      "total_checks": 1523,
      "passed": 1523,
      "failed": 0,
      "success_rate": 100.0
    },
    "model_versions": {
      "clinical-extractor-v2.1.0": 1465,
      "clinical-extractor-v2.0.0": 58
    },
    "actor_override_frequency": 0.03,
    "high_risk_flags": 12,
    "safety_blocks_triggered": 3
  },
  "compliance_attestation": {
    "all_records_actor_attributed": true,
    "phi_boundary_enforced": true,
    "audit_chain_integrity_verified": true,
    "signature_validation": "passed"
  }
}
```

### 10. metadata/phi-sanitization-report.json

PHI boundary enforcement verification.

```json
{
  "sanitization_summary": {
    "total_records": 1523,
    "records_with_phi_present_flag": 1523,
    "sanitization_methods_used": {
      "regex-pattern-match-hipaa": 1465,
      "ml-entity-detection-hipaa": 58
    },
    "validation_failures": 0
  },
  "redacted_fields_summary": {
    "patient_name": 1523,
    "date_of_birth": 1523,
    "medical_record_number": 1523,
    "admission_date": 847,
    "discharge_date": 651
  },
  "phi_storage_verification": {
    "raw_phi_stored": false,
    "only_hashes_stored": true,
    "patient_context_hash_used": true
  },
  "compliance_statement": "No Protected Health Information (PHI) as defined by HIPAA was stored in any audit record. Only SHA-256 hashes of patient context were used for correlation."
}
```

## Generation Process

### API Endpoint

```
POST /api/v1/forensic-export
Authorization: Bearer <JWT with admin or analyst role>

Request Body:
{
  "date_range": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-02-17T00:00:00Z"
  },
  "filters": {
    "actor_roles": ["analyst", "admin"],
    "execution_modes": ["deterministic"],
    "confidence_tiers": ["VERIFIED", "INFERRED"]
  },
  "include_signature": true,
  "export_purpose": "regulatory_audit"
}

Response:
{
  "export_id": "export-uuid-here",
  "status": "generating",
  "estimated_completion": "2026-02-17T00:53:00Z",
  "download_url": "/api/v1/forensic-export/export-uuid-here/download"
}
```

### Generation Steps

1. **Query audit database** with specified filters
2. **Validate actor attribution** (all records must have non-null actor_id)
3. **Verify PHI sanitization** (confirm no raw PHI in any record)
4. **Calculate chain integrity** (verify all hash chains)
5. **Generate SHA-256 manifest** of all records
6. **Create PDF summary** with compliance metrics
7. **Sign the export** (if signing key available)
8. **Package as ZIP** with verification tools
9. **Log export action** to audit trail with admin/analyst actor attribution

## Verification Process

Recipients can independently verify the export:

### 1. Verify File Integrity

```bash
shasum -c audit-chain.sha256
```

All files should match their expected hashes.

### 2. Verify Audit Chain

```bash
node verification/chain-verification-tool.js
```

This validates:
- Each record's chain_head_hash matches its content
- Each record's previous_hash matches the prior record's chain_head_hash
- No gaps or tampering in the chain

### 3. Verify Signature (if present)

```bash
ssh-keygen -Y verify \
  -f allowed_signers \
  -I eli-healthcare \
  -n audit-chain \
  -s signature.sig \
  < audit-chain.json
```

### 4. Review Summary PDF

Legal and compliance teams can review the PDF for:
- Compliance attestation statements
- Actor attribution completeness
- PHI sanitization confirmation
- Confidence tier distribution

## Legal Considerations

### Admissibility

Forensic exports are designed to support legal admissibility:

- **Chain of custody**: Actor attribution for every record
- **Integrity verification**: Cryptographic hashing prevents tampering
- **Independent verification**: Recipients can verify without ELI system access
- **Completeness**: Date range and filter criteria clearly documented
- **Non-repudiation**: Cryptographic signatures (when used)

### Retention

Forensic exports should be retained according to organizational policy (typically 6+ years for healthcare).

### Distribution

- Exports may contain sensitive organizational data (not PHI)
- Encrypt during transit
- Log all export generation and distribution
- Use secure file transfer protocols

## Production Requirements

### Required Environment Variables

```bash
FORENSIC_EXPORT_SIGNING_KEY=<path-to-signing-key>
FORENSIC_EXPORT_STORAGE_PATH=<path-to-export-storage>
FORENSIC_EXPORT_MAX_SIZE_MB=500
```

### Performance Considerations

- Large date ranges may take several minutes to generate
- Consider async generation with status polling for exports >1000 records
- Cache generated exports for repeated downloads (with expiration)

### Access Control

- Only `admin` and `analyst` roles can generate forensic exports
- All export generation is logged with actor attribution
- Export downloads are logged
- Exports can be configured to auto-expire after N days

## Example Use Cases

### Regulatory Audit

Hospital receives CMS audit request for AI-assisted documentation:

1. Admin generates forensic export for specified date range
2. Export includes only deterministic mode records (compliance-safe)
3. PDF summary shows 100% PHI sanitization, 98% VERIFIED confidence tier
4. Deliver export to auditor with verification instructions

### Legal Defense

Malpractice lawsuit requires documentation of AI system behavior:

1. Analyst generates forensic export for specific patient context hash
2. Export shows complete actor attribution (who accessed, when)
3. Confidence tiers demonstrate appropriate escalation to clinicians
4. Signature verification proves no tampering

### Internal Compliance Review

Quarterly compliance review of AI documentation system:

1. Analyst generates forensic export for quarter
2. Compliance metrics show model version drift patterns
3. Actor override frequency within acceptable limits
4. High-risk flags appropriately handled

## Future Enhancements

Potential future additions (not in v0.2):

- Multi-site export aggregation
- Redacted exports for third-party review
- Real-time export streaming for continuous compliance monitoring
- Integration with electronic health record (EHR) audit systems
