import { query, queryOne } from '../db/pool';
import type { InvoiceWithCustomer, PaymentStatus } from '../types/domain';

export interface DashboardSummary {
  total_sales: string;
  total_collected: string;
  total_outstanding: string;
  invoice_count: number;
  paid_count: number;
  partially_paid_count: number;
  pending_count: number;
  customer_count: number;
  item_count: number;
}

export interface CustomerSalesRow {
  customer_id: string;
  customer_name: string;
  status: string;
  invoice_count: number;
  total_sales: string;
  total_paid: string;
  total_pending: string;
}

export interface ItemSalesRow {
  item_id: string | null;
  item_name: string;
  unit: string;
  invoice_count: number;
  quantity_sold: string;
  total_sales: string;
}

export interface PendingPaymentRow {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id: string;
  customer_name: string;
  total_amount: string;
  amount_paid: string;
  amount_pending: string;
  payment_status: PaymentStatus;
  days_outstanding: number;
}

export interface MonthlySalesRow {
  month: string;
  total_sales: string;
  total_collected: string;
}

export async function summary(): Promise<DashboardSummary> {
  const row = await queryOne<DashboardSummary>(`
    SELECT
      COALESCE(SUM(inv.total_amount),   0)::text AS total_sales,
      COALESCE(SUM(inv.amount_paid),    0)::text AS total_collected,
      COALESCE(SUM(inv.amount_pending), 0)::text AS total_outstanding,
      COUNT(inv.id)::int                          AS invoice_count,
      COUNT(*) FILTER (WHERE inv.payment_status = 'paid')::int           AS paid_count,
      COUNT(*) FILTER (WHERE inv.payment_status = 'partially_paid')::int AS partially_paid_count,
      COUNT(*) FILTER (WHERE inv.payment_status = 'pending')::int        AS pending_count,
      (SELECT COUNT(*) FROM customers)::int       AS customer_count,
      (SELECT COUNT(*) FROM items)::int           AS item_count
    FROM invoices inv
  `);
  return (
    row ?? {
      total_sales: '0',
      total_collected: '0',
      total_outstanding: '0',
      invoice_count: 0,
      paid_count: 0,
      partially_paid_count: 0,
      pending_count: 0,
      customer_count: 0,
      item_count: 0,
    }
  );
}

export function customerSales(limit?: number): Promise<CustomerSalesRow[]> {
  return query<CustomerSalesRow>(
    `SELECT c.id                                  AS customer_id,
            c.name                                AS customer_name,
            c.status                              AS status,
            COUNT(inv.id)::int                    AS invoice_count,
            COALESCE(SUM(inv.total_amount),   0)::text AS total_sales,
            COALESCE(SUM(inv.amount_paid),    0)::text AS total_paid,
            COALESCE(SUM(inv.amount_pending), 0)::text AS total_pending
       FROM customers c
       LEFT JOIN invoices inv ON inv.customer_id = c.id
      GROUP BY c.id, c.name, c.status
      HAVING COUNT(inv.id) > 0
      ORDER BY COALESCE(SUM(inv.total_amount), 0) DESC, lower(c.name) ASC
      ${limit ? 'LIMIT $1' : ''}`,
    limit ? [limit] : [],
  );
}

/**
 * Item-wise sales groups by item_id where the item still exists, falling back
 * to the invoiced name so a renamed item still reports under the name the
 * customer was billed under.
 */
export function itemSales(limit?: number): Promise<ItemSalesRow[]> {
  return query<ItemSalesRow>(
    `SELECT li.item_id                             AS item_id,
            COALESCE(i.name, MIN(li.item_name_snapshot)) AS item_name,
            COALESCE(i.unit, MIN(li.item_unit_snapshot)) AS unit,
            COUNT(DISTINCT li.invoice_id)::int     AS invoice_count,
            SUM(li.quantity)::text                 AS quantity_sold,
            SUM(li.line_total)::text               AS total_sales
       FROM invoice_items li
       LEFT JOIN items i ON i.id = li.item_id
      GROUP BY li.item_id, i.name, i.unit
      ORDER BY SUM(li.line_total) DESC, item_name ASC
      ${limit ? 'LIMIT $1' : ''}`,
    limit ? [limit] : [],
  );
}

export function pendingPayments(limit?: number): Promise<PendingPaymentRow[]> {
  return query<PendingPaymentRow>(
    `SELECT inv.id             AS invoice_id,
            inv.invoice_number,
            inv.invoice_date,
            c.id               AS customer_id,
            c.name             AS customer_name,
            inv.total_amount::text,
            inv.amount_paid::text,
            inv.amount_pending::text,
            inv.payment_status,
            GREATEST(0, (CURRENT_DATE - inv.invoice_date))::int AS days_outstanding
       FROM invoices inv
       JOIN customers c ON c.id = inv.customer_id
      WHERE inv.amount_pending > 0
      ORDER BY inv.amount_pending DESC, inv.invoice_date ASC
      ${limit ? 'LIMIT $1' : ''}`,
    limit ? [limit] : [],
  );
}

export function monthlySales(months = 6): Promise<MonthlySalesRow[]> {
  return query<MonthlySalesRow>(
    `WITH span AS (
       SELECT generate_series(
         date_trunc('month', CURRENT_DATE) - make_interval(months => $1::int - 1),
         date_trunc('month', CURRENT_DATE),
         '1 month'
       )::date AS month
     )
     SELECT to_char(span.month, 'YYYY-MM')                    AS month,
            COALESCE(SUM(inv.total_amount), 0)::text          AS total_sales,
            COALESCE(SUM(inv.amount_paid),  0)::text          AS total_collected
       FROM span
       LEFT JOIN invoices inv
         ON date_trunc('month', inv.invoice_date) = span.month
      GROUP BY span.month
      ORDER BY span.month ASC`,
    [months],
  );
}

export function recentInvoices(limit = 6): Promise<InvoiceWithCustomer[]> {
  return query<InvoiceWithCustomer>(
    `SELECT inv.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM invoices inv
       JOIN customers c ON c.id = inv.customer_id
      ORDER BY inv.invoice_date DESC, inv.created_at DESC
      LIMIT $1`,
    [limit],
  );
}
