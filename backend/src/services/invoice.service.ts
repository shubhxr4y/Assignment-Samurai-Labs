import { withTransaction } from '../db/pool.js';
import * as invoiceRepo from '../repositories/invoice.repository.js';
import * as itemRepo from '../repositories/item.repository.js';
import * as customerRepo from '../repositories/customer.repository.js';
import { ApiError } from '../utils/api-error.js';
import { calculateLine, fromPaise, sumLines, toPaise, type LineAmounts } from '../utils/money.js';
import { buildInvoiceNumber, financialYearLabel, INVOICE_PREFIX, parseSequence } from '../utils/invoice-number.js';
import type { CreateInvoiceInput, InvoiceListQuery, RecordPaymentInput } from '../validators/invoice.validator.js';

export const listInvoices = (params: InvoiceListQuery) => invoiceRepo.list(params);

export async function getInvoice(id: string) {
  const invoice = await invoiceRepo.findDetail(id);
  if (!invoice) throw ApiError.notFound('We could not find that invoice.');
  return invoice;
}

/** Suggests the next number in the current financial-year series. */
export async function suggestInvoiceNumber(dateInput?: string) {
  const date = dateInput ? new Date(`${dateInput}T00:00:00Z`) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const fy = financialYearLabel(safeDate);
  const existing = await invoiceRepo.numbersWithPrefix(`${INVOICE_PREFIX}-${fy}-`);
  const highest = existing.reduce((max, number) => Math.max(max, parseSequence(number, fy)), 0);
  return { invoice_number: buildInvoiceNumber(highest + 1, safeDate) };
}

interface BuiltLines {
  lines: invoiceRepo.InvoiceLineWrite[];
  totals: ReturnType<typeof sumLines>;
}

/**
 * Turns the submitted lines into priced, snapshotted invoice lines.
 *
 * The unit price and tax rate on the request are treated as *overrides* the
 * user typed on the invoice; when absent we fall back to the item's current
 * values. Either way the resulting numbers are frozen onto the invoice line,
 * and every amount is recomputed here — the client's totals are never trusted.
 */
async function buildLines(input: CreateInvoiceInput): Promise<BuiltLines> {
  const requestedIds = [...new Set(input.items.map((line) => line.item_id))];
  const items = await itemRepo.findManyByIds(requestedIds);
  const byId = new Map(items.map((item) => [item.id, item]));

  const missing = requestedIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw ApiError.validation(
      'One of the items on this invoice no longer exists. Please remove it and pick another.',
    );
  }

  const inactive = items.filter((item) => item.status === 'inactive');
  if (inactive.length > 0) {
    throw ApiError.validation(
      `“${inactive[0]!.name}” is marked inactive and cannot be added to an invoice. Reactivate it from Items, or choose a different item.`,
    );
  }

  const amounts: LineAmounts[] = [];
  const lines: invoiceRepo.InvoiceLineWrite[] = input.items.map((line, index) => {
    const item = byId.get(line.item_id)!;
    const unitPrice = line.unit_price ?? item.unit_price;
    const taxRate = line.tax_rate ?? item.tax_rate;
    const computed = calculateLine({ quantity: line.quantity, unitPrice, taxRate });
    amounts.push(computed);

    return {
      item_id: item.id,
      item_name_snapshot: item.name,
      item_unit_snapshot: item.unit,
      quantity: line.quantity,
      unit_price: fromPaise(toPaise(unitPrice)),
      tax_rate: String(taxRate),
      line_subtotal: fromPaise(computed.lineSubtotal),
      tax_amount: fromPaise(computed.taxAmount),
      line_total: fromPaise(computed.lineTotal),
      line_no: index + 1,
    };
  });

  return { lines, totals: sumLines(amounts) };
}

async function assertCustomerUsable(customerId: string, { isNew }: { isNew: boolean }) {
  const customer = await customerRepo.findById(customerId);
  if (!customer) throw ApiError.validation('Please select a customer.');
  if (isNew && customer.status === 'inactive') {
    throw ApiError.validation(
      `${customer.name} is marked inactive. Reactivate the customer to raise a new invoice for them.`,
    );
  }
  return customer;
}

async function resolveInvoiceNumber(input: CreateInvoiceInput, excludeId?: string) {
  const number = input.invoice_number ?? (await suggestInvoiceNumber(input.invoice_date)).invoice_number;
  if (await invoiceRepo.numberExists(number, excludeId)) {
    throw ApiError.conflict(
      `Invoice number ${number} is already in use. Try the next one in your series.`,
      'DUPLICATE_INVOICE_NUMBER',
    );
  }
  return number;
}

export async function createInvoice(input: CreateInvoiceInput) {
  await assertCustomerUsable(input.customer_id, { isNew: true });
  const { lines, totals } = await buildLines(input);

  const amountPaid = toPaise(input.amount_paid);
  if (amountPaid > totals.totalAmount) {
    throw ApiError.validation(
      'The amount received is more than the invoice total. Enter the amount actually received, or leave it blank.',
      { amount_paid: 'The amount received cannot be more than the invoice total.' },
    );
  }

  const invoiceNumber = await resolveInvoiceNumber(input);

  const created = await withTransaction(async (client) => {
    const invoice = await invoiceRepo.insertInvoice(client, {
      invoice_number: invoiceNumber,
      customer_id: input.customer_id,
      invoice_date: input.invoice_date,
      notes: input.notes,
      subtotal: fromPaise(totals.subtotal),
      tax_amount: fromPaise(totals.taxAmount),
      total_amount: fromPaise(totals.totalAmount),
      amount_paid: fromPaise(amountPaid),
    });
    await invoiceRepo.replaceLines(client, invoice.id, lines);
    return invoice;
  });

  return getInvoice(created.id);
}

/**
 * Editing an invoice replaces its lines wholesale and recalculates the totals.
 * If the new total drops below what has already been received, we stop and ask
 * the user to correct the payment first rather than silently creating a credit.
 */
export async function updateInvoice(id: string, input: CreateInvoiceInput) {
  const existing = await invoiceRepo.findById(id);
  if (!existing) throw ApiError.notFound('We could not find that invoice.');

  await assertCustomerUsable(input.customer_id, { isNew: existing.customer_id !== input.customer_id });
  const { lines, totals } = await buildLines(input);

  const amountPaid = toPaise(input.amount_paid);
  if (amountPaid > totals.totalAmount) {
    throw ApiError.validation(
      `This invoice now totals ₹${fromPaise(totals.totalAmount)}, which is less than the ₹${fromPaise(amountPaid)} already recorded as received. Lower the amount received, or add the missing items back.`,
      { amount_paid: 'The amount received cannot be more than the invoice total.' },
    );
  }

  const invoiceNumber = await resolveInvoiceNumber(input, id);

  await withTransaction(async (client) => {
    const updated = await invoiceRepo.updateInvoiceHeader(client, id, {
      invoice_number: invoiceNumber,
      customer_id: input.customer_id,
      invoice_date: input.invoice_date,
      notes: input.notes,
      subtotal: fromPaise(totals.subtotal),
      tax_amount: fromPaise(totals.taxAmount),
      total_amount: fromPaise(totals.totalAmount),
      amount_paid: fromPaise(amountPaid),
    });
    if (!updated) throw ApiError.notFound('We could not find that invoice.');
    await invoiceRepo.replaceLines(client, id, lines);
  });

  return getInvoice(id);
}

export async function recordPayment(id: string, input: RecordPaymentInput) {
  const invoice = await invoiceRepo.findById(id);
  if (!invoice) throw ApiError.notFound('We could not find that invoice.');

  const total = toPaise(invoice.total_amount);
  let amountPaid: bigint;

  if (input.mark_as === 'paid') {
    amountPaid = total;
  } else if (input.mark_as === 'pending') {
    amountPaid = 0n;
  } else {
    amountPaid = toPaise(input.amount_paid!);
  }

  if (amountPaid < 0n) {
    throw ApiError.validation('The amount received cannot be negative.', {
      amount_paid: 'Enter zero or more.',
    });
  }
  if (amountPaid > total) {
    throw ApiError.validation(
      'The amount received is more than the invoice total. Record only what you have actually received.',
      { amount_paid: 'The amount received cannot be more than the invoice total.' },
    );
  }

  const updated = await invoiceRepo.setAmountPaid(id, fromPaise(amountPaid));
  if (!updated) throw ApiError.notFound('We could not find that invoice.');
  return getInvoice(id);
}

export async function deleteInvoice(id: string) {
  const deleted = await invoiceRepo.remove(id);
  if (!deleted) throw ApiError.notFound('We could not find that invoice.');
}
