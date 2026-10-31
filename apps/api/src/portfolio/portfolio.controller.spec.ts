import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PortfolioController } from './portfolio.controller.js';
import { PortfolioService } from './portfolio.service.js';
import { PortfolioResponse, CashFlowResponse } from '@finpilot/shared';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let mockService: Partial<PortfolioService>;

  beforeEach(() => {
    mockService = {
      getCustomerPortfolio: vi.fn(),
      getCustomerCashFlow: vi.fn(),
    };
    controller = new PortfolioController(mockService as PortfolioService);
  });

  describe('getPortfolio', () => {
    it('delegates to service.getCustomerPortfolio and returns response', async () => {
      const mockPortfolio: PortfolioResponse = {
        customerId: 'C0001',
        totalAum: 500000,
        totalCostBasis: 400000,
        totalUnrealisedPnl: 100000,
        totalUnrealisedPnlPct: 25.0,
        snapshotDate: '2026-09-18',
        priceDate: '2026-09-18',
        accounts: [],
        allocation: [],
        monthlyCashFlow: [],
      };

      (mockService.getCustomerPortfolio as any).mockResolvedValue(
        mockPortfolio,
      );

      const res = await controller.getPortfolio('C0001');

      expect(res).toEqual(mockPortfolio);
      expect(mockService.getCustomerPortfolio).toHaveBeenCalledWith('C0001');
    });
  });

  describe('getCashFlow', () => {
    it('delegates to service.getCustomerCashFlow and returns response', async () => {
      const mockCashFlow: CashFlowResponse = {
        customerId: 'C0001',
        months: [
          {
            month: '2026-05',
            buyAmount: 10000,
            sellAmount: 5000,
            netFlow: -5000,
          },
        ],
      };

      (mockService.getCustomerCashFlow as any).mockResolvedValue(mockCashFlow);

      const res = await controller.getCashFlow('C0001');

      expect(res).toEqual(mockCashFlow);
      expect(mockService.getCustomerCashFlow).toHaveBeenCalledWith('C0001');
    });
  });
});
