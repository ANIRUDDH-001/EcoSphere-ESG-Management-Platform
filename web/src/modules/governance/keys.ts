export const govKeys = {
  policies: ['gov', 'policies'] as const,
  policy: (id: string) => ['gov', 'policy', id] as const,
  acknowledgements: ['gov', 'acknowledgements'] as const,
  audits: ['gov', 'audits'] as const,
  audit: (id: string) => ['gov', 'audit', id] as const,
  issues: ['gov', 'issues'] as const,
  issue: (id: string) => ['gov', 'issue', id] as const,
};
