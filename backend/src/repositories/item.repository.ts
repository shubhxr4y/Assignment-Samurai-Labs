import { query, queryOne } from '../db/pool.js';
import type { Item, ItemSalesHistoryRow, ItemWithStats } from '../types/domain.js';
import type { ListQuery } from '../validators/common.js';
import type { CreateItemInput, UpdateItemInput } from '../validators/item.validator.js';

const WITH_STATS = `
  SELECT i.*,
         COALESCE(s.invoice_count,  0)::int  AS invoice_count,
         COALESCE(s.quantity_sold,  0)::text AS quantity_sold,
         COALESCE(s.total_sales,    0)::text AS total_sales
    FROM items i
    LEFT JOIN (
      SELECT item_id,
             COUNT(DISTINCT invoice_id) AS invoice_count,
             SUM(quantity)              AS quantity_sold,
             SUM(line_total)            AS total_sales
        FROM invoice_items
       WHERE item_id IS NOT NULL
       GROUP BY item_id
    ) s ON s.item_id = i.id
`;

const SORTABLE: Record<string, string> = {
  name: 'lower(i.name)',
  unit_price: 'i.unit_price',
  tax_rate: 'i.tax_rate',
  created_at: 'i.created_at',
  total_sales: 'COALESCE(s.total_sales, 0)',
  quantity_sold: 'COALESCE(s.quantity_sold, 0)',
};

export async function list(params: ListQuery): Promise<{ rows: ItemWithStats[]; total: number }> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (params.status !== 'all') {
    values.push(params.status);
    where.push(`i.status = $${values.length}`);
  }
  if (params.search) {
    values.push(`%${params.search}%`);
    const idx = values.length;
    where.push(`(i.name ILIKE $${idx} OR i.description ILIKE $${idx})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortColumn = SORTABLE[params.sort ?? 'name'] ?? SORTABLE.name;
  const direction = params.order === 'asc' ? 'ASC' : 'DESC';

  const rows = await query<ItemWithStats>(
    `${WITH_STATS} ${whereSql}
      ORDER BY ${sortColumn} ${direction}, i.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, params.limit, params.offset],
  );

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM items i ${whereSql}`,
    values,
  );

  return { rows, total: Number(totalRow?.count ?? 0) };
}

export function findById(id: string): Promise<ItemWithStats | null> {
  return queryOne<ItemWithStats>(`${WITH_STATS} WHERE i.id = $1`, [id]);
}

/**
 * Every invoice line this item has appeared on, newest first. Joined through
 * invoice_items rather than read off the item, so the history reflects what was
 * actually billed — including lines raised at a price the item no longer has.
 */
export function salesHistory(id: string, limit = 50): Promise<ItemSalesHistoryRow[]> {
  return query<ItemSalesHistoryRow>(
    `SELECT ii.id  AS line_id,
            inv.id AS invoice_id,
            inv.invoice_number,
            inv.invoice_date,
            inv.payment_status,
            c.id   AS customer_id,
            c.name AS customer_name,
            ii.quantity,
            ii.unit_price,
            ii.line_total
       FROM invoice_items ii
       JOIN invoices  inv ON inv.id = ii.invoice_id
       JOIN customers c   ON c.id   = inv.customer_id
      WHERE ii.item_id = $1
      ORDER BY inv.invoice_date DESC, inv.created_at DESC
      LIMIT $2`,
    [id, limit],
  );
}

export function findManyByIds(ids: readonly string[]): Promise<Item[]> {
  return query<Item>(`SELECT * FROM items WHERE id = ANY($1::uuid[])`, [ids]);
}

export function create(input: CreateItemInput): Promise<Item | null> {
  return queryOne<Item>(
    `INSERT INTO items (name, description, unit, unit_price, tax_rate, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.name, input.description, input.unit, input.unit_price, input.tax_rate, input.status],
  );
}

export function update(id: string, input: UpdateItemInput): Promise<Item | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(input)) {
    values.push(value);
    fields.push(`${key} = $${values.length}`);
  }
  if (fields.length === 0) return findById(id) as Promise<Item | null>;
  values.push(id);
  return queryOne<Item>(
    `UPDATE items SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );
}

export async function remove(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(`DELETE FROM items WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function countInvoiceLines(id: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM invoice_items WHERE item_id = $1`,
    [id],
  );
  return Number(row?.count ?? 0);
}
