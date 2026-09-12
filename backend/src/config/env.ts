import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment is parsed once, at boot, and fails loudly. A missing
 * DATABASE_URL should stop the process, not surface as a 500 an hour later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  const message = `Invalid environment configuration:\n${issues.join('\n')}`;

  // On a serverless host, process.exit() during module initialisation kills the
  // invocation with no usable message. Throwing puts the reason in the logs.
  if (process.env.VERCEL) throw new Error(message);

  console.error(`\n${message}\n`);
  console.error('Copy .env.example to .env and fill in the values.\n');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
