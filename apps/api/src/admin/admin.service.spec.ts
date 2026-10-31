import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import type { DrizzleDb } from '../database/database.module.js';

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    service = new AdminService(mockDb as DrizzleDb);
  });

  describe('importTransactionsCsv', () => {
    it('throws BadRequestException if file is missing or has no buffer', async () => {
      await expect(
        service.importTransactionsCsv(null as any, 'admin@finpilot.test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes CSV rows, rejects invalid FKs, and inserts valid transactions', async () => {
      const csvContent = [
        'transaction_id,account_id,instrument_id,transaction_type,trade_date,quantity,price,amount,status',
        'T9999001,A00001,I0001,BUY,2026-05-01,10,100,1000,SETTLED',
        'T9999002,A00001,I9999,BUY,2026-05-01,10,100,1000,SETTLED', // invalid instrument
      ].join('\n');

      const mockFile: any = {
        originalname: 'test_txs.csv',
        buffer: Buffer.from(csvContent, 'utf8'),
        size: csvContent.length,
      };

      // Mock DB reference queries
      const mockInstruments = [{ instrumentId: 'I0001' }];
      const mockAccounts = [
        { accountId: 'A00001', openedAt: '2025-01-01', status: 'ACTIVE' },
      ];
      const mockExistingTxs: any[] = [];
      const mockBatchCount = [{ count: 1 }];

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          return { from: vi.fn().mockResolvedValue(mockInstruments) };
        }
        if (selectCall === 2) {
          return { from: vi.fn().mockResolvedValue(mockAccounts) };
        }
        if (selectCall === 3) {
          return { from: vi.fn().mockResolvedValue(mockExistingTxs) };
        }
        return { from: vi.fn().mockResolvedValue(mockBatchCount) };
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      });

      const result = await service.importTransactionsCsv(
        mockFile,
        'admin@finpilot.test',
      );

      expect(result.batchId).toBe('IMP-0002');
      expect(result.totalRows).toBe(2);
      expect(result.imported).toBe(1);
      expect(result.rejected).toBe(1);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].outcome).toBe('rejected');
    });
  });

  describe('getImportBatches', () => {
    it('returns formatted list of import batches', async () => {
      const mockBatches = [
        {
          batchId: 'BATCH-INITIAL-SEED',
          fileName: 'transactions.csv',
          importedBy: 'system/seed',
          receivedAt: new Date('2026-09-18T00:00:00Z'),
          rowCount: 4554,
          importedCount: 4552,
          futureDatedCount: 1,
          duplicateCount: 1,
          rejectedCount: 1,
          durationMs: 1200,
          status: 'COMPLETED',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockBatches),
        }),
      });

      const res = await service.getImportBatches();

      expect(res).toHaveLength(1);
      expect(res[0].batchId).toBe('BATCH-INITIAL-SEED');
      expect(res[0].imported).toBe(4552);
    });
  });

  describe('getImportBatch', () => {
    it('returns batch and audit rows when found', async () => {
      const mockBatch = {
        batchId: 'IMP-0001',
        fileName: 'batch1.csv',
        importedBy: 'admin@finpilot.test',
        receivedAt: new Date('2026-09-18T00:00:00Z'),
        rowCount: 10,
        importedCount: 9,
        futureDatedCount: 0,
        duplicateCount: 0,
        rejectedCount: 1,
        durationMs: 50,
        status: 'COMPLETED',
      };

      const mockRows = [
        {
          id: 1,
          lineNumber: 2,
          transactionId: 'T0001',
          outcome: 'rejected',
          errorCode: 'INVALID_INSTRUMENT_FK',
          errorMessage: 'Instrument not found',
          rawData: {},
          createdAt: new Date('2026-09-18T00:00:00Z'),
        },
      ];

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockBatch]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockRows),
            }),
          }),
        };
      });

      const res = await service.getImportBatch('IMP-0001');

      expect(res.batch.batchId).toBe('IMP-0001');
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].errorCode).toBe('INVALID_INSTRUMENT_FK');
    });

    it('throws NotFoundException if batch does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.getImportBatch('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDataQualitySummary', () => {
    it('aggregates counts for all anomaly types', async () => {
      let call = 0;
      mockDb.select.mockImplementation(() => {
        call++;
        const count = call === 1 ? 1 : call === 2 ? 2 : call === 3 ? 3 : 4;
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count }]),
          }),
        };
      });

      const res = await service.getDataQualitySummary();

      expect(res.items).toHaveLength(5);
      expect(res.items.map((i) => i.anomaly)).toEqual([
        'future_dated',
        'before_open_date',
        'on_closed_account',
        'duplicate_transactions',
        'invalid_references',
      ]);
    });
  });

  describe('getRejectedRows', () => {
    it('returns paginated rejected rows for a batch', async () => {
      let call = 0;
      mockDb.select.mockImplementation(() => {
        call++;
        if (call === 1) {
          // Find batch
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ batchId: 'IMP-0001' }]),
              }),
            }),
          };
        }
        if (call === 2) {
          // Count rejected rows
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: 1 }]),
            }),
          };
        }
        // Fetch rows
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([
                    {
                      lineNumber: 3,
                      transactionId: 'T0002',
                      outcome: 'rejected',
                      errorMessage: 'Invalid FK',
                    },
                  ]),
                }),
              }),
            }),
          }),
        };
      });

      const res = await service.getRejectedRows('IMP-0001', 1, 100);

      expect(res.data).toHaveLength(1);
      expect(res.data[0].rowNumber).toBe(3);
      expect(res.data[0].outcome).toBe('rejected');
      expect(res.meta).toEqual({
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1,
      });
    });

    it('throws NotFoundException when batch does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.getRejectedRows('NONEXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRejectedRowsCsv', () => {
    it('generates CSV string for rejected rows', async () => {
      let call = 0;
      mockDb.select.mockImplementation(() => {
        call++;
        if (call === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ batchId: 'IMP-0001' }]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  lineNumber: 2,
                  transactionId: 'T0001',
                  outcome: 'rejected',
                  errorCode: 'ERR_1',
                  errorMessage: 'Error msg',
                  rawData: null,
                },
              ]),
            }),
          }),
        };
      });

      const csv = await service.getRejectedRowsCsv('IMP-0001');
      expect(csv).toContain('line_number,transaction_id,outcome,error_code,reason,raw_data');
      expect(csv).toContain('2,T0001,rejected,ERR_1,"Error msg",""');
    });
  });
});

