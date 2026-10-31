import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql, eq, asc } from 'drizzle-orm';
import {
  PortfolioResponse,
  CashFlowResponse,
  CashFlowMonth,
  AssetClass,
  PortfolioPosition,
  AccountPortfolio,
  AllocationBucket,
} from '@finpilot/shared';
import { DRIZZLE_DB, type DrizzleDb } from '../database/database.module.js';
import * as schema from '../database/schema/index.js';

interface RawPositionRow {
  accountId: string;
  customerId: string;
  accountType: string;
  provider: string;
  accountStatus: string;
  baseCurrency: string;
  instrumentId: string;
  symbol: string;
  instrumentName: string;
  assetClass: string;
  sector: string | null;
  riskBand: string;
  lastPrice: string | number;
  priceAsOf: string;
  quantity: string | number;
  avgCost: string | number;
  snapshotDate: string;
  marketValue: string | number;
  costBasis: string | number;
  unrealisedPnl: string | number;
  unrealisedPnlPct: string | number | null;
}

interface RawCashFlowRow {
  monthLabel: string;
  buyTotal: string | number;
  sellTotal: string | number;
  netFlow: string | number;
}

@Injectable()
export class PortfolioService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDb) {}

  async getCustomerPortfolio(id: string): Promise<PortfolioResponse> {
    const customerId = id.trim().toUpperCase();

    // 1. Verify customer exists
    const [customer] = await this.db
      .select({ customerId: schema.customers.customerId })
      .from(schema.customers)
      .where(eq(schema.customers.customerId, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }

    // 2. Fetch all customer accounts
    const accountRows = await this.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.customerId, customerId))
      .orderBy(asc(schema.accounts.openedAt));

    // 3. Fetch all positions from SQL view v_portfolio_positions
    const rawPositions = (await this.db.execute(sql`
      SELECT
        account_id          AS "accountId",
        customer_id         AS "customerId",
        account_type        AS "accountType",
        provider            AS "provider",
        account_status      AS "accountStatus",
        base_currency       AS "baseCurrency",
        instrument_id       AS "instrumentId",
        symbol              AS "symbol",
        instrument_name     AS "instrumentName",
        asset_class         AS "assetClass",
        sector              AS "sector",
        risk_band           AS "riskBand",
        last_price          AS "lastPrice",
        price_as_of         AS "priceAsOf",
        quantity            AS "quantity",
        avg_cost            AS "avgCost",
        snapshot_date       AS "snapshotDate",
        market_value        AS "marketValue",
        cost_basis          AS "costBasis",
        unrealised_pnl      AS "unrealisedPnl",
        unrealised_pnl_pct  AS "unrealisedPnlPct"
      FROM v_portfolio_positions
      WHERE customer_id = ${customerId}
      ORDER BY account_id ASC, market_value DESC;
    `)) as unknown as { rows: RawPositionRow[] };

    const positionList = rawPositions.rows ?? [];

    // 4. Calculate Customer Consolidated Totals
    const totalAum = positionList.reduce(
      (sum, p) => sum + Number(p.marketValue || 0),
      0,
    );
    const totalCostBasis = positionList.reduce(
      (sum, p) => sum + Number(p.costBasis || 0),
      0,
    );
    const totalUnrealisedPnl = totalAum - totalCostBasis;
    const totalUnrealisedPnlPct =
      totalCostBasis > 0
        ? Math.round(((totalAum - totalCostBasis) / totalCostBasis) * 10000) /
          100
        : null;

    const snapshotDate = positionList[0]?.snapshotDate ?? null;
    const priceDate = positionList[0]?.priceAsOf ?? null;

    // 5. Build Asset Allocation Map
    const allocationMap = new Map<
      AssetClass,
      { marketValue: number; count: number }
    >();

    for (const pos of positionList) {
      const ac = pos.assetClass as AssetClass;
      const current = allocationMap.get(ac) || { marketValue: 0, count: 0 };
      current.marketValue += Number(pos.marketValue || 0);
      current.count += 1;
      allocationMap.set(ac, current);
    }

    const allocation: AllocationBucket[] = Array.from(allocationMap.entries())
      .map(([assetClass, data]) => ({
        assetClass,
        marketValue: Math.round(data.marketValue * 100) / 100,
        weightPct:
          totalAum > 0
            ? Math.round((data.marketValue / totalAum) * 10000) / 100
            : 0,
        positionCount: data.count,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);

    // 6. Build Account Summaries with Grouped Positions
    const positionsByAccount = new Map<string, PortfolioPosition[]>();
    for (const pos of positionList) {
      const accId = pos.accountId;
      const list = positionsByAccount.get(accId) || [];
      const mv = Number(pos.marketValue || 0);
      const cb = Number(pos.costBasis || 0);
      const pnl = Number(pos.unrealisedPnl || 0);
      const pnlPct =
        pos.unrealisedPnlPct !== null ? Number(pos.unrealisedPnlPct) : null;
      const weight =
        totalAum > 0 ? Math.round((mv / totalAum) * 10000) / 100 : 0;

      list.push({
        instrumentId: pos.instrumentId,
        symbol: pos.symbol,
        instrumentName: pos.instrumentName,
        assetClass: pos.assetClass as AssetClass,
        sector: pos.sector,
        riskBand: pos.riskBand,
        quantity: Number(pos.quantity),
        avgCostPrice: Number(pos.avgCost),
        currentPrice: Number(pos.lastPrice),
        marketValue: Math.round(mv * 100) / 100,
        costBasis: Math.round(cb * 100) / 100,
        unrealisedPnl: Math.round(pnl * 100) / 100,
        unrealisedPnlPct:
          pnlPct !== null ? Math.round(pnlPct * 100) / 100 : null,
        weightPct: weight,
        priceDate: pos.priceAsOf,
        snapshotDate: pos.snapshotDate,
      });
      positionsByAccount.set(accId, list);
    }

    const accounts: AccountPortfolio[] = accountRows.map((acc) => {
      const positions = positionsByAccount.get(acc.accountId) || [];
      const accMv = positions.reduce((sum, p) => sum + p.marketValue, 0);
      const accCb = positions.reduce((sum, p) => sum + p.costBasis, 0);
      const accPnl = accMv - accCb;
      const accPnlPct =
        accCb > 0 ? Math.round((accPnl / accCb) * 10000) / 100 : null;

      return {
        accountId: acc.accountId,
        accountType: acc.accountType,
        provider: acc.provider,
        status: acc.status as any,
        openedAt: acc.openedAt,
        baseCurrency: acc.baseCurrency,
        totalMarketValue: Math.round(accMv * 100) / 100,
        totalCostBasis: Math.round(accCb * 100) / 100,
        totalUnrealisedPnl: Math.round(accPnl * 100) / 100,
        totalUnrealisedPnlPct: accPnlPct,
        positions,
      };
    });

    // 7. Fetch Trailing 12-Month Net Flows from v_monthly_net_flows
    const monthlyCashFlow = await this.getCashFlowMonths(customerId);

    return {
      customerId,
      totalAum: Math.round(totalAum * 100) / 100,
      totalCostBasis: Math.round(totalCostBasis * 100) / 100,
      totalUnrealisedPnl: Math.round(totalUnrealisedPnl * 100) / 100,
      totalUnrealisedPnlPct,
      snapshotDate,
      priceDate,
      accounts,
      allocation,
      monthlyCashFlow,
    };
  }

  async getCustomerCashFlow(id: string): Promise<CashFlowResponse> {
    const customerId = id.trim().toUpperCase();

    const [customer] = await this.db
      .select({ customerId: schema.customers.customerId })
      .from(schema.customers)
      .where(eq(schema.customers.customerId, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }

    const months = await this.getCashFlowMonths(customerId);
    return {
      customerId,
      months,
    };
  }

  private async getCashFlowMonths(
    customerId: string,
  ): Promise<CashFlowMonth[]> {
    const rawFlows = (await this.db.execute(sql`
      SELECT
        TO_CHAR(month, 'YYYY-MM') AS "monthLabel",
        buy_total                 AS "buyTotal",
        sell_total                AS "sellTotal",
        net_flow                  AS "netFlow"
      FROM v_monthly_net_flows
      WHERE customer_id = ${customerId}
      ORDER BY month ASC;
    `)) as unknown as { rows: RawCashFlowRow[] };

    const flowRows = rawFlows.rows ?? [];
    return flowRows.map((r) => ({
      month: r.monthLabel,
      buyAmount: Math.round(Number(r.buyTotal || 0) * 100) / 100,
      sellAmount: Math.round(Number(r.sellTotal || 0) * 100) / 100,
      netFlow: Math.round(Number(r.netFlow || 0) * 100) / 100,
    }));
  }
}
