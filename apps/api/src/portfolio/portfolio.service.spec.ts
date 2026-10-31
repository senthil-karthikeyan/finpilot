import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service.js';
import { DrizzleDb } from '../database/database.module.js';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      execute: vi.fn(),
    };
    service = new PortfolioService(mockDb as DrizzleDb);
  });

  describe('getCustomerPortfolio', () => {
    it('calculates consolidated totals, asset allocation, account groupings, and cash flows', async () => {
      // 1. Mock customer existence check
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };

      // 2. Mock accounts query
      const mockAccounts = [
        {
          accountId: 'A00001',
          customerId: 'C0001',
          accountType: 'BROKERAGE',
          provider: 'NorthStar Securities',
          openedAt: '2025-02-01',
          status: 'ACTIVE',
          baseCurrency: 'INR',
        },
      ];
      const mockAccountsSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockAccounts),
          }),
        }),
      };

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) return mockCustomerSelect;
        return mockAccountsSelect;
      });

      // 3. Mock execute for positions view and cashflow view
      const mockPositions = [
        {
          accountId: 'A00001',
          customerId: 'C0001',
          accountType: 'BROKERAGE',
          provider: 'NorthStar Securities',
          accountStatus: 'ACTIVE',
          baseCurrency: 'INR',
          instrumentId: 'I0001',
          symbol: 'EQ001',
          instrumentName: 'FinPilot Equity 1',
          assetClass: 'EQUITY',
          sector: 'Technology',
          riskBand: 'MEDIUM',
          lastPrice: 425.5,
          priceAsOf: '2026-09-18',
          quantity: 100,
          avgCost: 350.0,
          snapshotDate: '2026-09-18',
          marketValue: 42550.0,
          costBasis: 35000.0,
          unrealisedPnl: 7550.0,
          unrealisedPnlPct: 21.57,
        },
      ];

      const mockFlows = [
        {
          monthLabel: '2026-08',
          buyTotal: 10000,
          sellTotal: 15000,
          netFlow: 5000,
        },
      ];

      let execCall = 0;
      mockDb.execute.mockImplementation(() => {
        execCall++;
        if (execCall === 1) return Promise.resolve({ rows: mockPositions });
        return Promise.resolve({ rows: mockFlows });
      });

      const portfolio = await service.getCustomerPortfolio('C0001');

      expect(portfolio.customerId).toBe('C0001');
      expect(portfolio.totalAum).toBe(42550);
      expect(portfolio.totalCostBasis).toBe(35000);
      expect(portfolio.totalUnrealisedPnl).toBe(7550);
      expect(portfolio.totalUnrealisedPnlPct).toBe(21.57);
      expect(portfolio.snapshotDate).toBe('2026-09-18');
      expect(portfolio.priceDate).toBe('2026-09-18');

      // Check allocation
      expect(portfolio.allocation.length).toBe(1);
      expect(portfolio.allocation[0]).toEqual({
        assetClass: 'EQUITY',
        marketValue: 42550,
        weightPct: 100,
        positionCount: 1,
      });

      // Check accounts
      expect(portfolio.accounts.length).toBe(1);
      expect(portfolio.accounts[0].accountId).toBe('A00001');
      expect(portfolio.accounts[0].totalMarketValue).toBe(42550);
      expect(portfolio.accounts[0].positions.length).toBe(1);

      // Check monthly cash flow
      expect(portfolio.monthlyCashFlow.length).toBe(1);
      expect(portfolio.monthlyCashFlow[0].month).toBe('2026-08');
      expect(portfolio.monthlyCashFlow[0].netFlow).toBe(5000);
    });

    it('throws NotFoundException when customer does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.getCustomerPortfolio('C9999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCustomerCashFlow', () => {
    it('returns monthly cash flow buckets for valid customer', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      });

      mockDb.execute.mockResolvedValue({
        rows: [
          {
            monthLabel: '2026-07',
            buyTotal: 5000,
            sellTotal: 2000,
            netFlow: -3000,
          },
        ],
      });

      const result = await service.getCustomerCashFlow('C0001');

      expect(result.customerId).toBe('C0001');
      expect(result.months.length).toBe(1);
      expect(result.months[0]).toEqual({
        month: '2026-07',
        buyAmount: 5000,
        sellAmount: 2000,
        netFlow: -3000,
      });
    });
  });
});

