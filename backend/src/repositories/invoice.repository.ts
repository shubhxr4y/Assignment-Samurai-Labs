import type { PoolClient } from 'pg';
import { query, queryOne } from '../db/pool.js';
import type { Invoice, InvoiceDetail, InvoiceLine, InvoiceWithCustomer } from '../types/domain.js';
import type { InvoiceListQuery } from '../validators/invoice.validator.js';

const LIST_SELECT = `
  SELECT inv.*,
         c.name    AS customer_name,
         c.email   AS customer_email,
         c.phone   AS customer_phone
    FROM invoices inv
    JOIN customers c ON c.id = inv.customer_id
`;

const SORTABLE: Record<InvoiceListQuery['sort'], string> = {
  invoice_date: 'inv.invoice_date',
  invoice_number: 'lower(inv.invoice_number)',
  total_amount: 'inv.total_amount',
  amount_pending: 'inv.amount_pending',
  customer_name: 'lower(c.name)',
};

export async function list(
  params: InvoiceListQuery,
): Promise<{ rows: InvoiceWithCustomer[]; total: number }> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (params.status !== 'all') {
    values.push(params.status);
    where.push(`inv.payment_status = $${values.length}`);
  }
  if (params.customer_id) {
    values.push(params.customer_id);
    where.push(`inv.customer_id = $${values.length}`);
  }
  if (params.from) {
    values.push(params.from);
    where.push(`inv.invoice_date >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`inv.invoice_date <= $${values.length}`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    const idx = values.length;
    where.push(`(inv.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const direction = params.order === 'asc' ? 'ASC' : 'DESC';

  const rows = await query<InvoiceWithCustomer>(
    `${LIST_SELECT} ${whereSql}
      ORDER BY ${SORTABLE[params.sort]} ${direction}, inv.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, params.limit, params.offset],
  );

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM invoices inv JOIN customers c ON c.id = inv.customer_id ${whereSql}`,
    values,
  );

  return { rows, total: Number(totalRow?.count ?? 0) };
}

export async function findDetail(id: string): Promise<InvoiceDetail | null> {
  const invoice = await queryOne<InvoiceDetail>(
    `SELECT inv.*,
            c.name    AS customer_name,
            c.email   AS customer_email,
            c.phone   AS customer_phone,
            c.address AS customer_address,
            c.gstin   AS customer_gstin,
            c.status  AS customer_status
       FROM invoices inv
       JOIN customers c ON c.id = inv.customer_id
      WHERE inv.id = $1`,
    [id],
  );
  if (!invoice) return null;

  invoice.items = await query<InvoiceLine>(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY line_no ASC, created_at ASC`,
    [id],
  );
  return invoice;
}

export function findById(id: string): Promise<Invoice | null> {
  return queryOne<Invoice>(`SELECT * FROM invoices WHERE id = $1`, [id]);
}

export interface InvoiceHeaderWrite {
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  notes: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
}

export function insertInvoice(client: PoolClient, data: InvoiceHeaderWrite): Promise<Invoice> {
  return client
    .query<Invoice>(
      `INSERT INTO invoices
         (invoice_number, customer_id, invoice_date, notes,
          subtotal, tax_amount, total_amount, amount_paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.invoice_number,
        data.customer_id,
        data.invoice_date,
        data.notes,
        data.subtotal,
        data.tax_amount,
        data.total_amount,
        data.amount_paid,
      ],
    )
    .then((r) => r.rows[0]!);
}

export function updateInvoiceHeader(
  client: PoolClient,
  id: string,
  data: InvoiceHeaderWrite,
): Promise<Invoice | null> {
  return client
    .query<Invoice>(
      `UPDATE invoices
          SET invoice_number = $2, customer_id = $3, invoice_date = $4, notes = $5,
              subtotal = $6, tax_amount = $7, total_amount = $8, amount_paid = $9
        WHERE id = $1
        RETURNING *`,
      [
        id,
        data.invoice_number,
        data.customer_id,
        data.invoice_date,
        data.notes,
        data.subtotal,
        data.tax_amount,
        data.total_amount,
        data.amount_paid,
      ],
    )
    .then((r) => r.rows[0] ?? null);
}

export interface InvoiceLineWrite {
  item_id: string;
  item_name_snapshot: string;
  item_unit_snapshot: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  line_subtotal: string;
  tax_amount: string;
  line_total: string;
  line_no: number;
}

export async function replaceLines(
  client: PoolClient,
  invoiceId: string,
  lines: readonly InvoiceLineWrite[],
): Promise<void> {
  await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);

  if (lines.length === 0) return;

  const columns = 10;
  const placeholders = lines
    .map((_, row) =>
      `($1, ${Array.from({ length: columns }, (_, col) => `$${2 + row * columns + col}`).join(', ')})`,
    )
    .join(', ');

  const values: unknown[] = [invoiceId];
  for (const line of lines) {
    values.push(
      line.item_id,
      line.item_name_snapshot,
      line.item_unit_snapshot,
      line.quantity,
      line.unit_price,
      line.tax_rate,
      line.line_subtotal,
      line.tax_amount,
      line.line_total,
      line.line_no,
    );
  }

  await client.query(
    `INSERT INTO invoice_items
       (invoice_id, item_id, item_name_snapshot, item_unit_snapshot, quantity,
        unit_price, tax_rate, line_subtotal, tax_amount, line_total, line_no)
     VALUES ${placeholders}`,
    values,
  );
}

export function setAmountPaid(id: string, amountPaid: string): Promise<Invoice | null> {
  return queryOne<Invoice>(
    `UPDATE invoices SET amount_paid = $2 WHERE id = $1 RETURNING *`,
    [id, amountPaid],
  );
}

export async function remove(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM invoices WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

/** All invoice numbers already used in a given series, e.g. "INV-2026-27-". */
export async function numbersWithPrefix(prefix: string): Promise<string[]> {
  const rows = await query<{ invoice_number: string }>(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1`,
    [`${prefix}%`],
  );
  return rows.map((r) => r.invoice_number);
}

export async function numberExists(invoiceNumber: string, excludeId?: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM invoices WHERE lower(invoice_number) = lower($1) AND ($2::uuid IS NULL OR id <> $2)`,
    [invoiceNumber, excludeId ?? null],
  );
  return row !== null;
}
