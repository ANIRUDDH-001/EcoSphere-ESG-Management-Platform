import { Context, Next } from 'hono';
import * as jose from 'jose';
import { AuthError } from '../errors.js';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!JWT_SECRET) {
  console.warn('Missing SUPABASE_JWT_SECRET');
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) throw new AuthError('Missing token');

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    
    c.set('userId', payload.sub);
    c.set('role', payload.role);
    c.set('token', token);
  } catch (error: any) {
    console.error('JWT VERIFY FAILED:', error);
    throw new AuthError('Invalid token');
  }
  
  await next();
};

export const getUserSupabase = (c: Context) => {
  const token = c.get('token');
  if (!token) throw new AuthError('No token in context');
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};
