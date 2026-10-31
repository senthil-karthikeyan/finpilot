import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { sql, eq, desc, and } from 'drizzle-orm';
import {
  type ImportResponse,
  type ImportBatch,
  type DataQualityResponse,
  type PaginatedRejectedRowsResponse,
  MAX_IMPORT_FILE_BYTES,
} from '@finpilot/shared';
import { DRIZZLE_DB, type DrizzleDb } from '../database/database.module.js';
import * as schema from '../database/schema/index.js';
import {
  reconcileTransactionRow,
  type RawTransactionInput,
  type AccountContext,
} from '../database/anomaly-rules.js';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export interface UploadedCsvFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype?: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  /**
   * Processes an uploaded transactions CSV, executes anomaly reconciliation,
   * stores valid transactions in the main ledger, and writes batch provenance
   * and rejected row audit logs.
   */
  async importTransactionsCsv(
    file: UploadedCsvFile,
    userEmail: string,
  ): Promise<ImportResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid CSV file is required.');
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new BadRequestException('File exceeds 10MB limit.');
    }

    let parsedRows: RawTransactionInput[];
    try {
      const content = file.buffer.toString('utf8');
      parsedRows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unknown CSV parse error';
      throw new BadRequestException(`Failed to parse CSV file: ${msg}`);
    }

    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      throw new BadRequestException('CSV file contains no data rows.');
    }

    // 1. Fetch reference sets for reconciliation
    const allInstruments = await this.db
      .select({ instrumentId: schema.instruments.instrumentId })
      .from(schema.instruments);
    const validInstrumentIds = new Set(
      allInstruments.map((i) => i.instrumentId),
    );

    const allAccounts = await this.db
      .select({
        accountId: schema.accounts.accountId,
        openedAt: schema.accounts.openedAt,
        status: schema.accounts.status,
      })
      .from(schema.accounts);

    const accountContextMap = new Map<string, AccountContext>();
    for (const a of allAccounts) {
      accountContextMap.set(a.accountId, {
        opened_at: a.openedAt,
        status: a.status,
      });
    }

    const existingTxs = await this.db
      .select({ transactionId: schema.transactions.transactionId })
      .from(schema.transactions);
    const seenTxIds = new Set(existingTxs.map((t) => t.transactionId));

    // 2. Generate sequential batch ID
    const [batchCountResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.importBatches);
    const nextBatchNum = (batchCountResult?.count ?? 0) + 1;
    const batchId = `IMP-${String(nextBatchNum).padStart(4, '0')}`;

    const startTime = Date.now();

    await this.db.insert(schema.importBatches).values({
      batchId,
      fileName: file.originalname,
      importedBy: userEmail,
      status: 'COMPLETED',
      rowCount: parsedRows.length,
    });

    // 3. Reconcile rows
    let importedCount = 0;
    let futureDatedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    const validTransactions: (typeof schema.transactions.$inferInsert)[] = [];
    const importRowsList: (typeof schema.importRows.$inferInsert)[] = [];
    const rowResults: ImportResponse['rows'] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const raw = parsedRows[i];
      const lineNumber = i + 2;

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        accountContextMap.get(raw.account_id),
      );

      if (!result.accepted) {
        if (result.outcome === 'duplicate') duplicateCount++;
        if (result.outcome === 'rejected') rejectedCount++;

        importRowsList.push({
          batchId,
          lineNumber,
          transactionId: raw.transaction_id || null,
          outcome: result.outcome,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          rawData: raw,
        });

        rowResults.push({
          rowNumber: lineNumber,
          lineNumber,
          transactionId: raw.transaction_id,
          outcome: result.outcome,
          reason: result.errorMessage,
          errorMessage: result.errorMessage,
          errorCode: result.errorCode,
        });
      } else if (result.transaction) {
        importedCount++;
        if (result.outcome === 'future_dated') futureDatedCount++;

        validTransactions.push({
          ...result.transaction,
          importBatchId: batchId,
        });

        importRowsList.push({
          batchId,
          lineNumber,
          transactionId: raw.transaction_id,
          outcome: result.outcome,
          errorCode: null,
          errorMessage: result.errorMessage,
          rawData: raw,
        });

        rowResults.push({
          rowNumber: lineNumber,
          lineNumber,
          transactionId: raw.transaction_id,
          outcome: result.outcome,
          reason: result.errorMessage,
          errorMessage: result.errorMessage,
          errorCode: null,
        });
      }
    }

    // 4. Batch insert accepted transactions
    for (const chunk of chunkArray(validTransactions, 200)) {
      await this.db
        .insert(schema.transactions)
        .values(chunk)
        .onConflictDoNothing({ target: schema.transactions.transactionId });
    }

    // 5. Batch insert audit rows
    for (const chunk of chunkArray(importRowsList, 500)) {
      await this.db.insert(schema.importRows).values(chunk);
    }

    const durationMs = Date.now() - startTime;

    // 6. Update batch metrics
    await this.db
      .update(schema.importBatches)
      .set({
        importedCount,
        futureDatedCount,
        duplicateCount,
        rejectedCount,
        durationMs,
      })
      .where(eq(schema.importBatches.batchId, batchId));

    // Return counts plus at most the first 100 rejected or duplicate rows
    const rejectedRows = rowResults.filter(
      (r) => r.outcome === 'rejected' || r.outcome === 'duplicate',
    );
    const cappedRows = rejectedRows.slice(0, 100);

    return {
      batchId,
      fileName: file.originalname,
      totalRows: parsedRows.length,
      imported: importedCount,
      futureDated: futureDatedCount,
      duplicate: duplicateCount,
      rejected: rejectedCount,
      durationMs,
      status: 'COMPLETED',
      rows: cappedRows,
    };
  }

  /**
   * List all import batch history.
   */
  async getImportBatches(): Promise<ImportBatch[]> {
    const batches = await this.db
      .select()
      .from(schema.importBatches)
      .orderBy(desc(schema.importBatches.receivedAt));

    return batches.map((b) => ({
      batchId: b.batchId,
      fileName: b.fileName,
      importedBy: b.importedBy,
      importedAt: b.receivedAt.toISOString(),
      totalRows: b.rowCount,
      imported: b.importedCount,
      futureDated: b.futureDatedCount,
      duplicate: b.duplicateCount,
      rejected: b.rejectedCount,
      durationMs: b.durationMs,
      status: b.status,
    }));
  }

  /**
   * Get specific batch with its row-level audit trail.
   */
  async getImportBatch(batchId: string) {
    const [batch] = await this.db
      .select()
      .from(schema.importBatches)
      .where(eq(schema.importBatches.batchId, batchId.trim()))
      .limit(1);

    if (!batch) {
      throw new NotFoundException(`Import batch with ID ${batchId} not found`);
    }

    const rows = await this.db
      .select()
      .from(schema.importRows)
      .where(eq(schema.importRows.batchId, batch.batchId))
      .orderBy(schema.importRows.lineNumber);

    return {
      batch: {
        batchId: batch.batchId,
        fileName: batch.fileName,
        importedBy: batch.importedBy,
        importedAt: batch.receivedAt.toISOString(),
        totalRows: batch.rowCount,
        imported: batch.importedCount,
        futureDated: batch.futureDatedCount,
        duplicate: batch.duplicateCount,
        rejected: batch.rejectedCount,
        durationMs: batch.durationMs,
        status: batch.status,
      },
      rows: rows.map((r) => ({
        id: r.id,
        lineNumber: r.lineNumber,
        rowNumber: r.lineNumber,
        transactionId: r.transactionId,
        outcome: r.outcome,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
        reason: r.errorMessage,
        rawData: r.rawData,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Data-quality anomalies summary across the database.
   */
  async getDataQualitySummary(): Promise<DataQualityResponse> {
    const [futureRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.transactions)
      .where(eq(schema.transactions.isFuture, true));

    const [beforeOpenRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.transactions)
      .where(eq(schema.transactions.beforeOpenFlag, true));

    const [onClosedRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.transactions)
      .where(eq(schema.transactions.onClosedFlag, true));

    const [duplicateRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.importRows)
      .where(eq(schema.importRows.outcome, 'duplicate'));

    const [rejectedRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.importRows)
      .where(eq(schema.importRows.outcome, 'rejected'));

    return {
      generatedAt: new Date().toISOString(),
      items: [
        {
          anomaly: 'future_dated',
          count: futureRow?.count ?? 0,
          description:
            'Transactions with trade dates after snapshot reference date.',
          handling:
            'Preserved in main transactions ledger with is_future=true; excluded from trailing 12-month net cash flow aggregation.',
        },
        {
          anomaly: 'before_open_date',
          count: beforeOpenRow?.count ?? 0,
          description:
            'Transactions executed prior to the associated account opened_at date.',
          handling:
            'Flagged with before_open_flag=true for operations inspection; retained in portfolio calculations.',
        },
        {
          anomaly: 'on_closed_account',
          count: onClosedRow?.count ?? 0,
          description:
            'Transactions executed against accounts currently marked as CLOSED.',
          handling:
            'Flagged with on_closed_flag=true for compliance auditing; retained for historical ledger integrity.',
        },
        {
          anomaly: 'duplicate_transactions',
          count: duplicateRow?.count ?? 0,
          description:
            'Transaction rows sharing duplicate transaction identifiers.',
          handling:
            'First occurrence accepted; subsequent duplicates rejected and quarantined in import_rows audit table.',
        },
        {
          anomaly: 'invalid_references',
          count: rejectedRow?.count ?? 0,
          description:
            'Transactions referencing non-existent instruments or accounts.',
          handling:
            'Rejected prior to database insertion; quarantined in import_rows with INVALID_INSTRUMENT_FK or INVALID_ACCOUNT_FK.',
        },
      ],
    };
  }

  /**
   * Paginated rejected/duplicate rows for an import batch.
   */
  async getRejectedRows(
    batchId: string,
    page: number = 1,
    pageSize: number = 100,
  ): Promise<PaginatedRejectedRowsResponse> {
    const cleanBatchId = batchId.trim();
    const clampedPage = Math.max(page, 1);
    const clampedPageSize = Math.min(Math.max(pageSize, 1), 100);
    const offset = (clampedPage - 1) * clampedPageSize;

    const [batch] = await this.db
      .select()
      .from(schema.importBatches)
      .where(eq(schema.importBatches.batchId, cleanBatchId))
      .limit(1);

    if (!batch) {
      throw new NotFoundException(
        `Import batch with ID '${batchId}' was not found.`,
      );
    }

    const whereClause = and(
      eq(schema.importRows.batchId, cleanBatchId),
      sql`${schema.importRows.outcome} IN ('rejected', 'duplicate')`,
    );

    const [countResult] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.importRows)
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / clampedPageSize) || 1;

    const rows = await this.db
      .select()
      .from(schema.importRows)
      .where(whereClause)
      .orderBy(schema.importRows.lineNumber)
      .limit(clampedPageSize)
      .offset(offset);

    return {
      data: rows.map((r) => ({
        rowNumber: r.lineNumber,
        transactionId: r.transactionId ?? undefined,
        outcome: r.outcome as 'rejected' | 'duplicate',
        reason: r.errorMessage ?? undefined,
      })),
      meta: {
        page: clampedPage,
        pageSize: clampedPageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Export all rejected/duplicate rows for an import batch as CSV string.
   */
  async getRejectedRowsCsv(batchId: string): Promise<string> {
    const cleanBatchId = batchId.trim();
    const [batch] = await this.db
      .select()
      .from(schema.importBatches)
      .where(eq(schema.importBatches.batchId, cleanBatchId))
      .limit(1);

    if (!batch) {
      throw new NotFoundException(
        `Import batch with ID '${batchId}' was not found.`,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.importRows)
      .where(
        and(
          eq(schema.importRows.batchId, cleanBatchId),
          sql`${schema.importRows.outcome} IN ('rejected', 'duplicate')`,
        ),
      )
      .orderBy(schema.importRows.lineNumber);

    const header =
      'line_number,transaction_id,outcome,error_code,reason,raw_data\n';
    const lines = rows.map((r) => {
      const lineNo = r.lineNumber;
      const txId = r.transactionId ?? '';
      const outcome = r.outcome;
      const code = r.errorCode ?? '';
      const reason = `"${(r.errorMessage ?? '').replace(/"/g, '""')}"`;
      const raw = `"${(r.rawData ? JSON.stringify(r.rawData) : '').replace(/"/g, '""')}"`;
      return `${lineNo},${txId},${outcome},${code},${reason},${raw}`;
    });

    return header + lines.join('\n');
  }
}
