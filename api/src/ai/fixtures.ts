import { GenerateResult } from './router';

export const mockFixtures: Record<'copilot' | 'insight' | 'summary', GenerateResult> = {
  copilot: {
    text: "This is a mock copilot response.",
    modelUsed: 'mock-copilot-model',
    attempts: 1,
    mock: true
  },
  insight: {
    text: "This is a mock insight response.",
    modelUsed: 'mock-insight-model',
    attempts: 1,
    mock: true
  },
  summary: {
    text: "This is a mock summary response.",
    modelUsed: 'mock-summary-model',
    attempts: 1,
    mock: true
  }
};
