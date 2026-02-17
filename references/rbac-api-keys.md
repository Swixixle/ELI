# ELI RBAC and API Key Scoping

## Role-Based Access Control (RBAC)

ELI enforces three distinct roles for healthcare compliance:

### Roles

#### 1. Viewer
**Purpose**: Read-only access for regulatory auditors and compliance reviewers

**Permissions**:
- Read audit trails
- View compliance reports
- Access forensic exports (read-only)
- View deterministic mode outputs

**Restrictions**:
- Cannot generate new attestations
- Cannot modify configurations
- Cannot access exploratory mode outputs
- Cannot perform administrative actions

#### 2. Analyst
**Purpose**: Operational compliance analysis and report generation

**Permissions**:
- All Viewer permissions, plus:
- Generate compliance summaries
- Create forensic export packages
- Run deterministic mode extractions
- Access historical trend analysis

**Restrictions**:
- Cannot modify system configurations
- Cannot manage users or API keys
- Cannot enable exploratory mode
- Cannot alter audit chains

#### 3. Admin
**Purpose**: System configuration and complete access

**Permissions**:
- All Analyst permissions, plus:
- Manage API keys and scopes
- Configure system settings
- Enable/disable exploratory mode (with warnings)
- Manage user roles
- Access all audit trails
- Configure environment variables

**Restrictions**:
- Cannot delete immutable audit records
- Cannot bypass PHI sanitization
- All actions are logged with actor attribution

## API Key Structure

### Key Format

```
ELI-<VERSION>-<ROLE>-<UUID>-<CHECKSUM>
```

Example:
```
ELI-v1-analyst-8472a3c9-d4e5f6a7-abc123
```

### Key Components

- **VERSION**: Schema version (e.g., `v1`)
- **ROLE**: One of `viewer`, `analyst`, or `admin`
- **UUID**: Unique identifier for the key
- **CHECKSUM**: Validation checksum

### Scoped Permissions

API keys are scoped by role and enforce permissions at every endpoint:

```json
{
  "key_id": "ELI-v1-analyst-8472a3c9-d4e5f6a7-abc123",
  "role": "analyst",
  "issued_to": "user-analyst-8472",
  "issued_at": "2026-02-17T00:00:00Z",
  "expires_at": "2027-02-17T00:00:00Z",
  "scopes": [
    "audit:read",
    "compliance:generate",
    "export:create",
    "deterministic:execute"
  ],
  "restrictions": [
    "exploratory:disabled",
    "admin:disabled",
    "audit:no-modify"
  ]
}
```

## JWT/Session Token Structure

### Token Claims (Required)

```json
{
  "sub": "user-analyst-8472",
  "role": "analyst",
  "iss": "eli-auth-service",
  "aud": "eli-api",
  "exp": 1740614400,
  "iat": 1708128000,
  "jti": "unique-token-id",
  "scopes": [
    "audit:read",
    "compliance:generate"
  ]
}
```

### Token Validation Rules

1. **Role Claim Required**: Every token MUST include a `role` claim
2. **Scope Enforcement**: Endpoints validate required scopes before execution
3. **Expiration**: Tokens MUST have expiration times (`exp` claim)
4. **Issuer Validation**: Only tokens from authorized issuers are accepted
5. **Revocation Check**: Active revocation list checked on every request

## Permission Middleware

### Endpoint Protection

Each endpoint enforces permissions via middleware:

```javascript
// Example permission enforcement
router.post('/compliance/generate', 
  requireAuth(),
  requireRole(['analyst', 'admin']),
  requireScope('compliance:generate'),
  generateComplianceReport
);

router.post('/config/update',
  requireAuth(),
  requireRole(['admin']),
  requireScope('admin:configure'),
  updateConfiguration
);
```

### Audit Trail Attribution

Every API request MUST be logged with:
- Actor ID from token `sub` claim
- Actor role from token `role` claim
- Action performed (endpoint + method)
- Timestamp (ISO-8601)
- Request outcome (success/failure)
- Patient context hash (if applicable)

## Production Requirements

### Startup Validation

On application startup, validate:

```bash
# Required environment variables
API_KEY_SIGNING_SECRET=<secret>  # For API key generation/validation
JWT_SECRET=<secret>              # For JWT token signing
DATABASE_URL=<url>               # For immutable audit storage
TLS_CERT_PATH=<path>             # For TLS encryption
TLS_KEY_PATH=<path>              # For TLS encryption
```

If any required variable is missing, the system MUST:
1. Log structured error with missing variables
2. Exit with non-zero status code
3. NOT start in degraded mode

### API Key Rotation

API keys MUST support rotation:
- Keys have expiration dates
- Old keys have grace period (configurable, default 24 hours)
- Expired keys are rejected
- Key generation is logged with admin actor attribution

### Role Escalation Prevention

- Role changes require admin action
- Role changes are logged to immutable audit trail
- Temporary role elevation is not supported
- API keys cannot escalate their own role

## Healthcare Compliance Notes

### HIPAA Considerations

- All actor IDs are considered metadata, not PHI
- API keys and tokens do not contain PHI
- Role assignments must be documented for BAA compliance
- Key rotation schedule must meet organizational security policy

### Audit Requirements

Every role action MUST be auditable:
- Who (actor_id, actor_role)
- What (action, endpoint)
- When (timestamp)
- Outcome (success/failure, error codes)
- Context (patient_context_hash if applicable)

This enables forensic reconstruction for regulatory review.

## Example RBAC Configuration

```json
{
  "rbac_version": "1.0",
  "roles": {
    "viewer": {
      "permissions": ["audit:read", "report:view"],
      "can_escalate": false,
      "max_key_lifetime_days": 90
    },
    "analyst": {
      "permissions": [
        "audit:read",
        "report:view",
        "compliance:generate",
        "export:create",
        "deterministic:execute"
      ],
      "can_escalate": false,
      "max_key_lifetime_days": 180
    },
    "admin": {
      "permissions": ["*"],
      "can_escalate": false,
      "max_key_lifetime_days": 365
    }
  },
  "enforcement": {
    "fail_closed": true,
    "require_mfa": true,
    "log_all_access": true
  }
}
```

## Migration from Existing Systems

If upgrading from a system without RBAC:

1. **Audit existing access patterns**: Determine who needs what access
2. **Assign roles conservatively**: Start with minimum required permissions
3. **Generate new API keys**: Invalidate old keys, issue role-scoped keys
4. **Enable enforcement**: Turn on permission middleware
5. **Monitor and adjust**: Review audit logs for access denial patterns

**Important**: All API requests without valid role claims MUST be rejected in production.
