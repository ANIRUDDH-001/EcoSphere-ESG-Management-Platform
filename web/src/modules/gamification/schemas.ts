import { z } from 'zod/v4';

const numberField = (min: number, max: number, label: string) =>
  z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ error: `${label} must be a number` }).min(min).max(max),
  );

export const challengeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category_id: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  xp: numberField(0, 10000, 'XP'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  evidence_required: z.boolean().default(true),
  deadline: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'under_review', 'completed', 'archived']),
});

export type ChallengeFormValues = z.infer<typeof challengeSchema>;

export const rewardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  points_required: numberField(1, 100000, 'Points required'),
  stock: numberField(0, 100000, 'Stock'),
  status: z.enum(['active', 'inactive']),
});

export type RewardFormValues = z.infer<typeof rewardSchema>;
