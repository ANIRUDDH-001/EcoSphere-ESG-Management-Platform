/**
 * vitest.setup.ts
 * Runs before every test file. Sets required environment variables so that
 * supabaseClient.ts can call createClient() without throwing.
 * All real Supabase calls are mocked at the test or module level; these
 * values are never used for real network requests in tests.
 */

// Provide minimal dummy values so createClient() doesn't throw on import.
// Vitest runs in Node where import.meta.env is not available, so supabaseClient.ts
// reads from process.env via its `env` fallback.
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'anon-key-for-tests-only';
