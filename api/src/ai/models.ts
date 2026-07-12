export interface ModelSpec {
  id: string;
  rpm: number;
  rpd: number;
  tpm: number;
  tools: boolean;
}

// Exact model IDs verified against the live Gemini console.
export const COPILOT_POOL: ModelSpec[] = [
  { id: 'gemini-3.1-flash-lite', rpm: 15, rpd: 500, tpm: 250000, tools: true },
  { id: 'gemini-3.5-flash', rpm: 5, rpd: 20, tpm: 250000, tools: true },
  { id: 'gemini-3-flash', rpm: 5, rpd: 20, tpm: 250000, tools: true },
  { id: 'gemini-2.5-flash', rpm: 5, rpd: 20, tpm: 250000, tools: true },
  { id: 'gemini-2.5-flash-lite', rpm: 10, rpd: 20, tpm: 250000, tools: true },
];

export const SINGLE_SHOT_POOL: ModelSpec[] = [
  { id: 'gemma-4-31b', rpm: 15, rpd: 1500, tpm: Number.POSITIVE_INFINITY, tools: false },
  { id: 'gemma-4-26b', rpm: 15, rpd: 1500, tpm: Number.POSITIVE_INFINITY, tools: false },
];

export const GEN_CONFIG = {
  temperature: 0.2,
  maxOutputTokens: 1024,
};
