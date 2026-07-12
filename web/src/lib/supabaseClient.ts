import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const env = (typeof process !== 'undefined' && process.env) || (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
