import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import type { DrizzleDb } from '../database/database.module.js';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    service = new TransactionsService(mockDb as DrizzleDb);
  });

  describe('getCustomerTransactions', () => {
    it('returns paginated transactions with metadata, joined details, and flags', async () => {
      // 1. Mock customer existence check
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };

      // 2. Mock count query
      const mockCountSelect = {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 42 }]),
          }),
        }),
      };

      // 3. Mock rows query
      const mockTxRows = [
        {
          transactionId: 'T0000001',
          accountId: 'A00001',
          accountType: 'BROKERAGE',
          instrumentId: 'I0001',
          instrumentName: 'FinPilot BlueChip Alpha',
          symbol: 'FPBCA',
          assetClass: 'EQUITY',
          transactionType: 'BUY',
          tradeDate: '2026-05-15',
          quantity: '50.000000',
          price: '1200.5000',
          amount: '60025.00',
          status: 'SETTLED',
          isFuture: false,
          beforeOpenFlag: false,
          onClosedFlag: false,
        },
      ];

      const mockRowsSelect = {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockTxRows),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) return mockCustomerSelect;
        if (selectCall === 2) return mockCountSelect;
        return mockRowsSelect;
      });

      const result = await service.getCustomerTransactions('C0001', {
        page: 1,
        limit: 10,
        sortBy: 'tradeDate',
        sortDir: 'desc',
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('T0000001');
      expect(result.data[0].transactionId).toBe('T0000001');
      expect(result.data[0].accountId).toBe('A00001');
      expect(result.data[0].accountType).toBe('BROKERAGE');
      expect(result.data[0].instrumentName).toBe('FinPilot BlueChip Alpha');
      expect(result.data[0].quantity).toBe(50);
      expect(result.data[0].price).toBe(1200.5);
      expect(result.data[0].amount).toBe(60025);
      expect(result.data[0].status).toBe('SETTLED');
      expect(result.data[0].isFuture).toBe(false);

      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        limit: 10,
        total: 42,
        totalPages: 5,
      });
      expect(result.pagination).toEqual(result.meta);
    });

    it('throws NotFoundException if customer does not exist', async () => {
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      mockDb.select.mockReturnValue(mockCustomerSelect);

      await expect(
        service.getCustomerTransactions('C9999', {
          page: 1,
          limit: 20,
          sortBy: 'tradeDate',
          sortDir: 'desc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('handles anomaly transactions and custom filtering', async () => {
      // Mock customer exists
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };

      // Mock count
      const mockCountSelect = {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 1 }]),
          }),
        }),
      };

      // Mock future-dated anomaly transaction row
      const mockAnomalyTx = [
        {
          transactionId: 'T0004553',
          accountId: 'A00001',
          accountType: 'BROKERAGE',
          instrumentId: 'I0005',
          instrumentName: 'FinPilot Future Equity',
          symbol: 'FPFE',
          assetClass: 'EQUITY',
          transactionType: 'BUY',
          tradeDate: '2026-12-01',
          quantity: '10.000000',
          price: '500.0000',
          amount: '5000.00',
          status: 'PENDING',
          isFuture: true,
          beforeOpenFlag: false,
          onClosedFlag: false,
        },
      ];

      const mockRowsSelect = {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockAnomalyTx),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) return mockCustomerSelect;
        if (selectCall === 2) return mockCountSelect;
        return mockRowsSelect;
      });

      const result = await service.getCustomerTransactions('C0001', {
        isFuture: true,
        status: 'PENDING',
        transactionType: 'BUY',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        sortBy: 'amount',
        sortDir: 'asc',
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].transactionId).toBe('T0004553');
      expect(result.data[0].isFuture).toBe(true);
      expect(result.data[0].status).toBe('PENDING');
      expect(result.meta.total).toBe(1);
    });
  });
});

