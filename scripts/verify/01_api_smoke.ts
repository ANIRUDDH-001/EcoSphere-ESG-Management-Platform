import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
const API_URL = 'http://localhost:8080';

const signToken = (role: string) => {
  return jwt.sign({
    role,
    iss: 'supabase',
    ref: 'pftpbfwqkprzxwpsyfxv',
    aud: 'authenticated',
    sub: '00000000-0000-0000-0000-000000000000',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }, JWT_SECRET);
};

async function run() {
  console.log('--- Starting API Smoke Tests ---');

  // 1. Health
  const res1 = await fetch(`${API_URL}/health`);
  const json1 = await res1.json();
  if (json1.status !== 'ok') {
    console.error('FAIL: Health check failed', json1);
    process.exit(1);
  }
  console.log('OK: Health check');

  // 2. /me without token
  const res2 = await fetch(`${API_URL}/me`);
  if (res2.status !== 401) {
    console.error('FAIL: /me without token returned', res2.status);
    process.exit(1);
  }
  console.log('OK: /me 401 without token');

  // 3. /me with employee token
  const empToken = signToken('employee');
  const res3 = await fetch(`${API_URL}/me`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  const json3 = await res3.json();
  if (json3.role !== 'employee') {
    console.error('FAIL: Employee /me role is not employee', json3);
    process.exit(1);
  }
  console.log('OK: Employee /me (RLS forwarded)');

  // 4. /metrics with admin token
  const admToken = signToken('admin');
  const res4 = await fetch(`${API_URL}/metrics`, {
    headers: { 'Authorization': `Bearer ${admToken}` }
  });
  if (!res4.ok) {
    console.error('FAIL: Admin /metrics returned', res4.status);
    process.exit(1);
  }
  const json4 = await res4.json();
  // metrics will return { metrics: 'placeholder' } currently
  if (!json4.metrics) {
    console.error('FAIL: Metrics JSON invalid', json4);
    process.exit(1);
  }
  console.log('OK: Admin /metrics');

  // 5. metrics guarded for employee
  const res5 = await fetch(`${API_URL}/metrics`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  if (res5.status !== 401) { // authMiddleware returns 401 on AuthError
    console.error('FAIL: Employee could access /metrics', res5.status);
    process.exit(1);
  }
  console.log('OK: Employee /metrics guarded');

  console.log('--- API Smoke Tests PASSED ---');
}

run();
