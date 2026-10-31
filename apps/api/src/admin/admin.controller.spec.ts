import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import type { AuthUser } from '@finpilot/shared';

describe('AdminController', () => {
  let controller: AdminController;
  let mockService: Partial<AdminService>;

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
    };
    controller = new AdminController(mockService as AdminService);
  });

  describe('importTransactions', () => {
    it('delegates to service.importTransactionsCsv with file and user email', async () => {
      const mockFile: any = { originalname: 'txs.csv' };
      const mockResult: any = { batchId: 'IMP-0001', imported: 10 };

      (mockService.importTransactionsCsv as any).mockResolvedValue(mockResult);

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
      (mockService.getImportBatches as any).mockResolvedValue([]);

      const res = await controller.getImportBatches();

      expect(res).toEqual([]);
      expect(mockService.getImportBatches).toHaveBeenCalled();
    });
  });

  describe('getImportBatch', () => {
    it('delegates to service.getImportBatch with batchId', async () => {
      const mockBatchResult: any = { batch: {}, rows: [] };
      (mockService.getImportBatch as any).mockResolvedValue(mockBatchResult);

      const res = await controller.getImportBatch('IMP-0001');

      expect(res).toEqual(mockBatchResult);
      expect(mockService.getImportBatch).toHaveBeenCalledWith('IMP-0001');
    });
  });

  describe('getDataQualitySummary', () => {
    it('delegates to service.getDataQualitySummary', async () => {
      const mockDQResult: any = { items: [], generatedAt: '2026-09-18' };
      (mockService.getDataQualitySummary as any).mockResolvedValue(mockDQResult);

      const res = await controller.getDataQualitySummary();

      expect(res).toEqual(mockDQResult);
      expect(mockService.getDataQualitySummary).toHaveBeenCalled();
    });
  });
});
