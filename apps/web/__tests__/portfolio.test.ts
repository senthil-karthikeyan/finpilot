import { describe, it, expect } from 'vitest';
import type {
  PortfolioPosition,
  AccountPortfolio,
  CashFlowMonth,
} from '@finpilot/shared';

describe('Portfolio dashboard logic & calculations', () => {
  describe('Risk profile zone calculation', () => {
    function getRiskZone(score: number): number {
      return Math.min(3, Math.floor(score / 25));
    }

    it('maps scores into 4 risk zones correctly', () => {
      expect(getRiskZone(15)).toBe(0); // Conservative
      expect(getRiskZone(24)).toBe(0);
      expect(getRiskZone(25)).toBe(1); // Moderate
      expect(getRiskZone(49)).toBe(1);
      expect(getRiskZone(50)).toBe(2); // Growth
      expect(getRiskZone(74)).toBe(2);
      expect(getRiskZone(75)).toBe(3); // Aggressive
      expect(getRiskZone(95)).toBe(3);
      expect(getRiskZone(100)).toBe(3);
    });
  });

  describe('Stale assessment detection', () => {
    function isRiskAssessmentStale(assessedAt: string, now: number): boolean {
      const diffMs = now - new Date(assessedAt).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 180;
    }

    it('flags assessments older than 180 days as stale', () => {
      const now = new Date('2026-10-31T00:00:00Z').getTime();
      expect(isRiskAssessmentStale('2026-09-01T00:00:00Z', now)).toBe(false); // 60 days
      expect(isRiskAssessmentStale('2026-04-01T00:00:00Z', now)).toBe(true); // ~213 days
    });
  });

  describe('Positions grouping & account filtering', () => {
    const mockPositions: PortfolioPosition[] = [
      {
        instrumentId: 'I001',
        symbol: 'RELIANCE',
        instrumentName: 'Reliance Industries',
        assetClass: 'EQUITY',
        sector: 'Energy',
        riskBand: 'MEDIUM',
        quantity: 10,
        avgCostPrice: 2400,
        currentPrice: 2600,
        marketValue: 26000,
        costBasis: 24000,
        unrealisedPnl: 2000,
        unrealisedPnlPct: 8.33,
        weightPct: 70,
        priceDate: '2026-10-30',
        snapshotDate: '2026-10-30',
      },
      {
        instrumentId: 'I002',
        symbol: 'GSEC10Y',
        instrumentName: '10Y Government Bond',
        assetClass: 'GSEC',
        sector: 'Sovereign',
        riskBand: 'LOW',
        quantity: 100,
        avgCostPrice: 100,
        currentPrice: 105,
        marketValue: 10500,
        costBasis: 10000,
        unrealisedPnl: 500,
        unrealisedPnlPct: 5.0,
        weightPct: 30,
        priceDate: '2026-10-30',
        snapshotDate: '2026-10-30',
      },
    ];

    const mockAccounts: AccountPortfolio[] = [
      {
        accountId: 'A001',
        accountType: 'BROKERAGE',
        provider: 'Zenith Broking',
        status: 'ACTIVE',
        openedAt: '2024-01-01',
        baseCurrency: 'INR',
        totalMarketValue: 26000,
        totalCostBasis: 24000,
        totalUnrealisedPnl: 2000,
        totalUnrealisedPnlPct: 8.33,
        positions: [mockPositions[0]!],
      },
      {
        accountId: 'A002',
        accountType: 'MUTUAL_FUND',
        provider: 'BlueRiver MF',
        status: 'ACTIVE',
        openedAt: '2024-02-01',
        baseCurrency: 'INR',
        totalMarketValue: 10500,
        totalCostBasis: 10000,
        totalUnrealisedPnl: 500,
        totalUnrealisedPnlPct: 5.0,
        positions: [mockPositions[1]!],
      },
    ];

    it('filters positions by selected account', () => {
      const selectedAccount = 'A001';
      const filtered = mockAccounts.filter(
        (a) => !selectedAccount || a.accountId === selectedAccount,
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.accountId).toBe('A001');

      const shown = filtered.flatMap((a) => a.positions);
      expect(shown).toHaveLength(1);
      expect(shown[0]?.symbol).toBe('RELIANCE');
    });

    it('returns all positions when no account filter is applied', () => {
      const selectedAccount = '';
      const filtered = mockAccounts.filter(
        (a) => !selectedAccount || a.accountId === selectedAccount,
      );
      expect(filtered).toHaveLength(2);

      const shown = filtered.flatMap((a) => a.positions);
      expect(shown).toHaveLength(2);

      const totalMv = shown.reduce((sum, p) => sum + p.marketValue, 0);
      expect(totalMv).toBe(36500);

      const totalCost = shown.reduce((sum, p) => sum + p.costBasis, 0);
      expect(totalCost).toBe(34000);

      const totalPnl = totalMv - totalCost;
      expect(totalPnl).toBe(2500);
    });
  });

  describe('Monthly Cash Flow net flow arithmetic', () => {
    const months: CashFlowMonth[] = [
      { month: '2025-11', buyAmount: 50000, sellAmount: 20000, netFlow: -30000 },
      { month: '2025-12', buyAmount: 10000, sellAmount: 80000, netFlow: 70000 },
      { month: '2026-01', buyAmount: 0, sellAmount: 0, netFlow: 0 },
    ];

    it('computes net flow correctly as sellAmount - buyAmount', () => {
      const m0 = months[0];
      const m1 = months[1];
      if (m0 && m1) {
        expect(m0.sellAmount - m0.buyAmount).toBe(m0.netFlow);
        expect(m1.sellAmount - m1.buyAmount).toBe(m1.netFlow);
      }
    });

    it('identifies cash flow directions', () => {
      const m0 = months[0];
      const m1 = months[1];
      const m2 = months[2];
      if (m0 && m1 && m2) {
        expect(m0.netFlow < 0).toBe(true); // outflow / net bought
        expect(m1.netFlow > 0).toBe(true); // inflow / net sold
        expect(m2.netFlow === 0).toBe(true); // neutral
      }
    });
  });
});

