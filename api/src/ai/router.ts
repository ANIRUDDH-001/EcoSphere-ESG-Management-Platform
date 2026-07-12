import { UpstreamAiError } from '../errors';
import { logger } from '../lib/logger';
import { COPILOT_POOL, SINGLE_SHOT_POOL, ModelSpec } from './models';
import { recordUsage, modelUsageToday } from './usage';
import { mockFixtures } from './fixtures';
import { getConfig } from '../config';
import { downstreamCall } from './downstream';

export type Pool = 'copilot' | 'single_shot';

export interface GenerateArgs {
  pool: Pool;
  system: string;
  messages: unknown[];
  tools?: unknown[];
  userId: string;
  kind: 'copilot' | 'insight' | 'summary';
}

export interface GenerateResult {
  text: string;
  toolCalls?: unknown[];
  modelUsed: string;
  attempts: number;
  mock: boolean;
}

export async function generate(args: GenerateArgs): Promise<GenerateResult> {
  const config = getConfig();

  if (config.MOCK_AI) {
    logger.info({ kind: args.kind, mock: true }, 'Returning MOCK_AI fixture');
    if (args.kind === 'copilot') {
      const last = args.messages[args.messages.length - 1] as any;
      if (last?.role === 'user' && last.content?.toLowerCase().includes('score')) {
        return { text: '', toolCalls: [{ id: 'call_1', name: 'get_org_score', args: {} }], modelUsed: 'mock-copilot', attempts: 1, mock: true };
      }
      if (last?.role === 'tool' && Array.isArray(last.content) && last.content[0]?.result?.overall !== undefined) {
        return { text: `The overall score is ${last.content[0].result.overall}.`, modelUsed: 'mock-copilot', attempts: 1, mock: true };
      }
    } else if (args.kind === 'insight') {
      return {
        text: JSON.stringify({
          summary: 'The overall ESG score is 80.',
          recommendations: ['Resolve 5 overdue issues.']
        }),
        modelUsed: 'mock-single-shot',
        attempts: 1,
        mock: true
      };
    } else if (args.kind === 'summary') {
      return {
        text: JSON.stringify({
          summary: 'The Q3 Sustainability report shows excellent progress.'
        }),
        modelUsed: 'mock-single-shot',
        attempts: 1,
        mock: true
      };
    }
    return mockFixtures[args.kind];
  }

  const pool: ModelSpec[] = args.pool === 'copilot' ? COPILOT_POOL : SINGLE_SHOT_POOL;
  let attempts = 0;

  for (const model of pool) {
    const usage = await modelUsageToday(model.id);
    const rpdRemaining = Math.max(0, model.rpd - usage.rpdUsed);
    const rpmRemaining = Math.max(0, model.rpm - usage.rpmUsed);

    if (rpdRemaining <= 0 || rpmRemaining <= 0) {
      logger.info({ model: model.id, rpdRemaining, rpmRemaining }, 'Model capped, skipping');
      continue;
    }

    attempts++;
    logger.info({ model_chosen: model.id, attempt: attempts, rpd_remaining: rpdRemaining }, 'Attempting model');

    try {
      const result = await downstreamCall(model.id, args);
      
      await recordUsage(args.userId, model.id, args.kind);

      return {
        text: result.text,
        toolCalls: result.toolCalls,
        modelUsed: model.id,
        attempts,
        mock: false
      };
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
      const is5xx = (error?.status >= 500 && error?.status < 600) || error?.message?.includes('500') || error?.message?.includes('503');
      
      if (is429 || is5xx || error?.name === 'Simulated429Error') {
        logger.warn({ model: model.id, error: error.message, hop: attempts }, 'Upstream AI error, failing over');
        await new Promise(res => setTimeout(res, Math.min(100 * Math.pow(2, attempts - 1), 1000)));
        continue;
      }
      
      throw error;
    }
  }

  throw new UpstreamAiError('Whole model pool exhausted or capped');
}
