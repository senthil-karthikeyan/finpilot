import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './dist/database/schema/index.js',
  out: '../../db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://finpilot:finpilot@localhost:5432/finpilot',
  },
});
