/**
 * web=public only, api=secrets, human-injected
 */
import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1, "Required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Required"),
  SUPABASE_JWT_SECRET: z.string().min(1, "Required"),
  GEMINI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  MOCK_AI: z.string().optional().default('true').transform(v => v === 'true'),
  AI_MINUTE_LIMIT: z.coerce.number().default(10),
  AI_DAILY_LIMIT: z.coerce.number().default(150),
  PORT: z.coerce.number().default(8080),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
}).superRefine((data, ctx) => {
  if (!data.MOCK_AI && !data.GEMINI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Required',
      path: ['GEMINI_API_KEY'],
    });
  }
});

export type Config = z.infer<typeof envSchema>;

let cachedConfig: Config | null = null;

export function getConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Config {
  if (cachedConfig && env === process.env) {
    return cachedConfig;
  }

  const result = envSchema.safeParse(env);

  if (!result.success) {
    const missing = result.error.issues.map((e) => e.path.join('.')).join(', ');
    throw new Error(`Missing required env: ${missing}`);
  }

  if (env === process.env) {
    cachedConfig = result.data;
  }
  
  return result.data;
}
