import { Hono } from 'hono';
import { authMiddleware, getUserSupabase } from '../middleware/auth';
import { checkUserLimit } from '../ai/usage';
import { generate } from '../ai/router';
import { checkGrounding, collectNumbers } from '../ai/guardrail';
import { copilotTools, toolDeclarations } from '../ai/tools';
import { UpstreamAiError } from '../errors';

const copilot = new Hono<{ Variables: any }>();

function buildFallbackAnswer(messages: any[]) {
  const toolMsg = [...messages].reverse().find(m => m.role === 'tool');
  if (toolMsg && Array.isArray(toolMsg.content)) {
    const items = toolMsg.content.map((c: any) => JSON.stringify(c.result)).join('\n');
    return `Based on the latest data:\n${items}`;
  }
  return "I'm sorry, I couldn't process that request at this time.";
}

function checkGuardrail(text: string, messages: any[], reqLogger: any) {
  const allowed = collectNumbers(messages);
  const grounding = checkGrounding(text, allowed);
  if (!grounding.grounded) {
    reqLogger.warn({ offending: grounding.offending }, 'Guardrail rejected output');
  }
  return grounding.grounded;
}

copilot.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const reqLogger = c.get('logger');
  
  const limitCheck = await checkUserLimit(userId);
  if (!limitCheck.allowed) {
    return c.json({ error: `Rate limit exceeded: ${limitCheck.reason}`, remaining: limitCheck }, 429);
  }

  const body = await c.req.json();
  const message = body.message;
  let messages = body.history || [];
  
  const systemPrompt = "You are the ESG Copilot. State only numbers returned by tools; if a tool wasn't called, say you don't have it.";
  
  messages = [...messages, { role: 'user', content: message }];
  
  const db = getUserSupabase(c);

  let rounds = 0;
  let finalAnswer = '';
  let modelUsed = '';
  let fallback = false;
  let usedTools: string[] = [];

  while (rounds < 3) {
    try {
      const res = await generate({
        pool: 'copilot',
        system: systemPrompt,
        messages,
        tools: toolDeclarations,
        userId,
        kind: 'copilot'
      });
      
      modelUsed = res.modelUsed;
      
      if (res.toolCalls && res.toolCalls.length > 0) {
        rounds++;
        const toolResults = [];
        
        for (const tc of res.toolCalls as any) {
          usedTools.push(tc.name);
          if (tc.name in copilotTools) {
            const toolFn = copilotTools[tc.name as keyof typeof copilotTools];
            try {
              const data = await toolFn(db, tc.args || {});
              toolResults.push({ callId: tc.id, result: data });
            } catch (err) {
              toolResults.push({ callId: tc.id, result: { error: 'Tool execution failed' } });
            }
          } else {
            toolResults.push({ callId: tc.id, result: { error: 'Unknown tool' } });
          }
        }
        
        messages.push({ role: 'assistant', toolCalls: res.toolCalls });
        messages.push({ role: 'tool', content: toolResults });
        continue;
      } else {
        finalAnswer = res.text;
        break;
      }
    } catch (error) {
      if (error instanceof UpstreamAiError) {
        reqLogger.warn({ err: error }, 'Upstream AI error, using fallback');
      } else {
        reqLogger.error({ err: error }, 'Copilot generation failed');
      }
      fallback = true;
      break;
    }
  }

  if (rounds >= 3 && !finalAnswer && !fallback) {
    fallback = true; // max rounds reached without final answer
  }

  if (fallback || !finalAnswer) {
    finalAnswer = buildFallbackAnswer(messages);
    fallback = true;
  }
  
  const grounded = checkGuardrail(finalAnswer, messages, reqLogger);
  if (!grounded) {
    finalAnswer = buildFallbackAnswer(messages);
    fallback = true;
  }
  
  reqLogger.info({ user_id: userId, usedTools, modelUsed, rounds, cache_hit: false, fallback }, 'Copilot request completed');
  
  return c.json({
    answer: finalAnswer,
    usedTools,
    modelUsed,
    grounded: grounded && !fallback,
    fallback
  });
});

export default copilot;
