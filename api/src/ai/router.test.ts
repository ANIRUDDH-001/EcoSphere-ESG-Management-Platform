import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generate, GenerateArgs } from './router';
import * as usageModule from './usage';
import * as downstreamModule from './downstream';
import * as configModule from '../config';
import { UpstreamAiError } from '../errors';

vi.mock('./usage', () => ({
  modelUsageToday: vi.fn(),
  recordUsage: vi.fn()
}));

vi.mock('./downstream', () => ({
  downstreamCall: vi.fn()
}));

vi.mock('../config', () => ({
  getConfig: vi.fn()
}));

describe('Gemini Model Router', () => {
  const baseArgs: GenerateArgs = {
    pool: 'copilot',
    system: 'test',
    messages: [],
    userId: 'user-1',
    kind: 'copilot'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('honours MOCK_AI=true and returns fixture without network call or usage record', async () => {
    vi.mocked(configModule.getConfig).mockReturnValue({ MOCK_AI: true } as any);
    
    const res = await generate(baseArgs);
    
    expect(res.mock).toBe(true);
    expect(res.text).toContain('mock');
    expect(downstreamModule.downstreamCall).not.toHaveBeenCalled();
    expect(usageModule.recordUsage).not.toHaveBeenCalled();
  });

  describe('Real AI mode', () => {
    beforeEach(() => {
      vi.mocked(configModule.getConfig).mockReturnValue({ MOCK_AI: false } as any);
    });

    it('picks primary when it has headroom and records usage', async () => {
      vi.mocked(usageModule.modelUsageToday).mockResolvedValue({ rpdUsed: 0, rpmUsed: 0 });
      vi.mocked(downstreamModule.downstreamCall).mockResolvedValue({ text: 'success' });
      
      const res = await generate(baseArgs);
      
      expect(res.text).toBe('success');
      expect(res.modelUsed).toBe('gemini-3.1-flash-lite');
      expect(res.attempts).toBe(1);
      
      expect(downstreamModule.downstreamCall).toHaveBeenCalledTimes(1);
      expect(downstreamModule.downstreamCall).toHaveBeenCalledWith('gemini-3.1-flash-lite', baseArgs);
      
      expect(usageModule.recordUsage).toHaveBeenCalledTimes(1);
      expect(usageModule.recordUsage).toHaveBeenCalledWith('user-1', 'gemini-3.1-flash-lite', 'copilot');
    });

    it('skips a model at RPD cap and uses the next', async () => {
      vi.mocked(usageModule.modelUsageToday)
        .mockResolvedValueOnce({ rpdUsed: 500, rpmUsed: 0 }) // primary cap
        .mockResolvedValueOnce({ rpdUsed: 0, rpmUsed: 0 });  // second ok
      
      vi.mocked(downstreamModule.downstreamCall).mockResolvedValue({ text: 'success' });
      
      const res = await generate(baseArgs);
      
      expect(res.modelUsed).toBe('gemini-3.5-flash');
      expect(res.attempts).toBe(1); // First attempt in the loop where it actually tries a model
      expect(downstreamModule.downstreamCall).toHaveBeenCalledWith('gemini-3.5-flash', baseArgs);
    });

    it('simulated 429 on model[0] -> fails over to model[1], attempts increment', async () => {
      vi.useFakeTimers();
      vi.mocked(usageModule.modelUsageToday).mockResolvedValue({ rpdUsed: 0, rpmUsed: 0 });
      
      vi.mocked(downstreamModule.downstreamCall)
        .mockRejectedValueOnce(Object.assign(new Error('429 Too Many Requests'), { status: 429 }))
        .mockResolvedValueOnce({ text: 'success2' });
      
      const promise = generate(baseArgs);
      await vi.runAllTimersAsync();
      const res = await promise;
      
      expect(res.modelUsed).toBe('gemini-3.5-flash');
      expect(res.attempts).toBe(2);
      expect(res.text).toBe('success2');
      
      expect(usageModule.recordUsage).toHaveBeenCalledTimes(1);
      expect(usageModule.recordUsage).toHaveBeenCalledWith('user-1', 'gemini-3.5-flash', 'copilot');
    });

    it('whole pool exhausted -> throws UpstreamAiError', async () => {
      vi.useFakeTimers();
      vi.mocked(usageModule.modelUsageToday).mockResolvedValue({ rpdUsed: 0, rpmUsed: 0 });
      vi.mocked(downstreamModule.downstreamCall).mockRejectedValue(Object.assign(new Error('429'), { status: 429 }));
      
      const promise = generate(baseArgs);
      promise.catch(() => {}); // Prevent unhandled rejection warning
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow(UpstreamAiError);
    });
  });
});
