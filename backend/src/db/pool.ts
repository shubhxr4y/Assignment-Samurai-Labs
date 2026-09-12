import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { env } from '../config/env.js';

/**
 * node-postgres hands NUMERIC back as a string to avoid silent float
 * precision loss. We keep that behaviour and parse deliberately in the money
 * helpers — never with parseFloat scattered through the codebase.
 */
types.setTypeParser(types.builtins.NUMERIC, (value) => value);
// DATE as a plain 'YYYY-MM-DD' string: an invoice date has no timezone.
types.setTypeParser(types.builtins.DATE, (value) => value);

/**
 * A long-running server multiplexes one pool across every request, so a
 * handful of connections is right. A serverless host runs many isolated
 * instances instead, each with its own pool — so each takes a single
 * connection and lets Supabase's transaction pooler do the multiplexing.
 * Ten per instance would exhaust the database's connection limit under load.
 */
const isServerless = Boolean(process.env.VERCEL);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: isServerless ? 1 : 10,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message);
});

/** Run a query on the shared pool. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as unknown[]);
  return result.rows;
}

/** Run a query expecting at most one row. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Run `fn` inside a transaction. Anything that touches an invoice and its
 * lines together goes through here so a half-written invoice can never exist.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
