import { z } from 'zod';

export const emissionFactorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  source_type: z.enum(['purchase', 'manufacturing', 'expense', 'fleet', 'energy', 'manual']),
  unit: z.string().min(1, 'Unit is required'),
  factor_kgco2e: z.number().positive('Factor must be greater than 0'),
  reference: z.string().nullable().optional(),
  valid_from: z.string().min(1, 'Valid from date is required'),
  valid_to: z.string().nullable().optional(),
  status: z.string(),
}).refine(data => !data.valid_to || new Date(data.valid_to) >= new Date(data.valid_from), {
  message: "valid_to must be on or after valid_from",
  path: ["valid_to"]
});

export type EmissionFactorFormValues = z.infer<typeof emissionFactorSchema>;

export const productProfileSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  sku: z.string().nullable().optional(),
  carbon_per_unit: z.number().min(0, 'Carbon per unit must be at least 0'),
  recyclable_pct: z.number().min(0).max(100, 'Recyclable % must be between 0 and 100'),
  emission_factor_id: z.string().nullable().optional(),
  certifications: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type ProductProfileFormValues = z.infer<typeof productProfileSchema>;
