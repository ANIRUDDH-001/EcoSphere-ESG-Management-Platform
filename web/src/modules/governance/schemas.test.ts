import { describe, it, expect } from 'vitest';
import { policySchema } from './schemas';

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
      requires_ack: true
    };
    
    const result = policySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
