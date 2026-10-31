import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql, eq, and, or, ilike, asc, desc, SQL } from 'drizzle-orm';
import {
  CustomerDetail,
  CustomerSummary,
  PaginationMeta,
} from '@finpilot/shared';
import { DRIZZLE_DB, type DrizzleDb } from '../database/database.module.js';
import * as schema from '../database/schema/index.js';
import { GetCustomersDto } from './dto/get-customers.dto.js';

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async findAll(
    query: GetCustomersDto,
  ): Promise<{ data: CustomerSummary[]; meta: PaginationMeta }> {
    const conditions: SQL[] = [];

    // Filter: Segment
    if (query.segment) {
      conditions.push(eq(schema.customers.segment, query.segment));
    }

    // Filter: KYC Status
    if (query.kycStatus) {
      conditions.push(eq(schema.customers.kycStatus, query.kycStatus));
    }

    // Filter: Search across ID, Name, Email, and City
    if (query.search && query.search.trim().length > 0) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.customers.customerId, term),
          ilike(schema.customers.fullName, term),
          ilike(schema.customers.email, term),
          ilike(schema.customers.city, term),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total matching records
    const [countResult] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.customers)
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Subquery for AUM per customer from v_portfolio_positions
    const aumSubquery = this.db
      .select({
        customerId: sql<string>`customer_id`.as('sub_customer_id'),
        aum: sql<number>`round(coalesce(sum(market_value), 0), 2)`.as(
          'sub_aum',
        ),
      })
      .from(sql`v_portfolio_positions`)
      .groupBy(sql`customer_id`)
      .as('p');

    // Subquery for account count per customer
    const accSubquery = this.db
      .select({
        customerId: schema.accounts.customerId,
        accountCount: sql<number>`count(*)::int`.as('sub_account_count'),
      })
      .from(schema.accounts)
      .groupBy(schema.accounts.customerId)
      .as('acc');

    // Determine Sort Order
    let orderBy: SQL;
    const isDesc = query.sortDir === 'desc';
    switch (query.sortBy) {
      case 'aum':
        orderBy = isDesc
          ? desc(sql`coalesce(p.sub_aum, 0)`)
          : asc(sql`coalesce(p.sub_aum, 0)`);
        break;
      case 'onboardedAt':
        orderBy = isDesc
          ? desc(schema.customers.onboardedAt)
          : asc(schema.customers.onboardedAt);
        break;
      case 'id':
        orderBy = isDesc
          ? desc(schema.customers.customerId)
          : asc(schema.customers.customerId);
        break;
      case 'name':
      default:
        orderBy = isDesc
          ? desc(schema.customers.fullName)
          : asc(schema.customers.fullName);
        break;
    }

    // Execute paginated joined query
    const rows = await this.db
      .select({
        id: schema.customers.customerId,
        name: schema.customers.fullName,
        email: schema.customers.email,
        phone: schema.customers.phone,
        city: schema.customers.city,
        state: schema.customers.state,
        segment: schema.customers.segment,
        kycStatus: schema.customers.kycStatus,
        accountCount: sql<number>`coalesce(acc.sub_account_count, 0)`,
        aum: sql<number>`coalesce(p.sub_aum, 0)`,
        riskLevel: schema.riskProfiles.riskLevel,
      })
      .from(schema.customers)
      .leftJoin(
        aumSubquery,
        eq(schema.customers.customerId, aumSubquery.customerId),
      )
      .leftJoin(
        accSubquery,
        eq(schema.customers.customerId, accSubquery.customerId),
      )
      .leftJoin(
        schema.riskProfiles,
        eq(schema.customers.customerId, schema.riskProfiles.customerId),
      )
      .where(whereClause)
      .orderBy(orderBy, asc(schema.customers.customerId))
      .limit(limit)
      .offset(offset);

    const data: CustomerSummary[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      city: r.city,
      state: r.state,
      segment: r.segment as any,
      kycStatus: r.kycStatus as any,
      accountCount: Number(r.accountCount),
      aum: Number(r.aum),
      riskLevel: (r.riskLevel as any) ?? null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<CustomerDetail> {
    const customerId = id.trim().toUpperCase();

    // 1. Fetch customer
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.customerId, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }

    // 2. Fetch risk profile
    const [risk] = await this.db
      .select()
      .from(schema.riskProfiles)
      .where(eq(schema.riskProfiles.customerId, customerId))
      .limit(1);

    // 3. Fetch accounts with individual AUM from v_portfolio_positions
    const accountRows = await this.db
      .select({
        accountId: schema.accounts.accountId,
        accountType: schema.accounts.accountType,
        provider: schema.accounts.provider,
        openedAt: schema.accounts.openedAt,
        status: schema.accounts.status,
        baseCurrency: schema.accounts.baseCurrency,
        aum: sql<number>`round(coalesce(sum(p.market_value), 0), 2)`,
      })
      .from(schema.accounts)
      .leftJoin(
        sql`v_portfolio_positions p`,
        sql`p.account_id = ${schema.accounts.accountId}`,
      )
      .where(eq(schema.accounts.customerId, customerId))
      .groupBy(schema.accounts.accountId)
      .orderBy(asc(schema.accounts.openedAt));

    const totalAum = accountRows.reduce(
      (sum, acc) => sum + Number(acc.aum ?? 0),
      0,
    );

    return {
      id: customer.customerId,
      name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      state: customer.state,
      segment: customer.segment as any,
      kycStatus: customer.kycStatus as any,
      dateOfBirth: customer.dateOfBirth,
      onboardedAt: customer.onboardedAt,
      createdAt: customer.createdAt.toISOString(),
      totalAum: Math.round(totalAum * 100) / 100,
      riskProfile: risk
        ? {
            score: risk.riskScore,
            level: risk.riskLevel as any,
            assessedAt: risk.assessedAt,
            horizonYears: risk.horizonYears,
            liquidityNeed: risk.liquidityNeed as any,
          }
        : null,
      accounts: accountRows.map((acc) => ({
        accountId: acc.accountId,
        accountType: acc.accountType as any,
        provider: acc.provider,
        openedAt: acc.openedAt,
        status: acc.status as any,
        baseCurrency: acc.baseCurrency,
        aum: Number(acc.aum ?? 0),
      })),
    };
  }
}
