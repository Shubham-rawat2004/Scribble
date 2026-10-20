import fs from 'fs';
import path from 'path';
import { pool, testConnection } from './connection.js';

/**
 * Runs SQL migrations to ensure all database tables and seed data exist.
 */
export async function runMigrations(): Promise<void> {
  console.log('[Migration] Starting database migration...');
  
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Cannot run migrations: Database is not reachable.');
  }

  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`[Migration] Executing migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    const connection = await pool.getConnection();
    try {
      await connection.query(sql);
      console.log(`[Migration] Successfully executed: ${file}`);
    } finally {
      connection.release();
    }
  }

  console.log('[Migration] All migrations completed successfully.');
}

// Allow direct CLI execution: `tsx src/db/migrate.ts`
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration Error]:', err);
      process.exit(1);
    });
}
