import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export const DRIZZLE_DB = 'DRIZZLE_DB';
export type DrizzleDb = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DrizzleDb => {
        const connectionString =
          config.get<string>('DATABASE_URL') ??
          'postgresql://finpilot:finpilot@localhost:5432/finpilot';
        const pool = new pg.Pool({ connectionString });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}

