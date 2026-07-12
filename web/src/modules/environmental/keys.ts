export const envKeys = {
  factors: ['env', 'factors'] as const,
  factor: (id: string) => ['env', 'factor', id] as const,
  products: ['env', 'products'] as const,
  goals: ['env', 'goals'] as const,
  carbon: (f: any) => ['env', 'carbon', f] as const,
};
