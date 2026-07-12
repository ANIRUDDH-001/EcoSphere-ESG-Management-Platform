import { z } from 'zod';

export const policySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  pillar: z.enum(['environmental', 'social', 'governance']),
  body: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  effective_date: z.string().min(1, 'Effective date is required'),
  requires_ack: z.boolean(),
  owner_id: z.string().optional().nullable(),
  status: z.string(),
});

export type PolicyFormValues = z.infer<typeof policySchema>;
