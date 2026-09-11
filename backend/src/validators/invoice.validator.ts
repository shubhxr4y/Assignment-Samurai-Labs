import { z } from 'zod';
import { amount, optionalText } from './common.js';

const isoDate = z
  .string({ required_error: 'Please choose an invoice date.' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid invoice date.')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Please choose a valid invoice date.');

const invoiceLineSchema = z.object({
  item_id: z.string().uuid('Please pick an item for every line.'),
  /** Snapshot overrides — the user may edit price/tax on the invoice itself. */
  quantity: amount('Quantity', { min: 0, max: 999_999 }).refine((v) => Number(v) > 0, {
    message: 'Quantity must be more than zero.',
  }),
  unit_price: amount('Unit price').optional(),
  tax_rate: amount('Tax rate', { max: 100 }).optional(),
});

export const createInvoiceSchema = z.object({
  invoice_number: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null || v.trim() === '' ? null : v.trim()))
    .refine((v) => v === null || v.length <= 40, {
      message: 'Invoice number is too long (max 40 characters).',
    }),
  customer_id: z.string({ required_error: 'Please select a customer.' })
    .uuid('Please select a customer.'),
  invoice_date: isoDate,
  notes: optionalText(1000),
  items: z
    .array(invoiceLineSchema, { required_error: 'Please add at least one item to the invoice.' })
    .min(1, 'Please add at least one item to the invoice.')
    .max(100, 'An invoice can hold up to 100 lines.'),
  amount_paid: amount('Amount received').default('0'),
});

export const updateInvoiceSchema = createInvoiceSchema;

export const recordPaymentSchema = z
  .object({
    /** Absolute amount received so far on this invoice. */
    amount_paid: amount('Amount received').optional(),
    /** Convenience for the "Mark as paid" button. */
    mark_as: z.enum(['paid', 'pending']).optional(),
  })
  .refine((data) => data.amount_paid !== undefined || data.mark_as !== undefined, {
    message: 'Please enter the amount received.',
  });

export const invoiceListQuery = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['pending', 'partially_paid', 'paid', 'all']).default('all'),
  customer_id: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(['invoice_date', 'invoice_number', 'total_amount', 'amount_pending', 'customer_name'])
    .default('invoice_date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuery>;
