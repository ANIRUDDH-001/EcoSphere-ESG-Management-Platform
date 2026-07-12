import { supabaseClient } from '../../lib/supabaseClient';
import { logger } from '../../lib/logger';

export interface InsightResponse {
  summary: string;
  recommendations: string[];
  fallback: boolean;
  cached: boolean;
}

export async function postInsights(scope: string = 'org'): Promise<InsightResponse> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
  
  const res = await fetch(`${apiUrl}/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({ scope })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    logger.error({ status: res.status, body: errorBody }, 'Insights API error');
    throw new Error(`Insights API error: ${res.status}`);
  }

  return res.json();
}
