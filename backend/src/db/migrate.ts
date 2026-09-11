/**
 * Minimal forward-only migration runner.
 *
 * Every .sql file in ./migrations is applied once, in filename order, inside a
 * transaction, and recorded in schema_migrations. No magic, no ORM, and it
 * works identically against local Postgres and Supabase.
 *
 *   npm run migrate            apply pending migrations
 *   npm run migrate -- --reset drop everything and re-apply from scratch
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from './pool.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

async function appliedVersions(): Promise<Set<string>> {
  const { rows } = await pool.query<{ version: string }>(
    `SELECT version FROM schema_migrations`,
  ).catch(() => ({ rows: [] as { version: string }[] }));
  return new Set(rows.map((r) => r.version));
}

async function run(): Promise<void> {
  const reset = process.argv.includes('--reset');

  if (reset) {
    console.log('• Dropping schema public …');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
  }

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const done = await appliedVersions();
  let applied = 0;

  for (const file of files) {
    if (done.has(file)) {
      console.log(`• ${file} — already applied`);
      continue;
    }
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
        [file],
      );
      await client.query('COMMIT');
      applied += 1;
      console.log(`✓ ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ ${file} failed:`, (error as Error).message);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(applied === 0 ? '\nDatabase already up to date.' : `\n${applied} migration(s) applied.`);
}

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(error);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
