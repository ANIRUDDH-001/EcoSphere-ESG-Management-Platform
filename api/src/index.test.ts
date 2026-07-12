import { expect, test } from 'vitest';
import { hello } from './index.js';

test('api smoke test', () => {
  expect(true).toBe(true);
  expect(hello).toBe('world');
});
