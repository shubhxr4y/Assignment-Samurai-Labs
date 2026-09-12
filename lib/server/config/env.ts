import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default(''),
  DATABASE_SSL: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .default('false')
    .transform((v) => v === true || v === 'true'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);
const data = parsed.success
  ? parsed.data
  : {
      NODE_ENV: 'development' as const,
      PORT: 3000,
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      DATABASE_SSL: process.env.DATABASE_SSL === 'true',
      CORS_ORIGIN: '*',
    };

export const env = {
  ...data,
  get DATABASE_URL() {
    return process.env.DATABASE_URL || data.DATABASE_URL || '';
  },
  get DATABASE_SSL() {
    return process.env.DATABASE_SSL === 'true' || data.DATABASE_SSL;
  },
  isProduction: (process.env.NODE_ENV ?? data.NODE_ENV) === 'production',
  corsOrigins: (data.CORS_ORIGIN || '*').split(',').map((o) => o.trim()).filter(Boolean),
};
