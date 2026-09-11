import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool, pool } from './db/pool.js';

async function main() {
  // Fail fast with a readable message rather than 500s on the first request.
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('\nCould not connect to the database.');
    console.error(`  ${(error as Error).message}`);
    console.error('  Check DATABASE_URL in your .env file.\n');
    process.exit(1);
  }

  const server = createApp().listen(env.PORT, () => {
    console.log(`\n  Bahi API  →  http://localhost:${env.PORT}/api`);
    console.log(`  env: ${env.NODE_ENV}   cors: ${env.corsOrigins.join(', ')}\n`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void main();
