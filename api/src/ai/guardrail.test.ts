import { describe, it, expect } from 'vitest';
import { checkGrounding, collectNumbers } from './guardrail.js';

describe('AI Guardrail', () => {
  describe('collectNumbers', () => {
    it('flattens deeply nested json', () => {
      const obj = {
        scores: { e: 80, s: "90", g: 95.5 },
        history: [{ val: 10 }, { val: "20" }]
      };
      const nums = collectNumbers(obj);
      expect(nums.sort()).toEqual([10, 20, 80, 90, 95.5]);
    });
  });

  describe('checkGrounding', () => {
    it('Output using only context numbers -> grounded:true', () => {
      const res = checkGrounding('The score is 80 and the other is 90.', [80, 90]);
      expect(res.grounded).toBe(true);
      expect(res.offending).toEqual([]);
    });

    it('Output inventing "we cut emissions by 37%" when 37 isn\'t in context -> grounded:false', () => {
      const res = checkGrounding('we cut emissions by 37%', [80, 90]);
      expect(res.grounded).toBe(false);
      expect(res.offending).toEqual(['37%']);
    });

    it('Formatting equivalence treated as grounded', () => {
      const res = checkGrounding('It costs 1,234 dollars, which is 82%.', [1234, 82]);
      expect(res.grounded).toBe(true);
    });

    it('Ordinals in prose do not trigger false rejects', () => {
      const res = checkGrounding('Here are the rules:\n1. Be good\n2. Do good. 3. Help.', []);
      expect(res.grounded).toBe(true);
    });
    
    it('Years in prose do not trigger false rejects', () => {
      const res = checkGrounding('In 2024 and 1999 we had good years.', []);
      expect(res.grounded).toBe(true);
    });

    it('Decimals are matched correctly', () => {
      const res = checkGrounding('Score is 82.5', [82.5]);
      expect(res.grounded).toBe(true);
    });
    
    it('Fails correctly if decimals don\'t match', () => {
      const res = checkGrounding('Score is 82.6', [82.5]);
      expect(res.grounded).toBe(false);
      expect(res.offending).toEqual(['82.6']);
    });
  });
});
