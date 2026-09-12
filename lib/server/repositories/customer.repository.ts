import { query, queryOne } from '../db/pool';
import type { Customer, CustomerWithStats } from '../types/domain';
import type { ListQuery } from '../validators/common';
import type { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';

/**
 * Customer rows always come back with their sales roll-up attached: the list
 * screen shows total sales per customer, and doing it in one query keeps the
 * page off the N+1 path.
 */
const WITH_STATS = `
  SELECT c.*,
         COALESCE(s.invoice_count, 0)::int        AS invoice_count,
         COALESCE(s.total_sales,   0)::text       AS total_sales,
         COALESCE(s.total_pending, 0)::text       AS total_pending
    FROM customers c
    LEFT JOIN (
      SELECT customer_id,
             COUNT(*)            AS invoice_count,
             SUM(total_amount)   AS total_sales,
             SUM(amount_pending) AS total_pending
        FROM invoices
       GROUP BY customer_id
    ) s ON s.customer_id = c.id
`;

const SORTABLE: Record<string, string> = {
  name: 'lower(c.name)',
  created_at: 'c.created_at',
  total_sales: 'COALESCE(s.total_sales, 0)',
  total_pending: 'COALESCE(s.total_pending, 0)',
  invoice_count: 'COALESCE(s.invoice_count, 0)',
};

export async function list(params: ListQuery): Promise<{ rows: CustomerWithStats[]; total: number }> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (params.status !== 'all') {
    values.push(params.status);
    where.push(`c.status = $${values.length}`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    const i = values.length;
    where.push(`(c.name ILIKE $${i} OR c.email ILIKE $${i} OR c.phone ILIKE $${i})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortColumn = SORTABLE[params.sort ?? 'name'] ?? SORTABLE.name;
  const direction = params.order === 'asc' ? 'ASC' : 'DESC';

  const rows = await query<CustomerWithStats>(
    `${WITH_STATS} ${whereSql}
      ORDER BY ${sortColumn} ${direction}, c.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, params.limit, params.offset],
  );

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM customers c ${whereSql}`,
    values,
  );

  return { rows, total: Number(totalRow?.count ?? 0) };
}

export function findById(id: string): Promise<CustomerWithStats | null> {
  return queryOne<CustomerWithStats>(`${WITH_STATS} WHERE c.id = $1`, [id]);
}

export function create(input: CreateCustomerInput): Promise<Customer | null> {
  return queryOne<Customer>(
    `INSERT INTO customers (name, email, phone, address, gstin, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.name, input.email, input.phone, input.address, input.gstin, input.status],
  );
}

export function update(id: string, input: UpdateCustomerInput): Promise<Customer | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(input)) {
    values.push(value);
    fields.push(`${key} = $${values.length}`);
  }
  if (fields.length === 0) return findById(id) as Promise<Customer | null>;
  values.push(id);
  return queryOne<Customer>(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );
}

export async function remove(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM customers WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function countInvoices(id: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM invoices WHERE customer_id = $1`,
    [id],
  );
  return Number(row?.count ?? 0);
}
