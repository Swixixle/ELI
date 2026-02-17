# ELI Schema Migration Guide: v0.1 → v0.2

## Overview

This guide provides step-by-step instructions for migrating from ELI v0.1 (general framework) to v0.2 (Healthcare Compliance Edition).

## Breaking Changes Summary

### Schema Version Change
- `schema_version`: `"0.1"` → `"0.2"`

### New Required Fields

1. **Actor Attribution** (new top-level object):
   ```json
   "actor": {
     "actor_id": "string",
     "actor_role": "viewer|analyst|admin",
     "action": "string",
     "timestamp": "ISO-8601"
   }
   ```

2. **ELI Object Enhancements**:
   - Added `execution_mode`: `"deterministic"|"exploratory"`
   - Added `model_version`: `"string"`

3. **Subject Object Enhancement**:
   - Added `patient_context_hash`: SHA-256 hash object

4. **Inputs Object Enhancement**:
   - Added `phi_sanitization`: validation object

5. **Decision Object Changes**:
   - Replaced `confidence` (number) with:
     - `confidence_tier`: `"VERIFIED"|"INFERRED"|"UNKNOWN"`
     - `confidence_score`: number (0-1)
   - Added optional `coverage_percentage`: number (0-100)

6. **Evidence Array Enhancement**:
   - Added `confidence_tier` to each evidence item

7. **Audit Trail** (new top-level object):
   ```json
   "audit": {
     "chain_head_hash": { "alg": "sha256", "value": "..." },
     "signature_present": boolean,
     "previous_hash": { "alg": "sha256", "value": "..." }  // optional
   }
   ```

## Migration Steps

### Step 1: Database Schema Updates

If storing ELI outputs in a database, update your schema:

```sql
-- Add new columns to audit_records table
ALTER TABLE audit_records 
  ADD COLUMN actor_id VARCHAR(255) NOT NULL DEFAULT 'system-migration',
  ADD COLUMN actor_role VARCHAR(50) NOT NULL DEFAULT 'admin',
  ADD COLUMN action VARCHAR(255) NOT NULL DEFAULT 'legacy_import',
  ADD COLUMN actor_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN execution_mode VARCHAR(50) NOT NULL DEFAULT 'deterministic',
  ADD COLUMN model_version VARCHAR(255),
  ADD COLUMN patient_context_hash_value VARCHAR(64),
  ADD COLUMN phi_sanitization_validated BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN phi_sanitization_method VARCHAR(255) NOT NULL DEFAULT 'legacy-unknown',
  ADD COLUMN confidence_tier VARCHAR(50),
  ADD COLUMN confidence_score DECIMAL(3,2),
  ADD COLUMN coverage_percentage DECIMAL(5,2),
  ADD COLUMN chain_head_hash_value VARCHAR(64),
  ADD COLUMN signature_present BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN previous_hash_value VARCHAR(64);

-- Update schema_version
UPDATE audit_records 
SET schema_version = '0.2' 
WHERE schema_version = '0.1';

-- Add indexes for new queryable fields
CREATE INDEX idx_actor_id ON audit_records(actor_id);
CREATE INDEX idx_actor_role ON audit_records(actor_role);
CREATE INDEX idx_execution_mode ON audit_records(execution_mode);
CREATE INDEX idx_confidence_tier ON audit_records(confidence_tier);
CREATE INDEX idx_patient_context_hash ON audit_records(patient_context_hash_value);
```

### Step 2: Backfill Actor Attribution

For existing records without actor attribution:

```javascript
// migration-backfill-actors.js

const fs = require('fs');
const path = require('path');

function migrateRecord(oldRecord) {
  // Default actor for legacy records
  const defaultActor = {
    actor_id: "system-migration",
    actor_role: "admin",
    action: "legacy_import",
    timestamp: oldRecord.created_at
  };

  return {
    ...oldRecord,
    schema_version: "0.2",
    actor: defaultActor
  };
}

// Process all old records
const oldRecords = JSON.parse(fs.readFileSync('old-audit-chain.json', 'utf8'));
const newRecords = oldRecords.map(migrateRecord);
fs.writeFileSync('migrated-audit-chain.json', JSON.stringify(newRecords, null, 2));

console.log(`Migrated ${newRecords.length} records`);
```

### Step 3: Migrate ELI Object Fields

Add new required fields to the `eli` object:

```javascript
function migrateEliObject(oldEli) {
  return {
    ...oldEli,
    // Assume deterministic mode for legacy records
    execution_mode: "deterministic",
    // Mark as legacy if model version unknown
    model_version: "legacy-unknown"
  };
}
```

### Step 4: Add Patient Context Hashes

For existing records, generate patient context hashes from available metadata:

```javascript
const crypto = require('crypto');

function generatePatientContextHash(record) {
  // Use available non-PHI metadata to create a correlation hash
  // DO NOT use actual PHI - this is for correlation only
  const contextData = {
    encounter_type: record.subject.type,
    timestamp_date: record.created_at.split('T')[0], // date only
    record_sequence: record.sequence_id  // if available
  };
  
  const contextString = JSON.stringify(contextData);
  const hash = crypto.createHash('sha256').update(contextString).digest('hex');
  
  return {
    alg: "sha256",
    value: hash
  };
}

function migrateSubject(oldSubject, record) {
  return {
    ...oldSubject,
    patient_context_hash: generatePatientContextHash(record)
  };
}
```

### Step 5: Add PHI Sanitization Metadata

Add PHI sanitization validation to inputs:

```javascript
function migrateInputs(oldInputs) {
  return {
    ...oldInputs,
    phi_sanitization: {
      validated: true,  // Assume legacy records were properly handled
      method: "legacy-validation"  // Mark as legacy
    }
  };
}
```

### Step 6: Migrate Confidence Fields

Convert old `confidence` number to new structured tiers:

```javascript
function migrateDecision(oldDecision) {
  const confidenceScore = oldDecision.confidence;
  
  // Map numerical confidence to tier
  let confidenceTier;
  if (confidenceScore >= 0.9) {
    confidenceTier = "VERIFIED";
  } else if (confidenceScore >= 0.6) {
    confidenceTier = "INFERRED";
  } else {
    confidenceTier = "UNKNOWN";
  }
  
  return {
    verdict: oldDecision.verdict,
    confidence_tier: confidenceTier,
    confidence_score: confidenceScore,
    rationale_codes: oldDecision.rationale_codes
    // coverage_percentage is optional, omit for legacy records
  };
}

function migrateEvidence(oldEvidence) {
  return oldEvidence.map(item => {
    // Default to INFERRED for legacy evidence
    return {
      ...item,
      confidence_tier: "INFERRED"
    };
  });
}
```

### Step 7: Create Audit Chain

Add audit chain metadata to enable forensic export:

```javascript
function createAuditChain(records) {
  const chainedRecords = [];
  let previousHash = null;
  
  for (const record of records) {
    // Calculate hash of this record's content
    const recordContent = JSON.stringify({
      schema_version: record.schema_version,
      created_at: record.created_at,
      actor: record.actor,
      eli: record.eli,
      subject: record.subject,
      inputs: record.inputs,
      decision: record.decision,
      evidence: record.evidence,
      safety: record.safety
    });
    
    const hash = crypto.createHash('sha256').update(recordContent).digest('hex');
    
    const auditMetadata = {
      chain_head_hash: {
        alg: "sha256",
        value: hash
      },
      signature_present: false  // Legacy records don't have signatures
    };
    
    if (previousHash) {
      auditMetadata.previous_hash = {
        alg: "sha256",
        value: previousHash
      };
    }
    
    chainedRecords.push({
      ...record,
      audit: auditMetadata
    });
    
    previousHash = hash;
  }
  
  return chainedRecords;
}
```

### Step 8: Complete Migration Script

Putting it all together:

```javascript
// migrate-v01-to-v02.js

const fs = require('fs');
const crypto = require('crypto');

function migrateRecordComplete(oldRecord, previousHash) {
  // Apply all migrations
  const newRecord = {
    schema_version: "0.2",
    created_at: oldRecord.created_at,
    actor: {
      actor_id: "system-migration",
      actor_role: "admin",
      action: "legacy_import",
      timestamp: oldRecord.created_at
    },
    eli: {
      ...oldRecord.eli,
      execution_mode: "deterministic",
      model_version: "legacy-unknown"
    },
    subject: {
      ...oldRecord.subject,
      patient_context_hash: generatePatientContextHash(oldRecord)
    },
    inputs: {
      ...oldRecord.inputs,
      phi_sanitization: {
        validated: true,
        method: "legacy-validation"
      }
    },
    decision: migrateDecision(oldRecord.decision),
    evidence: migrateEvidence(oldRecord.evidence),
    safety: oldRecord.safety
  };
  
  // Add audit chain
  const recordContent = JSON.stringify({
    schema_version: newRecord.schema_version,
    created_at: newRecord.created_at,
    actor: newRecord.actor,
    eli: newRecord.eli,
    subject: newRecord.subject,
    inputs: newRecord.inputs,
    decision: newRecord.decision,
    evidence: newRecord.evidence,
    safety: newRecord.safety
  });
  
  const hash = crypto.createHash('sha256').update(recordContent).digest('hex');
  
  newRecord.audit = {
    chain_head_hash: {
      alg: "sha256",
      value: hash
    },
    signature_present: false
  };
  
  if (previousHash) {
    newRecord.audit.previous_hash = {
      alg: "sha256",
      value: previousHash
    };
  }
  
  return { record: newRecord, hash };
}

// Helper functions
function generatePatientContextHash(record) {
  const contextData = {
    subject_type: record.subject.type,
    date: record.created_at.split('T')[0]
  };
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(contextData))
    .digest('hex');
  return { alg: "sha256", value: hash };
}

function migrateDecision(oldDecision) {
  const score = oldDecision.confidence;
  const tier = score >= 0.9 ? "VERIFIED" : score >= 0.6 ? "INFERRED" : "UNKNOWN";
  return {
    verdict: oldDecision.verdict,
    confidence_tier: tier,
    confidence_score: score,
    rationale_codes: oldDecision.rationale_codes
  };
}

function migrateEvidence(oldEvidence) {
  return oldEvidence.map(item => ({
    ...item,
    confidence_tier: "INFERRED"
  }));
}

// Main migration
const oldRecords = JSON.parse(fs.readFileSync('v01-records.json', 'utf8'));
const migratedRecords = [];
let previousHash = null;

for (const oldRecord of oldRecords) {
  const { record, hash } = migrateRecordComplete(oldRecord, previousHash);
  migratedRecords.push(record);
  previousHash = hash;
}

fs.writeFileSync('v02-records.json', JSON.stringify(migratedRecords, null, 2));
console.log(`✓ Migrated ${migratedRecords.length} records from v0.1 to v0.2`);
console.log(`✓ Audit chain created with ${migratedRecords.length} links`);
```

### Step 9: Validation

Validate all migrated records:

```bash
# Validate each migrated record against v0.2 schema
node validate-migrated-records.js
```

```javascript
// validate-migrated-records.js

const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('contracts/eli-output.schema.json', 'utf8'));
const records = JSON.parse(fs.readFileSync('v02-records.json', 'utf8'));

// Use your existing validateSchema function
const { validateSchema } = require('./validate-schema.js');

let errors = 0;
for (let i = 0; i < records.length; i++) {
  const validationErrors = validateSchema(records[i], schema);
  if (validationErrors.length > 0) {
    console.error(`Record ${i} validation failed:`, validationErrors);
    errors++;
  }
}

if (errors === 0) {
  console.log(`✓ All ${records.length} records validated successfully`);
} else {
  console.error(`✗ ${errors} records failed validation`);
  process.exit(1);
}
```

## Post-Migration Checklist

- [ ] All records have `schema_version: "0.2"`
- [ ] All records have `actor` attribution (even if "system-migration")
- [ ] All records have `execution_mode` set
- [ ] All records have `patient_context_hash` (no raw PHI)
- [ ] All records have `phi_sanitization` metadata
- [ ] All records have `confidence_tier` in decision and evidence
- [ ] All records have `audit` chain metadata
- [ ] Audit chain integrity verified (each previous_hash matches prior chain_head_hash)
- [ ] Database indexes created for new queryable fields
- [ ] Application code updated to use v0.2 schema
- [ ] API endpoints updated to return v0.2 format
- [ ] Dashboard updated to use new confidence_tier field
- [ ] Documentation updated

## Rollback Plan

If migration fails:

1. Restore database from backup
2. Revert application code to v0.1 compatibility
3. Investigate migration errors
4. Fix migration script
5. Retry on test data before production

## Production Migration Timeline

Recommended timeline for production migration:

1. **Week 1**: Test migration on staging data
2. **Week 2**: Review migrated data quality
3. **Week 3**: Deploy v0.2-compatible application code (backward compatible)
4. **Week 4**: Migrate production data during maintenance window
5. **Week 5**: Monitor for issues, validate audit chain integrity
6. **Week 6**: Remove v0.1 compatibility code

## Support

For migration assistance:
- Review this guide thoroughly
- Test on small dataset first
- Validate at each step
- Document any custom migration logic needed for your environment

## Compatibility Mode

During transition, support both versions:

```javascript
function normalizeRecord(record) {
  if (record.schema_version === "0.1") {
    return migrateRecordComplete(record, null).record;
  }
  return record;  // Already v0.2
}
```

This allows gradual migration while maintaining service.
