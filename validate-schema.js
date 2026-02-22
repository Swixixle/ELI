#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple JSON Schema validator
function validateSchema(data, schema) {
  const errors = [];
  
  function validate(data, schema, path = '') {
    // Check type first
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      const expectedType = schema.type;
      
      if (expectedType === 'object' && actualType !== 'object') {
        errors.push(`Field ${path} must be an object, got ${actualType}`);
        return;
      }
      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`Field ${path} must be a string, got ${actualType}`);
        return;
      }
      if (expectedType === 'number' && actualType !== 'number') {
        errors.push(`Field ${path} must be a number, got ${actualType}`);
        return;
      }
      if (expectedType === 'array' && actualType !== 'array') {
        errors.push(`Field ${path} must be an array, got ${actualType}`);
        return;
      }
      if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push(`Field ${path} must be a boolean, got ${actualType}`);
        return;
      }
    }
    
    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${path}.${field}`);
        }
      }
    }
    
    // Check object properties
    if (schema.type === 'object' && schema.properties) {
      for (const [key, value] of Object.entries(data)) {
        if (schema.properties[key]) {
          validate(value, schema.properties[key], `${path}.${key}`);
        } else if (schema.additionalProperties === false) {
          errors.push(`Unexpected field: ${path}.${key}`);
        }
      }
    }
    
    // Check string patterns
    if (schema.type === 'string' && schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        errors.push(`Field ${path} does not match pattern ${schema.pattern}: ${data}`);
      }
    }
    
    // Check const values
    if (schema.const !== undefined && data !== schema.const) {
      errors.push(`Field ${path} must be ${schema.const}, got ${data}`);
    }
    
    // Check enum values
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`Field ${path} must be one of ${schema.enum.join(', ')}, got ${data}`);
    }
    
    // Check arrays
    if (schema.type === 'array') {
      if (schema.minItems && data.length < schema.minItems) {
        errors.push(`Array ${path} must have at least ${schema.minItems} items`);
      }
      if (schema.items) {
        data.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`));
      }
    }
    
    // Check number constraints
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push(`Field ${path} must be >= ${schema.minimum}, got ${data}`);
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push(`Field ${path} must be <= ${schema.maximum}, got ${data}`);
      }
    }
  }
  
  validate(data, schema);
  return errors;
}

// Semantic validator — Gate 2: enforces meaning, not just shape.
// Operates on the evidence[] array treating each item as a claim.
//
// Evidence items may carry optional semantic fields:
//   type          {string}   "FACT" | "INFERENCE"
//   falsifiable   {boolean}
//   depends_on    {string[]} IDs of other evidence items this claim depends on
//   assumptions   {string[]}
//   source_type   {string}   "DIRECT" | "PARTIAL" | "CONTEXT"  (confidence ceiling)
//   confidence_score {number} 0-1 numerical confidence for this evidence item
function semanticValidateELI(payload, { mode = 'fail' } = {}) {
  const issues = [];
  const claims = Array.isArray(payload.evidence) ? payload.evidence : [];

  // Confidence ceilings per source_type
  const CONFIDENCE_CEILINGS = { DIRECT: 1.0, PARTIAL: 0.7, CONTEXT: 0.5 };

  // ── 1. Duplicate claim IDs ────────────────────────────────────────────────
  const seenIds = new Set();
  for (const claim of claims) {
    if (seenIds.has(claim.id)) {
      issues.push({
        code: 'DUPLICATE_CLAIM_ID',
        severity: 'ERROR',
        claim_id: claim.id,
        message: `Duplicate claim ID: ${claim.id}`
      });
    }
    seenIds.add(claim.id);
  }

  // Build ID → claim map (use first occurrence for further checks)
  const claimMap = {};
  for (const claim of claims) {
    if (!claimMap[claim.id]) claimMap[claim.id] = claim;
  }

  // ── 2. Per-claim semantic rules ───────────────────────────────────────────
  for (const claim of claims) {
    const id = claim.id;
    const { type, falsifiable, depends_on, assumptions, source_type, confidence_score } = claim;

    if (type === 'FACT') {
      if (falsifiable !== true) {
        issues.push({
          code: 'FACT_NOT_FALSIFIABLE',
          severity: 'ERROR',
          claim_id: id,
          message: `FACT claim "${id}" must have falsifiable=true`
        });
      }

      // Check claim.evidence[] first (explicit semantic field); fall back to
      // claim.support[] which is the ELI-native array carrying the same role.
      const evidenceList = Array.isArray(claim.evidence) ? claim.evidence
        : Array.isArray(claim.support) ? claim.support : [];
      if (evidenceList.length === 0) {
        issues.push({
          code: 'FACT_NO_EVIDENCE',
          severity: 'ERROR',
          claim_id: id,
          message: `FACT claim "${id}" must have non-empty evidence (support[]) array`
        });
      }

      if (Array.isArray(depends_on) && depends_on.length > 0) {
        issues.push({
          code: 'FACT_HAS_DEPENDS_ON',
          severity: 'ERROR',
          claim_id: id,
          message: `FACT claim "${id}" must have empty depends_on[]; FACTs cannot depend on other claims`
        });
      }

      if (Array.isArray(assumptions) && assumptions.length > 0) {
        issues.push({
          code: 'FACT_HAS_ASSUMPTIONS',
          severity: 'ERROR',
          claim_id: id,
          message: `FACT claim "${id}" must have empty assumptions[]`
        });
      }
    }

    if (type === 'INFERENCE') {
      const hasDepends = Array.isArray(depends_on) && depends_on.length > 0;
      const hasAssumptions = Array.isArray(assumptions) && assumptions.length > 0;
      if (!hasDepends && !hasAssumptions) {
        issues.push({
          code: 'INFERENCE_NO_BASIS',
          severity: 'ERROR',
          claim_id: id,
          message: `INFERENCE claim "${id}" must have depends_on[] or assumptions[] populated`
        });
      }
    }

    if (source_type !== undefined) {
      if (CONFIDENCE_CEILINGS[source_type] === undefined) {
        issues.push({
          code: 'INVALID_SOURCE_TYPE',
          severity: 'WARN',
          claim_id: id,
          message: `Claim "${id}" has unrecognized source_type "${source_type}"; expected DIRECT, PARTIAL, or CONTEXT`
        });
      } else {
        const ceiling = CONFIDENCE_CEILINGS[source_type];
        if (typeof confidence_score === 'number' && confidence_score > ceiling) {
          issues.push({
            code: 'CONFIDENCE_EXCEEDS_CEILING',
            severity: 'ERROR',
            claim_id: id,
            message: `Claim "${id}" confidence_score ${confidence_score} exceeds ${source_type} ceiling of ${ceiling}`
          });
        }
      }
    }
  }

  // ── 3. Dependency cycle detection (DFS) ──────────────────────────────────
  const UNVISITED = 0, IN_STACK = 1, DONE = 2;
  const visitState = {};
  for (const id of Object.keys(claimMap)) visitState[id] = UNVISITED;

  function dfsDetectCycle(id, stack) {
    if (visitState[id] === IN_STACK) return true;  // back-edge → cycle
    if (visitState[id] === DONE) return false;
    visitState[id] = IN_STACK;
    stack.push(id);
    const deps = claimMap[id] && Array.isArray(claimMap[id].depends_on)
      ? claimMap[id].depends_on : [];
    for (const depId of deps) {
      if (!claimMap[depId]) {
        // Reference to unknown claim ID
        issues.push({
          code: 'UNKNOWN_DEPENDENCY',
          severity: 'ERROR',
          claim_id: id,
          message: `Claim "${id}" depends_on unknown claim ID "${depId}"`
        });
        continue;
      }
      if (dfsDetectCycle(depId, stack)) {
        const cycleStart = stack.indexOf(depId);
        const cyclePath = stack.slice(cycleStart).concat(depId).join(' → ');
        issues.push({
          code: 'DEPENDENCY_CYCLE',
          severity: 'ERROR',
          claim_id: id,
          message: `Dependency cycle detected: ${cyclePath}`
        });
        // Unwind to avoid duplicate cycle reports for this path
        stack.pop();
        visitState[id] = DONE;
        return true;
      }
    }
    stack.pop();
    visitState[id] = DONE;
    return false;
  }

  for (const id of Object.keys(claimMap)) {
    if (visitState[id] === UNVISITED) dfsDetectCycle(id, []);
  }

  // ── 4. Result ─────────────────────────────────────────────────────────────
  const hasErrors = issues.some(i => i.severity === 'ERROR');
  const ok = mode === 'fail' ? !hasErrors : true;
  return { ok, issues };
}

console.log('========================================');
console.log('ELI Schema Validator');
console.log('========================================\n');

// Load schema
const schemaPath = path.join(__dirname, 'contracts', 'eli-output.schema.json');
const samplePath = path.join(__dirname, 'examples', 'eli-output.sample.json');

console.log('Loading schema:', schemaPath);
console.log('Loading sample:', samplePath);
console.log();

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  
  console.log('Schema version:', schema.title);
  console.log('Sample schema version:', sample.schema_version);
  console.log();
  
  const errors = validateSchema(sample, schema);
  
  if (errors.length === 0) {
    console.log('✓ Schema validation PASSED');
  } else {
    console.log('✗ Schema validation FAILED');
    console.log('\nErrors found:');
    errors.forEach(err => console.log('  -', err));
    process.exit(1);
  }

  // ── Gate 2: Semantic validation ──────────────────────────────────────────
  console.log('\nRunning semantic validation (Gate 2)...');
  const semantic = semanticValidateELI(sample, { mode: 'fail' });

  if (semantic.issues.length > 0) {
    console.log('\nSemantic issues found:');
    semantic.issues.forEach(issue => {
      console.log(`  [${issue.severity}] ${issue.code} (claim: ${issue.claim_id}): ${issue.message}`);
    });
  }

  if (!semantic.ok) {
    console.log('\n✗ Semantic validation FAILED (Gate 2)');
    process.exit(1);
  }

  console.log('✓ Semantic validation PASSED (Gate 2)');

  console.log('\n✓ Validation PASSED');
  console.log('\nThe sample ELI output conforms to the schema.');
  console.log('\nSample content preview:');
  console.log('  - Actor:', sample.actor.actor_id, '(' + sample.actor.actor_role + ')');
  console.log('  - Execution mode:', sample.eli.execution_mode);
  console.log('  - Decision verdict:', sample.decision.verdict);
  console.log('  - Confidence tier:', sample.decision.confidence_tier);
  console.log('  - Coverage:', sample.decision.coverage_percentage + '%');
  console.log('  - Evidence items:', sample.evidence.length);
  console.log('  - Safety flags:', sample.safety.high_risk_flag ? 'HIGH RISK' : 'normal');
  console.log('  - PHI sanitized:', sample.inputs.phi_sanitization.validated ? 'YES' : 'NO');
  
  console.log('\n========================================');
  console.log('ELI Healthcare Compliance Framework');
  console.log('========================================');
  console.log('ELI provides legally defensible audit trails for');
  console.log('AI-assisted clinical documentation in healthcare.');
  console.log('');
  console.log('Key Features:');
  console.log('  • Actor-bound audit trails');
  console.log('  • PHI boundary enforcement');
  console.log('  • Deterministic vs Exploratory mode separation');
  console.log('  • Immutable forensic export capability');
  console.log('  • RBAC with scoped API keys');
  console.log('\nFor more information, see README.md');
  console.log('========================================\n');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
