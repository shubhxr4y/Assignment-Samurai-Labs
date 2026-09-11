import { z } from 'zod';
import { amount, optionalText, requiredText, statusEnum } from './common.js';

export const createItemSchema = z.object({
  name: requiredText('the item name'),
  description: optionalText(500),
  unit: z.string().trim().min(1).max(20).default('unit'),
  unit_price: amount('Unit price'),
  tax_rate: amount('Tax rate', { max: 100 }).default('0'),
  status: statusEnum.default('active'),
});

export const updateItemSchema = createItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'There is nothing to update.' },
);

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
