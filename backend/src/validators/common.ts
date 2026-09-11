import { z } from 'zod';

export const uuidParam = z.object({
  id: z.string().uuid('That link looks wrong. Please go back and try again.'),
});

export const statusEnum = z.enum(['active', 'inactive'], {
  errorMap: () => ({ message: 'Status must be either Active or Inactive.' }),
});

/** Trimmed, non-empty string with a friendly message. */
export const requiredText = (label: string, max = 200) =>
  z
    .string({ required_error: `Please enter ${label}.`, invalid_type_error: `Please enter ${label}.` })
    .trim()
    .min(1, `Please enter ${label}.`)
    .max(max, `${label[0]?.toUpperCase()}${label.slice(1)} is too long (max ${max} characters).`);

/** Optional text: empty string and null both collapse to null. */
export const optionalText = (max = 500, message?: string) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null || v.trim() === '' ? null : v.trim()))
    .refine((v) => v === null || v.length <= max, {
      message: message ?? `That is too long (max ${max} characters).`,
    });

/**
 * A rupee amount as a decimal string or number. Kept as a *string* all the way
 * to the money helpers so no float ever touches it.
 */
export const amount = (label: string, { min = 0, max = 99_999_999_999 } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim().replace(/,/g, ''))
    .refine((v) => v !== '' && /^\d+(\.\d{1,2})?$/.test(v), {
      message: `${label} must be a number with up to two decimals, and cannot be negative.`,
    })
    .refine((v) => Number(v) >= min, { message: `${label} cannot be less than ${min}.` })
    .refine((v) => Number(v) <= max, { message: `${label} is too large.` });

export const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  sort: z.string().trim().max(40).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListQuery = z.infer<typeof listQuery>;
