import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
import type { PaginatedTransactionsResponse } from '@finpilot/shared';
import { GetTransactionsDto } from './dto/get-transactions.dto.js';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let mockService: Partial<TransactionsService>;

  beforeEach(() => {
    mockService = {
      getCustomerTransactions: vi.fn(),
    };
    controller = new TransactionsController(
      mockService as TransactionsService,
    );
  });

  describe('getCustomerTransactions', () => {
    it('delegates to service.getCustomerTransactions and returns result', async () => {
      const mockResponse: PaginatedTransactionsResponse = {
        data: [
          {
            id: 'T0000001',
            transactionId: 'T0000001',
            accountId: 'A00001',
            accountType: 'BROKERAGE',
            instrumentId: 'I0001',
            instrumentName: 'FinPilot BlueChip Alpha',
            symbol: 'FPBCA',
            assetClass: 'EQUITY',
            type: 'BUY',
            transactionType: 'BUY',
            status: 'SETTLED',
            quantity: 50,
            price: 1200.5,
            amount: 60025,
            tradeDate: '2026-05-15',
            isFuture: false,
            beforeOpenFlag: false,
            onClosedFlag: false,
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      (mockService.getCustomerTransactions as any).mockResolvedValue(
        mockResponse,
      );

      const query: GetTransactionsDto = {
        page: 1,
        limit: 20,
        sortBy: 'tradeDate',
        sortDir: 'desc',
      };

      const result = await controller.getCustomerTransactions('C0001', query);

      expect(result).toEqual(mockResponse);
      expect(mockService.getCustomerTransactions).toHaveBeenCalledWith(
        'C0001',
        query,
      );
    });
  });
});

