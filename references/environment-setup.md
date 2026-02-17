# ELI Production Environment Setup

## Overview

ELI requires strict environment configuration for healthcare compliance. Missing required variables cause immediate startup failure.

## Philosophy: Fail-Fast by Design

In healthcare, **degraded mode is unacceptable**. ELI will not start if any required security or compliance component is missing.

**Why**: Better to not start than to operate with compromised audit integrity or PHI boundary violations.

## Required Environment Variables

### 1. API_KEY_SIGNING_SECRET

**Purpose**: Cryptographic secret for generating and validating scoped API keys

**Format**: Minimum 256-bit random string (base64 encoded)

**Generation**:
```bash
openssl rand -base64 32
```

**Example**:
```bash
export API_KEY_SIGNING_SECRET="xK7mP9qR3sT5uV8wX0yZ2aB4cD6eF8gH"
```

**Validation on Startup**:
- Must exist
- Must be at least 32 characters
- Should be cryptographically random

**Failure Behavior**:
```
ERROR: API_KEY_SIGNING_SECRET not configured
REASON: API key validation requires cryptographic signing
IMPACT: Cannot authenticate users, cannot enforce RBAC
ACTION: Set API_KEY_SIGNING_SECRET environment variable
EXITING: Application cannot start
```

### 2. DATABASE_URL

**Purpose**: Connection string for immutable audit trail persistence

**Format**: Standard database connection URL

**Examples**:
```bash
# PostgreSQL (recommended for healthcare)
export DATABASE_URL="postgresql://user:password@localhost:5432/eli_audit?sslmode=require"

# MySQL
export DATABASE_URL="mysql://user:password@localhost:3306/eli_audit?ssl=true"
```

**Requirements**:
- Database must support transactions
- Write-ahead logging (WAL) required for audit immutability
- SSL/TLS connection required (sslmode=require)

**Validation on Startup**:
- Must exist
- Must be valid connection URL
- Must be able to establish connection
- Must support required audit schema

**Failure Behavior**:
```
ERROR: DATABASE_URL not configured or invalid
REASON: Audit trail persistence requires database connection
IMPACT: Cannot store legally defensible audit records
ACTION: Set DATABASE_URL environment variable with valid connection string
EXITING: Application cannot start
```

### 3. SIGNING_KEY_PATH

**Purpose**: Path to cryptographic signing key for audit chain integrity

**Format**: File path to RSA private key (minimum 2048-bit)

**Generation**:
```bash
# Generate RSA key pair for audit chain signing
ssh-keygen -t rsa -b 4096 -f eli-signing-key -N ""
```

**Example**:
```bash
export SIGNING_KEY_PATH="/etc/eli/keys/eli-signing-key"
```

**Key Requirements**:
- RSA 2048-bit minimum (4096-bit recommended)
- Protected by file permissions (chmod 600)
- Not stored in version control
- Backed up securely (loss prevents audit verification)

**Validation on Startup**:
- File must exist
- File must be readable
- Key must be valid RSA private key
- Key must be minimum 2048-bit strength

**Failure Behavior**:
```
ERROR: SIGNING_KEY_PATH not configured or key invalid
REASON: Audit chain integrity requires cryptographic signing
IMPACT: Cannot generate legally defensible forensic exports
ACTION: Generate signing key and set SIGNING_KEY_PATH environment variable
EXITING: Application cannot start
```

### 4. JWT_SECRET

**Purpose**: Secret for signing JWT authentication tokens

**Format**: Minimum 256-bit random string

**Generation**:
```bash
openssl rand -base64 32
```

**Example**:
```bash
export JWT_SECRET="aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV"
```

**Validation on Startup**:
- Must exist
- Must be at least 32 characters
- Should be cryptographically random

**Failure Behavior**:
```
ERROR: JWT_SECRET not configured
REASON: User authentication requires JWT signing
IMPACT: Cannot authenticate users, cannot enforce actor attribution
ACTION: Set JWT_SECRET environment variable
EXITING: Application cannot start
```

### 5. TLS_ENABLED

**Purpose**: Enforce TLS for all network communication

**Format**: Boolean (true/false)

**Example**:
```bash
export TLS_ENABLED="true"
export TLS_CERT_PATH="/etc/eli/certs/server.crt"
export TLS_KEY_PATH="/etc/eli/certs/server.key"
```

**Requirements**:
- In production, TLS_ENABLED MUST be "true"
- Valid certificate and key paths required when enabled
- Minimum TLS 1.2 (TLS 1.3 recommended)

**Validation on Startup**:
- If production environment, TLS_ENABLED must be "true"
- Certificate and key files must exist and be valid
- Certificate must not be expired

**Failure Behavior**:
```
ERROR: TLS_ENABLED=false in production environment
REASON: Healthcare compliance requires encrypted communication
IMPACT: PHI boundary enforcement compromised, audit trail vulnerable
ACTION: Set TLS_ENABLED=true and configure certificates
EXITING: Application cannot start
```

## Optional Environment Variables

### PHI_SANITIZATION_STRICT_MODE

**Purpose**: Fail operations if PHI patterns detected (vs. warning only)

**Default**: `true` (recommended for production)

**Example**:
```bash
export PHI_SANITIZATION_STRICT_MODE="true"
```

### AUDIT_CHAIN_VERIFICATION_INTERVAL

**Purpose**: How often to verify audit chain integrity (seconds)

**Default**: `3600` (1 hour)

**Example**:
```bash
export AUDIT_CHAIN_VERIFICATION_INTERVAL="3600"
```

### FORENSIC_EXPORT_MAX_SIZE_MB

**Purpose**: Maximum size of forensic export packages

**Default**: `500` (MB)

**Example**:
```bash
export FORENSIC_EXPORT_MAX_SIZE_MB="1000"
```

### LOG_LEVEL

**Purpose**: Logging verbosity

**Default**: `info`

**Options**: `error`, `warn`, `info`, `debug`

**Example**:
```bash
export LOG_LEVEL="info"
```

## Environment Detection

ELI detects environment from:

```bash
export NODE_ENV="production"  # or "development", "staging", "test"
```

**Production Requirements**:
- All required variables must be present
- TLS must be enabled
- Strict PHI sanitization enabled
- Debug logging disabled

**Development Allowances**:
- TLS can be disabled (with warning)
- Less strict validation (with warnings logged)
- Mock signing keys allowed (with clear labeling)

## Startup Validation Script

ELI includes a startup validation script:

```javascript
// startup-validation.js

function validateEnvironment() {
  const errors = [];
  const warnings = [];
  
  // Required variables
  const required = [
    'API_KEY_SIGNING_SECRET',
    'DATABASE_URL',
    'SIGNING_KEY_PATH',
    'JWT_SECRET'
  ];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      errors.push({
        variable: varName,
        reason: `${varName} is required but not set`,
        impact: getImpact(varName),
        action: `Set ${varName} environment variable`
      });
    }
  }
  
  // TLS validation for production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.TLS_ENABLED !== 'true') {
      errors.push({
        variable: 'TLS_ENABLED',
        reason: 'TLS must be enabled in production',
        impact: 'Unencrypted communication violates healthcare compliance',
        action: 'Set TLS_ENABLED=true and configure certificates'
      });
    }
  }
  
  // Validate signing key
  if (process.env.SIGNING_KEY_PATH) {
    const keyValid = validateSigningKey(process.env.SIGNING_KEY_PATH);
    if (!keyValid) {
      errors.push({
        variable: 'SIGNING_KEY_PATH',
        reason: 'Signing key is invalid or insufficient strength',
        impact: 'Cannot generate cryptographically secure audit chain',
        action: 'Generate valid RSA key (min 2048-bit)'
      });
    }
  }
  
  // Database connection test
  if (process.env.DATABASE_URL) {
    const dbValid = testDatabaseConnection(process.env.DATABASE_URL);
    if (!dbValid) {
      errors.push({
        variable: 'DATABASE_URL',
        reason: 'Cannot connect to database',
        impact: 'Cannot persist audit trail',
        action: 'Verify database is running and connection string is correct'
      });
    }
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('========================================');
    console.error('STARTUP VALIDATION FAILED');
    console.error('========================================');
    console.error('ELI cannot start due to configuration errors:\n');
    
    errors.forEach((err, i) => {
      console.error(`${i + 1}. ${err.variable}`);
      console.error(`   REASON: ${err.reason}`);
      console.error(`   IMPACT: ${err.impact}`);
      console.error(`   ACTION: ${err.action}\n`);
    });
    
    console.error('========================================');
    console.error('EXITING: Fix errors above and restart');
    console.error('========================================\n');
    
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('========================================');
    console.warn('STARTUP WARNINGS');
    console.warn('========================================');
    warnings.forEach(w => console.warn(`⚠ ${w}`));
    console.warn('========================================\n');
  }
  
  console.log('✓ Environment validation passed');
}

function getImpact(varName) {
  const impacts = {
    'API_KEY_SIGNING_SECRET': 'Cannot authenticate users or enforce RBAC',
    'DATABASE_URL': 'Cannot store legally defensible audit records',
    'SIGNING_KEY_PATH': 'Cannot generate cryptographically secure forensic exports',
    'JWT_SECRET': 'Cannot authenticate users or track actor attribution'
  };
  return impacts[varName] || 'Critical system functionality compromised';
}
```

## Structured Boot Report

On successful startup, ELI logs a structured report:

```
========================================
ELI Healthcare Compliance System
========================================
Version:        0.2
Environment:    production
Startup Time:   2026-02-17T00:52:00Z

Configuration Status:
  ✓ API key signing enabled
  ✓ Database connected (postgresql)
  ✓ Audit chain signing enabled (RSA-4096)
  ✓ JWT authentication enabled
  ✓ TLS enabled (TLS 1.3)
  ✓ PHI sanitization strict mode

Security Posture:
  ✓ All required cryptographic keys present
  ✓ Fail-fast validation enabled
  ✓ Actor attribution enforced
  ✓ Audit chain integrity verified
  ✓ Production-grade configuration

Ready for Healthcare Compliance Operations
========================================
```

## Docker Deployment

Example Dockerfile with environment validation:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy application files
COPY . .

# Install dependencies
RUN npm ci --only=production

# Validate environment on container start
CMD ["sh", "-c", "node startup-validation.js && node server.js"]
```

Example docker-compose.yml:

```yaml
version: '3.8'

services:
  eli:
    image: eli-healthcare:0.2
    environment:
      - NODE_ENV=production
      - API_KEY_SIGNING_SECRET=${API_KEY_SIGNING_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - SIGNING_KEY_PATH=/keys/signing-key
      - JWT_SECRET=${JWT_SECRET}
      - TLS_ENABLED=true
      - TLS_CERT_PATH=/certs/server.crt
      - TLS_KEY_PATH=/certs/server.key
    volumes:
      - ./keys:/keys:ro
      - ./certs:/certs:ro
    ports:
      - "443:8443"
    depends_on:
      - database
      
  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=eli_audit
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - audit-data:/var/lib/postgresql/data
      
volumes:
  audit-data:
```

## Kubernetes Deployment

Example Kubernetes secret for sensitive variables:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: eli-secrets
type: Opaque
stringData:
  api-key-signing-secret: "xK7mP9qR3sT5uV8wX0yZ2aB4cD6eF8gH"
  jwt-secret: "aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV"
  database-url: "postgresql://user:pass@db:5432/eli_audit?sslmode=require"
```

Example deployment with validation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eli-healthcare
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: eli
        image: eli-healthcare:0.2
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_KEY_SIGNING_SECRET
          valueFrom:
            secretKeyRef:
              name: eli-secrets
              key: api-key-signing-secret
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: eli-secrets
              key: jwt-secret
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: eli-secrets
              key: database-url
        - name: SIGNING_KEY_PATH
          value: "/keys/signing-key"
        - name: TLS_ENABLED
          value: "true"
        volumeMounts:
        - name: signing-key
          mountPath: /keys
          readOnly: true
        - name: tls-certs
          mountPath: /certs
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 5
      volumes:
      - name: signing-key
        secret:
          secretName: eli-signing-key
      - name: tls-certs
        secret:
          secretName: eli-tls-certs
```

## Security Checklist

Before deploying to production:

- [ ] All required environment variables configured
- [ ] Signing keys generated with sufficient entropy
- [ ] Database connection uses TLS/SSL
- [ ] TLS enabled for application endpoints
- [ ] Secrets stored in secure secret management system (not .env files)
- [ ] File permissions on signing keys restricted (chmod 600)
- [ ] Startup validation tested with missing variables
- [ ] Boot report logs structured configuration summary
- [ ] Monitoring alerts configured for startup failures

## Troubleshooting

### "Application cannot start" errors

1. Check all required environment variables are set: `env | grep -E "(API_KEY|DATABASE|SIGNING|JWT|TLS)"`
2. Verify database connectivity: `psql $DATABASE_URL -c "SELECT 1"`
3. Verify signing key exists and is readable: `ls -la $SIGNING_KEY_PATH`
4. Check TLS certificate validity: `openssl x509 -in $TLS_CERT_PATH -noout -dates`

### Degraded mode warnings

ELI will NEVER run in degraded mode in production. If a non-critical warning appears, it means:
- Development environment detected, or
- Optional enhancement unavailable (but core compliance features intact)

**Never ignore warnings in production environments.**
