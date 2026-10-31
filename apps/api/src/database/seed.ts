import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema/index.js';
import {
  reconcileTransactionRow,
  deduplicateHoldings,
  SNAPSHOT_REFERENCE_DATE,
  type RawTransactionInput,
  type AccountContext,
} from './anomaly-rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to chunk arrays for safe batch inserts (PostgreSQL 65535 parameter limit)
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface CsvCustomer {
  customer_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  date_of_birth: string;
  onboarded_at: string;
  kyc_status: string;
  segment: string;
}

interface CsvInstrument {
  instrument_id: string;
  symbol: string;
  instrument_name: string;
  asset_class: string;
  sector: string;
  exchange: string;
  currency: string;
  last_price: string;
  price_as_of: string;
  risk_band: string;
}

interface CsvAccount {
  account_id: string;
  customer_id: string;
  account_type: string;
  provider: string;
  opened_at: string;
  status: string;
  base_currency: string;
}

interface CsvRiskProfile {
  customer_id: string;
  risk_score: string;
  risk_level: string;
  assessed_at: string;
  horizon_years: string;
  liquidity_need: string;
}

interface CsvGoal {
  goal_id: string;
  customer_id: string;
  goal_type: string;
  goal_name: string;
  target_amount: string;
  current_funded_amount: string;
  target_date: string;
  priority: string;
}

interface CsvHolding {
  account_id: string;
  instrument_id: string;
  quantity: string;
  avg_cost: string;
  snapshot_date: string;
}

function resolveDataDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../../db/seed/data'),
    path.resolve(process.cwd(), 'db/seed/data'),
    path.resolve(process.cwd(), '../../db/seed/data'),
    path.resolve(__dirname, '../../../../docs'),
    path.resolve(process.cwd(), '../docs'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'customers.csv'))) {
      return dir;
    }
  }
  throw new Error(
    `Seed data directory not found. Checked: ${candidates.join(', ')}`,
  );
}

function loadCsv<T>(dir: string, filename: string): T[] {
  const filePath = path.join(dir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

export async function runSeed() {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://finpilot:finpilot@localhost:5432/finpilot';

  const dataDir = resolveDataDir();
  console.log('='.repeat(70));
  console.log('FinPilot Database Seeder & Anomaly Reconciliation Engine');
  console.log('='.repeat(70));
  console.log(`Source data directory: ${dataDir}`);
  console.log(
    `Target database: ${connectionString.replace(/:[^:@]+@/, ':***@')}\n`,
  );

  const pool = new pg.Pool({ connectionString, max: 1 });
  const db = drizzle(pool, { schema });

  try {
    // ── 1. Customers ────────────────────────────────────────────────────────
    console.log('[1/8] Ingesting customers...');
    const rawCustomers = loadCsv<CsvCustomer>(dataDir, 'customers.csv');
    const customerRecords = rawCustomers.map((c) => ({
      customerId: c.customer_id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      state: c.state,
      dateOfBirth: c.date_of_birth,
      onboardedAt: c.onboarded_at,
      kycStatus: c.kyc_status as 'VERIFIED' | 'PENDING' | 'REVIEW',
      segment: c.segment as 'Mass' | 'Affluent' | 'HNI',
    }));

    for (const chunk of chunkArray(customerRecords, 100)) {
      await db
        .insert(schema.customers)
        .values(chunk)
        .onConflictDoNothing({ target: schema.customers.customerId });
    }
    console.log(`  ✓ Seeded ${customerRecords.length} customers.`);

    // ── 2. Instruments ──────────────────────────────────────────────────────
    console.log('[2/8] Ingesting instruments...');
    const rawInstruments = loadCsv<CsvInstrument>(dataDir, 'instruments.csv');
    const instrumentRecords = rawInstruments.map((i) => ({
      instrumentId: i.instrument_id,
      symbol: i.symbol,
      instrumentName: i.instrument_name,
      assetClass: i.asset_class as
        'EQUITY' | 'ETF' | 'MUTUAL_FUND' | 'BOND' | 'REIT' | 'GSEC',
      sector: i.sector ? i.sector : null,
      exchange: i.exchange as 'NSE' | 'BSE' | 'OTC',
      currency: i.currency || 'INR',
      lastPrice: i.last_price,
      priceAsOf: i.price_as_of,
      riskBand: i.risk_band as 'LOW' | 'MEDIUM' | 'HIGH',
    }));

    for (const chunk of chunkArray(instrumentRecords, 100)) {
      await db
        .insert(schema.instruments)
        .values(chunk)
        .onConflictDoNothing({ target: schema.instruments.instrumentId });
    }
    console.log(`  ✓ Seeded ${instrumentRecords.length} instruments.`);

    // ── 3. Accounts ─────────────────────────────────────────────────────────
    console.log('[3/8] Ingesting accounts...');
    const rawAccounts = loadCsv<CsvAccount>(dataDir, 'accounts.csv');
    const accountContextMap = new Map<string, AccountContext>();
    const accountRecords = rawAccounts.map((a) => {
      accountContextMap.set(a.account_id, {
        opened_at: a.opened_at,
        status: a.status,
      });
      return {
        accountId: a.account_id,
        customerId: a.customer_id,
        accountType: a.account_type as
          'BROKERAGE' | 'MUTUAL_FUND' | 'RETIREMENT',
        provider: a.provider,
        openedAt: a.opened_at,
        status: a.status as 'ACTIVE' | 'DORMANT' | 'CLOSED',
        baseCurrency: a.base_currency || 'INR',
      };
    });

    for (const chunk of chunkArray(accountRecords, 100)) {
      await db
        .insert(schema.accounts)
        .values(chunk)
        .onConflictDoNothing({ target: schema.accounts.accountId });
    }
    console.log(`  ✓ Seeded ${accountRecords.length} accounts.`);

    // ── 4. Risk Profiles ────────────────────────────────────────────────────
    console.log('[4/8] Ingesting risk profiles...');
    const rawRiskProfiles = loadCsv<CsvRiskProfile>(
      dataDir,
      'risk_profiles.csv',
    );
    const riskRecords = rawRiskProfiles.map((r) => ({
      customerId: r.customer_id,
      riskScore: parseInt(r.risk_score, 10),
      riskLevel: r.risk_level as
        'Conservative' | 'Moderate' | 'Growth' | 'Aggressive',
      assessedAt: r.assessed_at,
      horizonYears: parseInt(r.horizon_years, 10),
      liquidityNeed: r.liquidity_need as 'LOW' | 'MEDIUM' | 'HIGH',
    }));

    for (const chunk of chunkArray(riskRecords, 100)) {
      await db
        .insert(schema.riskProfiles)
        .values(chunk)
        .onConflictDoNothing({ target: schema.riskProfiles.customerId });
    }
    console.log(`  ✓ Seeded ${riskRecords.length} risk profiles.`);

    // ── 5. Goals ────────────────────────────────────────────────────
    console.log('[5/8] Ingesting financial goals...');
    const rawGoals = loadCsv<CsvGoal>(dataDir, 'goals.csv');
    const goalRecords = rawGoals.map((g) => ({
      goalId: g.goal_id,
      customerId: g.customer_id,
      goalType: g.goal_type as
        | 'EMERGENCY_FUND'
        | 'EDUCATION'
        | 'RETIREMENT'
        | 'TRAVEL'
        | 'WEALTH_CREATION'
        | 'HOME_PURCHASE',
      goalName: g.goal_name,
      targetAmount: g.target_amount,
      currentFundedAmount: g.current_funded_amount,
      targetDate: g.target_date,
      priority: g.priority as 'LOW' | 'MEDIUM' | 'HIGH',
    }));

    for (const chunk of chunkArray(goalRecords, 100)) {
      await db
        .insert(schema.goals)
        .values(chunk)
        .onConflictDoNothing({ target: schema.goals.goalId });
    }
    console.log(`  ✓ Seeded ${goalRecords.length} financial goals.`);

    // ── 6. Holdings Snapshot (with Duplicate Position Deduplication) ─────────
    console.log(
      '[6/8] Ingesting holdings snapshot (handling duplicate position edge cases)...',
    );
    const rawHoldings = loadCsv<CsvHolding>(dataDir, 'holdings_snapshot.csv');
    const { unique, duplicatesCount } = deduplicateHoldings(rawHoldings);

    const holdingsRecords = unique.map((h) => ({
      accountId: h.account_id,
      instrumentId: h.instrument_id,
      quantity: h.quantity,
      avgCost: h.avg_cost,
      snapshotDate: h.snapshot_date,
    }));

    for (const chunk of chunkArray(holdingsRecords, 200)) {
      await db
        .insert(schema.holdingsSnapshot)
        .values(chunk)
        .onConflictDoNothing();
    }
    console.log(
      `  ✓ Seeded ${holdingsRecords.length} unique holdings (${duplicatesCount} duplicate positions deduplicated).`,
    );

    // ── 7. Transactions & Anomaly Reconciliation ────────────────────────────
    console.log('[7/8] Ingesting transactions & recording provenance batch...');
    const rawTransactions = loadCsv<RawTransactionInput>(
      dataDir,
      'transactions.csv',
    );
    const instrumentIdSet = new Set(rawInstruments.map((i) => i.instrument_id));
    const batchId = 'BATCH-INITIAL-SEED';

    await db
      .insert(schema.importBatches)
      .values({
        batchId,
        fileName: 'transactions.csv (initial seed)',
        importedBy: 'system/seed',
        status: 'COMPLETED',
        rowCount: rawTransactions.length,
      })
      .onConflictDoNothing({ target: schema.importBatches.batchId });

    const seenTxIds = new Set<string>();
    const validTransactions: (typeof schema.transactions.$inferInsert)[] = [];
    const importRows: (typeof schema.importRows.$inferInsert)[] = [];

    let importedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;
    let futureDatedCount = 0;

    for (let index = 0; index < rawTransactions.length; index++) {
      const tx = rawTransactions[index];
      const lineNumber = index + 2;
      const accountContext = accountContextMap.get(tx.account_id);

      const result = reconcileTransactionRow(
        tx,
        seenTxIds,
        instrumentIdSet,
        accountContext,
        SNAPSHOT_REFERENCE_DATE,
      );

      if (!result.accepted) {
        if (result.outcome === 'duplicate') duplicateCount++;
        if (result.outcome === 'rejected') rejectedCount++;

        importRows.push({
          batchId,
          lineNumber,
          transactionId: tx.transaction_id,
          outcome: result.outcome,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          rawData: tx,
        });
      } else if (result.transaction) {
        importedCount++;
        if (result.outcome === 'future_dated') futureDatedCount++;

        validTransactions.push({
          ...result.transaction,
          importBatchId: batchId,
        });

        importRows.push({
          batchId,
          lineNumber,
          transactionId: tx.transaction_id,
          outcome: result.outcome,
          errorCode: null,
          errorMessage: result.errorMessage,
          rawData: tx,
        });
      }
    }

    // Batch insert transactions in chunks of 200
    for (const chunk of chunkArray(validTransactions, 200)) {
      await db
        .insert(schema.transactions)
        .values(chunk)
        .onConflictDoNothing({ target: schema.transactions.transactionId });
    }

    // Batch insert anomaly/provenance rows in chunks of 500
    for (const chunk of chunkArray(importRows, 500)) {
      await db.insert(schema.importRows).values(chunk);
    }

    // Update batch stats
    await db
      .update(schema.importBatches)
      .set({
        importedCount,
        duplicateCount,
        rejectedCount,
        futureDatedCount,
      })
      .where(sql`${schema.importBatches.batchId} = ${batchId}`);

    console.log(`  ✓ Transactions Ingested: ${importedCount}`);
    console.log(
      `  ✓ Future-dated flagged (is_future = true): ${futureDatedCount}`,
    );
    console.log(
      `  ✓ Duplicates rejected (DUPLICATE_TRANSACTION_ID): ${duplicateCount}`,
    );
    console.log(
      `  ✓ Invalid FK rejected (INVALID_INSTRUMENT_FK): ${rejectedCount}`,
    );

    // ── 8. Demo Users ───────────────────────────────────────────────────────
    console.log('[8/8] Seeding demo users with secure bcrypt hashes...');
    const viewerHash = await bcrypt.hash('Viewer#2026', 10);
    const adminHash = await bcrypt.hash('Admin#2026', 10);

    const demoUsers = [
      {
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        passwordHash: viewerHash,
        role: 'VIEWER' as const,
      },
      {
        email: 'admin@finpilot.test',
        name: 'Demo Admin',
        passwordHash: adminHash,
        role: 'ADMIN' as const,
      },
    ];

    for (const u of demoUsers) {
      await db
        .insert(schema.users)
        .values(u)
        .onConflictDoUpdate({
          target: schema.users.email,
          set: {
            passwordHash: u.passwordHash,
            name: u.name,
            role: u.role,
          },
        });
    }
    console.log(
      '  ✓ Demo users seeded: viewer@finpilot.test, admin@finpilot.test',
    );

    console.log('\n' + '='.repeat(70));
    console.log('Database Seeding & Reconciliation Completed Successfully!');
    console.log('='.repeat(70));
  } catch (err) {
    console.error('Seeding failed with error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Auto-run if executed directly via node
const isMain =
  process.argv[1]?.endsWith('seed.js') || process.argv[1]?.endsWith('seed.ts');
if (isMain) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
