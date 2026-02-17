# ELI Implementation Roadmap

## Overview

This document provides a pragmatic implementation roadmap for building ELI as a healthcare compliance system. The specifications are complete; this roadmap guides implementation.

## Current State

✅ **Complete**:
- Schema v0.2 with healthcare compliance fields
- Comprehensive documentation
- Sample outputs (deterministic and exploratory modes)
- Reference specifications for all major components
- Migration path from v0.1

🚧 **Not Yet Implemented** (implementation code required):
- API server
- Database persistence
- Authentication/authorization middleware
- PHI sanitization middleware
- Audit chain generation
- Forensic export generation
- Clinical risk dashboard
- Startup validation

## Implementation Phases

### Phase 1: Foundation (2-3 weeks)

**Goal**: Basic API server with authentication and database persistence

#### 1.1 API Server Setup
- [ ] Node.js/Express server (or equivalent)
- [ ] Environment variable loading with validation
- [ ] Startup validation script (fail-fast)
- [ ] Health check endpoints (`/health`, `/ready`)
- [ ] Structured logging (JSON format)
- [ ] TLS configuration

**Tech Stack Recommendation**: Node.js 18+, Express 4.x, Winston logging

**Reference**: `references/environment-setup.md`

#### 1.2 Database Setup
- [ ] PostgreSQL database with audit schema
- [ ] Migrations for audit_records table
- [ ] Write-ahead logging (WAL) configuration
- [ ] Connection pooling
- [ ] Transaction support for audit chain integrity

**Schema**:
```sql
CREATE TABLE audit_records (
  id SERIAL PRIMARY KEY,
  schema_version VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  
  -- Actor attribution
  actor_id VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(255) NOT NULL,
  actor_timestamp TIMESTAMP NOT NULL,
  
  -- ELI metadata
  engine VARCHAR(255) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  execution_mode VARCHAR(50) NOT NULL,
  model_version VARCHAR(255),
  policy_hash_value VARCHAR(64) NOT NULL,
  
  -- Subject
  subject_type VARCHAR(255) NOT NULL,
  subject_content_type VARCHAR(255) NOT NULL,
  subject_byte_length INTEGER NOT NULL,
  patient_context_hash_value VARCHAR(64) NOT NULL,
  
  -- Complete JSON for evidence, decision, safety, inputs
  inputs_json JSONB NOT NULL,
  decision_json JSONB NOT NULL,
  evidence_json JSONB NOT NULL,
  safety_json JSONB NOT NULL,
  
  -- Audit chain
  chain_head_hash_value VARCHAR(64) NOT NULL,
  signature_present BOOLEAN NOT NULL,
  previous_hash_value VARCHAR(64),
  
  -- Indexes
  INDEX idx_created_at (created_at),
  INDEX idx_actor_id (actor_id),
  INDEX idx_actor_role (actor_role),
  INDEX idx_execution_mode (execution_mode),
  INDEX idx_patient_context_hash (patient_context_hash_value)
);
```

#### 1.3 Authentication & Authorization
- [ ] JWT middleware
- [ ] Role extraction from JWT claims
- [ ] API key validation
- [ ] RBAC enforcement middleware

**Reference**: `references/rbac-api-keys.md`

**Example Middleware**:
```javascript
function requireAuth() {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Phase 2: Core Audit Trail (2-3 weeks)

**Goal**: Create and store audit records with actor attribution

#### 2.1 Audit Record Creation
- [ ] POST `/api/v1/audit` endpoint
- [ ] Request validation against schema v0.2
- [ ] Actor extraction from JWT
- [ ] Automatic timestamp generation
- [ ] Patient context hash generation

**Example Endpoint**:
```javascript
router.post('/api/v1/audit',
  requireAuth(),
  requireRole(['analyst', 'admin']),
  validateSchema(auditRecordSchema),
  async (req, res) => {
    // Extract actor from JWT
    const actor = {
      actor_id: req.user.sub,
      actor_role: req.user.role,
      action: 'create_audit_record',
      timestamp: new Date().toISOString()
    };
    
    // Create record with actor attribution
    const record = {
      ...req.body,
      actor,
      created_at: new Date().toISOString()
    };
    
    // Calculate chain head hash
    const chainHeadHash = calculateRecordHash(record);
    
    // Get previous hash from last record
    const previousHash = await getLastRecordHash();
    
    record.audit = {
      chain_head_hash: { alg: 'sha256', value: chainHeadHash },
      signature_present: false,
      previous_hash: previousHash ? { alg: 'sha256', value: previousHash } : undefined
    };
    
    // Save to database
    await saveAuditRecord(record);
    
    res.status(201).json({ id: record.id, chain_head_hash: chainHeadHash });
  }
);
```

#### 2.2 Audit Record Retrieval
- [ ] GET `/api/v1/audit/:id` - Single record
- [ ] GET `/api/v1/audit` - List with pagination, filters
- [ ] Filter by actor_role, execution_mode, date range
- [ ] Sort by created_at

#### 2.3 Chain Integrity Verification
- [ ] Background job to verify chain integrity
- [ ] Detect any broken links in chain
- [ ] Alert on integrity violations

### Phase 3: PHI Boundary Enforcement (1-2 weeks)

**Goal**: Ensure no PHI is ever stored in audit records

#### 3.1 PHI Sanitization Middleware
- [ ] Regex-based PHI pattern detection (names, MRNs, SSNs, DOBs)
- [ ] ML-based entity detection (optional, more advanced)
- [ ] Validation before database persistence
- [ ] Block save if PHI detected in strict mode

**Example**:
```javascript
function phiSanitizationMiddleware(req, res, next) {
  const record = req.body;
  
  // Check for PHI patterns
  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
    /\b\d{10}\b/,              // MRN-like
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/  // Names (simple)
  ];
  
  const recordString = JSON.stringify(record);
  for (const pattern of phiPatterns) {
    if (pattern.test(recordString)) {
      return res.status(400).json({
        error: 'PHI pattern detected',
        message: 'Record contains potential PHI and cannot be saved',
        field: 'multiple'  // Don't reveal which field
      });
    }
  }
  
  next();
}
```

**Reference**: `EVIDENCE.md` (PHI Boundary Rules section)

#### 3.2 Patient Context Hash Generation
- [ ] Generate SHA-256 hash from non-PHI context
- [ ] Use encounter metadata, timestamps, record types
- [ ] NEVER include actual PHI identifiers

### Phase 4: Deterministic vs Exploratory Mode (1 week)

**Goal**: Clearly separate compliance-safe processing from LLM experimentation

#### 4.1 Mode Enforcement
- [ ] Validate execution_mode in every request
- [ ] Default to deterministic mode
- [ ] Require explicit opt-in for exploratory mode
- [ ] Add visual warnings in responses for exploratory mode

#### 4.2 Compliance Filtering
- [ ] Exclude exploratory mode records from compliance queries
- [ ] Add `execution_mode` filter to all audit endpoints
- [ ] Compliance dashboard shows only deterministic records by default

### Phase 5: Forensic Export (2-3 weeks)

**Goal**: Generate legal-grade export packages

#### 5.1 Export Generation Endpoint
- [ ] POST `/api/v1/forensic-export`
- [ ] Query audit records by date range and filters
- [ ] Generate manifest.json with file hashes
- [ ] Generate audit-chain.json
- [ ] Generate SHA-256 hash manifest
- [ ] Generate summary.pdf (use library like PDFKit)
- [ ] Package as ZIP file

**Reference**: `references/forensic-export.md`

#### 5.2 Export Verification Tools
- [ ] Include verification-script.sh in ZIP
- [ ] Include chain-verification-tool.js
- [ ] Test verification on generated exports

#### 5.3 Export Download & Cleanup
- [ ] GET `/api/v1/forensic-export/:id/download`
- [ ] Secure temporary storage
- [ ] Auto-cleanup after expiration (e.g., 7 days)

### Phase 6: Clinical Risk Dashboard (2 weeks)

**Goal**: Executive-friendly compliance visibility

#### 6.1 Compliance Summary Endpoint
- [ ] GET `/api/v1/compliance/summary`
- [ ] Calculate all metrics from dashboard spec
- [ ] Efficient database queries (use indexes)
- [ ] Cache results (5 minute TTL)

**Reference**: `references/clinical-risk-dashboard.md`

#### 6.2 Dashboard UI (Optional)
- [ ] Simple HTML/React dashboard
- [ ] Display metrics with visual indicators
- [ ] Color-coded compliance status
- [ ] Export to PDF

### Phase 7: Security Hardening (1-2 weeks)

**Goal**: Production-ready security

#### 7.1 Cryptographic Signing
- [ ] Implement signing key loading
- [ ] Sign audit records at creation
- [ ] Include signature in forensic exports
- [ ] Verification of signed records

#### 7.2 API Key Management
- [ ] API key generation endpoint (admin only)
- [ ] Key scoping by role
- [ ] Key rotation support
- [ ] Key revocation

#### 7.3 Rate Limiting & Protection
- [ ] Rate limiting per role
- [ ] Request size limits
- [ ] SQL injection protection (use parameterized queries)
- [ ] XSS protection

### Phase 8: Testing & Validation (2 weeks)

**Goal**: Comprehensive test coverage

#### 8.1 Unit Tests
- [ ] Schema validation tests
- [ ] Actor attribution tests
- [ ] PHI sanitization tests
- [ ] Chain integrity tests

#### 8.2 Integration Tests
- [ ] End-to-end audit record creation
- [ ] Forensic export generation
- [ ] Role-based access control
- [ ] Compliance summary accuracy

#### 8.3 Security Tests
- [ ] Penetration testing
- [ ] PHI boundary testing
- [ ] Authentication/authorization bypass attempts
- [ ] Rate limiting verification

## Technology Stack Recommendations

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express 4.x
- **Database**: PostgreSQL 15+
- **ORM**: None (use raw SQL for audit trail control) or TypeORM if needed
- **Validation**: Ajv (JSON Schema validator)
- **Auth**: jsonwebtoken
- **Logging**: Winston
- **Testing**: Jest + Supertest

### Frontend (Optional)
- **Framework**: React 18+ or simple HTML/JS
- **Charts**: Chart.js or D3.js
- **PDF Export**: jsPDF or server-side PDFKit

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes (production) or Docker Compose (development)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Secrets**: HashiCorp Vault or AWS Secrets Manager

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/Swixixle/ELI.git
cd ELI

# 2. Create .env.development
cat > .env.development <<EOF
NODE_ENV=development
API_KEY_SIGNING_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://eli:password@localhost:5432/eli_dev
SIGNING_KEY_PATH=./dev-keys/signing-key
TLS_ENABLED=false
PHI_SANITIZATION_STRICT_MODE=true
LOG_LEVEL=debug
EOF

# 3. Generate development signing key
mkdir -p dev-keys
ssh-keygen -t rsa -b 4096 -f dev-keys/signing-key -N ""

# 4. Start PostgreSQL
docker-compose up -d postgres

# 5. Run migrations
npm run migrate

# 6. Start development server
npm run dev
```

### Testing Workflow

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- audit-trail

# Run with coverage
npm test -- --coverage

# Integration tests (requires test database)
npm run test:integration
```

### Deployment Workflow

```bash
# 1. Build Docker image
docker build -t eli-healthcare:0.2 .

# 2. Run security scan
docker scan eli-healthcare:0.2

# 3. Deploy to staging
kubectl apply -f k8s/staging/

# 4. Run smoke tests
npm run test:smoke -- --env=staging

# 5. Deploy to production (after approval)
kubectl apply -f k8s/production/
```

## Success Metrics

### Technical Metrics
- [ ] 100% of audit records have non-null actor_id
- [ ] 0 PHI sanitization failures in production
- [ ] Audit chain integrity verification: 100% pass rate
- [ ] API response time p95 < 500ms
- [ ] Forensic export generation < 30 seconds for 1000 records

### Compliance Metrics
- [ ] Pass external security audit
- [ ] Pass HIPAA compliance review
- [ ] Generate forensic export in < 5 minutes for audit requests
- [ ] Compliance dashboard accessible by non-technical users

### Business Metrics
- [ ] Time to respond to audit request: < 1 hour
- [ ] Compliance officer satisfaction: 9/10+
- [ ] Zero PHI breach incidents
- [ ] 100% traceability for all AI-assisted documentation

## Risk Mitigation

### High-Priority Risks

1. **PHI Leakage**
   - Mitigation: Strict validation, multiple layers of sanitization
   - Testing: Automated PHI detection in CI/CD
   - Monitoring: Alert on any sanitization failures

2. **Audit Chain Tampering**
   - Mitigation: Cryptographic signing, immutable storage
   - Testing: Integrity verification in all tests
   - Monitoring: Continuous chain verification background job

3. **Authentication Bypass**
   - Mitigation: Multiple auth layers, fail-closed design
   - Testing: Penetration testing, security audit
   - Monitoring: Alert on repeated auth failures

4. **Performance Degradation**
   - Mitigation: Database indexes, caching, query optimization
   - Testing: Load testing with 10x expected traffic
   - Monitoring: Response time alerts, slow query logs

## Next Steps

1. **Immediate**: Review this roadmap with stakeholders
2. **Week 1**: Set up development environment and start Phase 1
3. **Week 2-3**: Complete basic API server and database
4. **Week 4-6**: Implement core audit trail with PHI boundaries
5. **Week 7-9**: Add forensic export and dashboard
6. **Week 10-12**: Security hardening and testing
7. **Week 13**: External security audit
8. **Week 14**: Production deployment

## Questions to Answer Before Implementation

- [ ] What is the expected audit record volume? (for database sizing)
- [ ] What is the retention period for audit records? (for storage planning)
- [ ] Are there existing identity providers to integrate with? (for SSO)
- [ ] What is the disaster recovery requirement? (for backup strategy)
- [ ] Are there specific compliance frameworks to certify against? (SOC 2, HITRUST, etc.)

## Support During Implementation

Reference documentation is comprehensive:
- Schema: `contracts/eli-output.schema.json`
- RBAC: `references/rbac-api-keys.md`
- Forensic Export: `references/forensic-export.md`
- Dashboard: `references/clinical-risk-dashboard.md`
- Environment: `references/environment-setup.md`
- Migration: `references/migration-guide.md`

For questions during implementation, refer to these specifications first.
