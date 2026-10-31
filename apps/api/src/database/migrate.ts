import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://finpilot:finpilot@localhost:5432/finpilot';

  const candidates = [
    path.resolve(__dirname, '../../../db/migrations'),
    path.resolve(process.cwd(), 'db/migrations'),
    path.resolve(process.cwd(), '../../db/migrations'),
  ];
  const migrationsFolder = candidates.find((dir) => fs.existsSync(dir));
  if (!migrationsFolder) {
    throw new Error(
      `Could not find migrations folder. Checked: ${candidates.join(', ')}`,
    );
  }

  console.log(
    `Connecting to database at ${connectionString.replace(/:[^:@]+@/, ':***@')}...`,
  );
  const pool = new pg.Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  console.log(`Applying migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied successfully.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
