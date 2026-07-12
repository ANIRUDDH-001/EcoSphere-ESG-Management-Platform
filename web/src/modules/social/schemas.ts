import { z } from 'zod/v4';

const numberField = (min: number, max: number, label: string) =>
  z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ error: `${label} must be a number` }).min(min).max(max),
  );

export const csrActivitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category_id: z.string().min(1, 'Category is required'),
  department_id: z.string().min(1, 'Department is required'),
  description: z.string().optional(),
  activity_date: z.string().min(1, 'Date is required'),
  location: z.string().optional(),
  points: numberField(0, 10000, 'Points'),
  capacity: numberField(1, 10000, 'Capacity'),
  status: z.enum(['active', 'inactive']),
});

export type CsrActivityFormValues = z.infer<typeof csrActivitySchema>;

export const diversityMetricSchema = z.object({
  department_id: z.string().min(1, 'Department is required'),
  period: z.string().min(1, 'Period is required (e.g. 2024-Q1)'),
  gender_ratio: numberField(0, 1, 'Gender Ratio'),
  avg_tenure: numberField(0, 100, 'Average Tenure'),
  training_hours: numberField(0, 100000, 'Training Hours'),
  headcount: numberField(1, 1000000, 'Headcount'),
});

export type DiversityMetricFormValues = z.infer<typeof diversityMetricSchema>;

export const trainingCompletionSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  course_name: z.string().min(1, 'Course name is required').max(200),
  completion_pct: numberField(0, 100, 'Completion percentage'),
  completed_at: z.string().min(1, 'Completion date is required'),
});

export type TrainingCompletionFormValues = z.infer<typeof trainingCompletionSchema>;

