import { supabaseClient } from '../../lib/supabaseClient';
import { logger } from '../../lib/logger';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
  fallback?: boolean;
}

export async function postCopilot(message: string, history: { role: string, content: string }[]): Promise<CopilotMessage> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
  
  const res = await fetch(`${apiUrl}/copilot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    },
    body: JSON.stringify({ message, history })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    const requestId = res.headers.get('x-request-id');
    logger.error({ status: res.status, requestId, body: errorBody }, 'Copilot API error');
    throw new Error(`Copilot API error: ${res.status}`);
  }

  const json = await res.json();
  return {
    role: 'assistant',
    content: json.answer,
    tools: json.usedTools || [],
    fallback: json.fallback || false
  };
}
