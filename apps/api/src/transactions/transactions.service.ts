import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql, eq, and, gte, lte, asc, desc, type SQL } from 'drizzle-orm';
import {
  type Transaction,
  type TransactionType,
  type TransactionStatus,
  type PaginationMeta,
  type PaginatedTransactionsResponse,
} from '@finpilot/shared';
import { DRIZZLE_DB, type DrizzleDb } from '../database/database.module.js';
import * as schema from '../database/schema/index.js';
import { GetTransactionsDto } from './dto/get-transactions.dto.js';

@Injectable()
export class TransactionsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getCustomerTransactions(
    id: string,
    query: GetTransactionsDto,
  ): Promise<PaginatedTransactionsResponse> {
    const customerId = id.trim().toUpperCase();

    // 1. Verify customer exists
    const [customer] = await this.db
      .select({ customerId: schema.customers.customerId })
      .from(schema.customers)
      .where(eq(schema.customers.customerId, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // 2. Build filter conditions
    const conditions: SQL[] = [eq(schema.accounts.customerId, customerId)];

    if (query.accountId) {
      conditions.push(eq(schema.transactions.accountId, query.accountId.trim()));
    }

    if (query.instrumentId) {
      conditions.push(
        eq(schema.transactions.instrumentId, query.instrumentId.trim()),
      );
    }

    const txType = query.transactionType || query.type;
    if (txType) {
      conditions.push(eq(schema.transactions.transactionType, txType));
    }

    if (query.status) {
      conditions.push(eq(schema.transactions.status, query.status));
    }

    if (query.isFuture !== undefined) {
      conditions.push(eq(schema.transactions.isFuture, query.isFuture));
    }

    const start = query.startDate || query.dateFrom;
    if (start) {
      conditions.push(gte(schema.transactions.tradeDate, start.trim()));
    }

    const end = query.endDate || query.dateTo;
    if (end) {
      conditions.push(lte(schema.transactions.tradeDate, end.trim()));
    }

    const whereClause = and(...conditions);

    // 3. Total matching records
    const [countResult] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.transactions)
      .innerJoin(
        schema.accounts,
        eq(schema.transactions.accountId, schema.accounts.accountId),
      )
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const page = Math.max(query.page ?? 1, 1);
    const rawPageSize = query.pageSize ?? query.limit ?? 100;
    const pageSize = Math.min(Math.max(rawPageSize, 1), 100);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    // 4. Determine sort direction and expression
    let orderExpr: SQL;
    const isAsc = query.sortDir === 'asc';

    switch (query.sortBy) {
      case 'amount':
        orderExpr = isAsc
          ? asc(schema.transactions.amount)
          : desc(schema.transactions.amount);
        break;
      case 'transactionType':
        orderExpr = isAsc
          ? asc(schema.transactions.transactionType)
          : desc(schema.transactions.transactionType);
        break;
      case 'tradeDate':
      default:
        orderExpr = isAsc
          ? asc(schema.transactions.tradeDate)
          : desc(schema.transactions.tradeDate);
        break;
    }

    // 5. Query matching rows with joined account and instrument details
    const rows = await this.db
      .select({
        transactionId: schema.transactions.transactionId,
        accountId: schema.transactions.accountId,
        accountType: schema.accounts.accountType,
        instrumentId: schema.transactions.instrumentId,
        instrumentName: schema.instruments.instrumentName,
        symbol: schema.instruments.symbol,
        assetClass: schema.instruments.assetClass,
        transactionType: schema.transactions.transactionType,
        tradeDate: schema.transactions.tradeDate,
        quantity: schema.transactions.quantity,
        price: schema.transactions.price,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
        isFuture: schema.transactions.isFuture,
        beforeOpenFlag: schema.transactions.beforeOpenFlag,
        onClosedFlag: schema.transactions.onClosedFlag,
      })
      .from(schema.transactions)
      .innerJoin(
        schema.accounts,
        eq(schema.transactions.accountId, schema.accounts.accountId),
      )
      .leftJoin(
        schema.instruments,
        eq(schema.transactions.instrumentId, schema.instruments.instrumentId),
      )
      .where(whereClause)
      .orderBy(orderExpr, desc(schema.transactions.transactionId))
      .limit(pageSize)
      .offset(offset);

    // 6. Map to DTO shape with numeric conversion and flags
    const data: Transaction[] = rows.map((r) => ({
      id: r.transactionId,
      transactionId: r.transactionId,
      accountId: r.accountId,
      accountType: r.accountType,
      instrumentId: r.instrumentId,
      instrumentName: r.instrumentName ?? undefined,
      symbol: r.symbol ?? undefined,
      assetClass: r.assetClass ?? undefined,
      type: r.transactionType as TransactionType,
      transactionType: r.transactionType as TransactionType,
      status: r.status as TransactionStatus,
      quantity: parseFloat(r.quantity) || 0,
      price: parseFloat(r.price) || 0,
      amount: parseFloat(r.amount) || 0,
      tradeDate: r.tradeDate,
      isFuture: Boolean(r.isFuture),
      beforeOpenFlag: Boolean(r.beforeOpenFlag),
      onClosedFlag: Boolean(r.onClosedFlag),
    }));

    const meta: PaginationMeta = {
      page,
      pageSize,
      limit: pageSize,
      total,
      totalPages,
    };

    return {
      data,
      meta,
      pagination: meta,
    };
  }
}

