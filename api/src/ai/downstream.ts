import { GenerateArgs } from './router.js';

export async function downstreamCall(modelId: string, args: GenerateArgs): Promise<{ text: string, toolCalls?: unknown[] }> {
  throw new Error('Not implemented: downstreamCall');
}
