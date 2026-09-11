import { z } from 'zod';
import { optionalText, requiredText, statusEnum } from './common.js';

const phone = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v.trim() === '' ? null : v.trim()))
  .refine((v) => v === null || /^[\d+][\d\s\-()]{6,19}$/.test(v), {
    message: 'Please enter a valid phone number, for example 98765 43210.',
  });

const email = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v.trim() === '' ? null : v.trim().toLowerCase()))
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: 'Please enter a valid email address, for example name@business.com.',
  });

const gstin = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v.trim() === '' ? null : v.trim().toUpperCase()))
  .refine((v) => v === null || /^[0-9A-Z]{15}$/.test(v), {
    message: 'A GSTIN is 15 characters, for example 27AAPFU0939F1ZV.',
  });

export const createCustomerSchema = z.object({
  name: requiredText('the customer’s name'),
  email,
  phone,
  address: optionalText(400),
  gstin,
  status: statusEnum.default('active'),
});

export const updateCustomerSchema = createCustomerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'There is nothing to update.' },
);

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
