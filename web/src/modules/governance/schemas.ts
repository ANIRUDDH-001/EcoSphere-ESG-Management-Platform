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

export const auditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department_id: z.string().min(1, 'Department is required'),
  auditor_id: z.string().min(1, 'Auditor is required'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
});

export type AuditFormValues = z.infer<typeof auditSchema>;

export const auditCompleteSchema = z.object({
  result: z.enum(['pass', 'fail', 'partial']),
  findings: z.string().optional(),
  completed_date: z.string().min(1, 'Completed date is required'),
});

export type AuditCompleteFormValues = z.infer<typeof auditCompleteSchema>;
