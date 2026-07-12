import { expect, test } from 'vitest';
import { getConfig } from './config.js';

test('missing SUPABASE_URL throws naming it', () => {
  const env = {
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    SUPABASE_JWT_SECRET: 'secret',
  };
  expect(() => getConfig(env)).toThrow('Missing required env: SUPABASE_URL');
});

test('all present returns typed object', () => {
  const env = {
    SUPABASE_URL: 'url',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    SUPABASE_JWT_SECRET: 'secret',
  };
  const config = getConfig(env);
  expect(config.SUPABASE_URL).toBe('url');
  expect(config.MOCK_AI).toBe(true);
});

test('MOCK_AI=true means GEMINI_API_KEY is not required', () => {
  const env = {
    SUPABASE_URL: 'url',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    SUPABASE_JWT_SECRET: 'secret',
    MOCK_AI: 'true',
  };
  const config = getConfig(env);
  expect(config.MOCK_AI).toBe(true);
});

test('MOCK_AI=false requires GEMINI_API_KEY', () => {
  const env = {
    SUPABASE_URL: 'url',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    SUPABASE_JWT_SECRET: 'secret',
    MOCK_AI: 'false',
  };
  expect(() => getConfig(env)).toThrow('Missing required env: GEMINI_API_KEY');
});
