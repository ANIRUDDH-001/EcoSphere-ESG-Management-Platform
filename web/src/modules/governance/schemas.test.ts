import { describe, it, expect } from 'vitest';
import { policySchema, auditSchema, auditCompleteSchema, issueSchema } from './schemas';

describe('policySchema', () => {
  it('requires pillar and effective_date', () => {
    const invalid = {
      name: 'Test Policy',
      version: '1.0'
      // missing pillar and effective_date
    };
    
    const result = policySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.format();
      expect(errors.pillar?._errors).toBeDefined();
      expect(errors.effective_date?._errors).toBeDefined();
    }
  });

  it('accepts valid input', () => {
    const valid = {
      name: 'Code of Conduct',
      pillar: 'governance',
      version: '1.0',
      effective_date: '2023-01-01',
      requires_ack: true,
      status: 'active'
    };
    
    const result = policySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('auditSchema', () => {
  it('validates required fields', () => {
    const valid = { title: 'Q1 Audit', department_id: 'd1', auditor_id: 'a1', scheduled_date: '2023-01-01' };
    expect(auditSchema.safeParse(valid).success).toBe(true);

    const invalid = { title: '' };
    expect(auditSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('auditCompleteSchema', () => {
  it('validates result enum and required date', () => {
    const valid = { result: 'pass', completed_date: '2023-01-02' };
    expect(auditCompleteSchema.safeParse(valid).success).toBe(true);

    const invalidEnum = { result: 'unknown', completed_date: '2023-01-02' };
    expect(auditCompleteSchema.safeParse(invalidEnum).success).toBe(false);
  });
});

describe('issueSchema', () => {
  it('validates a correct issue', () => {
    const result = issueSchema.safeParse({
      severity: 'high',
      description: 'Test issue',
      owner_id: 'user1',
      due_date: '2023-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing owner or due_date', () => {
    const result = issueSchema.safeParse({
      severity: 'high',
      description: 'Test issue',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e: any) => e.path.includes('owner_id'))).toBe(true);
      expect(result.error.issues.some((e: any) => e.path.includes('due_date'))).toBe(true);
    }
  });
});
