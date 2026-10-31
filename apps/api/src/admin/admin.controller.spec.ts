import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminController } from './admin.controller.js';
import { AdminService, type UploadedCsvFile } from './admin.service.js';
import type {
  AuthUser,
  ImportResponse,
  DataQualityResponse,
  PaginatedRejectedRowsResponse,
} from '@finpilot/shared';
import type { Response } from 'express';

describe('AdminController', () => {
  let controller: AdminController;
  let mockService: {
    importTransactionsCsv: ReturnType<typeof vi.fn>;
    getImportBatches: ReturnType<typeof vi.fn>;
    getImportBatch: ReturnType<typeof vi.fn>;
    getDataQualitySummary: ReturnType<typeof vi.fn>;
    getRejectedRows: ReturnType<typeof vi.fn>;
    getRejectedRowsCsv: ReturnType<typeof vi.fn>;
  };

  const adminUser: AuthUser = {
    id: 'U000002',
    name: 'Admin User',
    email: 'admin@finpilot.test',
    role: 'ADMIN',
  };

  beforeEach(() => {
    mockService = {
      importTransactionsCsv: vi.fn(),
      getImportBatches: vi.fn(),
      getImportBatch: vi.fn(),
      getDataQualitySummary: vi.fn(),
      getRejectedRows: vi.fn(),
      getRejectedRowsCsv: vi.fn(),
    };
    controller = new AdminController(mockService as unknown as AdminService);
  });

  describe('importTransactions', () => {
    it('delegates to service.importTransactionsCsv with file and user email', async () => {
      const mockFile = { originalname: 'txs.csv' } as UploadedCsvFile;
      const mockResult: ImportResponse = {
        batchId: 'IMP-0001',
        fileName: 'txs.csv',
        totalRows: 10,
        imported: 8,
        futureDated: 0,
        duplicate: 1,
        rejected: 1,
        rows: [],
      };

      mockService.importTransactionsCsv.mockResolvedValue(mockResult);

      const res = await controller.importTransactions(mockFile, adminUser);

      expect(res).toEqual(mockResult);
      expect(mockService.importTransactionsCsv).toHaveBeenCalledWith(
        mockFile,
        'admin@finpilot.test',
      );
    });
  });

  describe('getImportBatches', () => {
    it('delegates to service.getImportBatches', async () => {
      mockService.getImportBatches.mockResolvedValue([]);

      const res = await controller.getImportBatches();

      expect(res).toEqual([]);
      expect(mockService.getImportBatches).toHaveBeenCalled();
    });
  });

  describe('getImportBatch', () => {
    it('delegates to service.getImportBatch with batchId', async () => {
      const mockBatchResult = {
        batch: {
          batchId: 'IMP-0001',
          fileName: 'txs.csv',
          importedBy: 'admin@finpilot.test',
          importedAt: '2026-09-18T00:00:00Z',
          totalRows: 10,
          imported: 8,
          futureDated: 0,
          duplicate: 1,
          rejected: 1,
          status: 'COMPLETED',
        },
        rows: [],
      };
      mockService.getImportBatch.mockResolvedValue(mockBatchResult);

      const res = await controller.getImportBatch('IMP-0001');

      expect(res).toEqual(mockBatchResult);
      expect(mockService.getImportBatch).toHaveBeenCalledWith('IMP-0001');
    });
  });

  describe('getRejectedRows', () => {
    it('delegates to service.getRejectedRows with pagination', async () => {
      const mockResult: PaginatedRejectedRowsResponse = {
        data: [
          {
            rowNumber: 2,
            transactionId: 'T0002',
            outcome: 'rejected',
            reason: 'Unknown account',
          },
        ],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      };
      mockService.getRejectedRows.mockResolvedValue(mockResult);

      const res = await controller.getRejectedRows('IMP-0001', '1', '100');

      expect(res).toEqual(mockResult);
      expect(mockService.getRejectedRows).toHaveBeenCalledWith('IMP-0001', 1, 100);
    });
  });

  describe('downloadRejectedRowsCsv', () => {
    it('sets response headers and sends csv', async () => {
      const csvStr = 'line_number,transaction_id,outcome\n2,T0002,rejected\n';
      mockService.getRejectedRowsCsv.mockResolvedValue(csvStr);

      const setHeader = vi.fn();
      const send = vi.fn();
      const mockRes = { setHeader, send } as unknown as Response;

      await controller.downloadRejectedRowsCsv('IMP-0001', mockRes);

      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="rejected_rows_IMP-0001.csv"',
      );
      expect(send).toHaveBeenCalledWith(csvStr);
    });
  });

  describe('getDataQualitySummary', () => {
    it('delegates to service.getDataQualitySummary', async () => {
      const mockDQResult: DataQualityResponse = {
        items: [],
        generatedAt: '2026-09-18T00:00:00Z',
      };
      mockService.getDataQualitySummary.mockResolvedValue(mockDQResult);

      const res = await controller.getDataQualitySummary();

      expect(res).toEqual(mockDQResult);
      expect(mockService.getDataQualitySummary).toHaveBeenCalled();
    });
  });
});
