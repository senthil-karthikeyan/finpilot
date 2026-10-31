import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/lib/formatters';
import type { ImportRowResult, DataQualityItem } from '@finpilot/shared';

describe('Admin import & Data quality logic', () => {
  describe('formatBytes helper', () => {
    it('handles zero, negative, or invalid byte values', () => {
      expect(formatBytes(0)).toBe('0 KB');
      expect(formatBytes(-100)).toBe('0 KB');
      expect(formatBytes(null)).toBe('0 KB');
      expect(formatBytes(undefined)).toBe('0 KB');
      expect(formatBytes(NaN)).toBe('0 KB');
    });

    it('formats values under 1 MB in KB', () => {
      expect(formatBytes(500)).toBe('1 KB');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(51200)).toBe('50 KB');
      expect(formatBytes(500 * 1024)).toBe('500 KB');
    });

    it('formats values 1 MB or greater in MB with 1 decimal place', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1.5 * 1048576)).toBe('1.5 MB');
      expect(formatBytes(10 * 1048576)).toBe('10.0 MB');
    });
  });

  describe('Import row filtering and attention detection', () => {
    const mockRows: ImportRowResult[] = [
      {
        rowNumber: 1,
        transactionId: 'T0001',
        outcome: 'imported',
        reason: null,
      },
      {
        rowNumber: 2,
        transactionId: 'T0002',
        outcome: 'duplicate',
        reason: 'Already loaded in ledger',
      },
      {
        rowNumber: 3,
        transactionId: 'T0003',
        outcome: 'rejected',
        reason: 'Unknown instrument ID',
        errorCode: 'INVALID_INSTRUMENT_FK',
      },
      {
        rowNumber: 4,
        transactionId: 'T0004',
        outcome: 'future_dated',
        reason: 'Trade date is beyond snapshot reference date',
        errorCode: 'FUTURE_DATED',
      },
      {
        rowNumber: 5,
        transactionId: 'T0005',
        outcome: 'rejected',
        reason: 'Negative quantity is not allowed',
        errorCode: 'NEGATIVE_QUANTITY',
      },
    ];

    it('filters rows needing attention (non-duplicates)', () => {
      const attention = mockRows.filter((r) => r.outcome !== 'duplicate');
      expect(attention).toHaveLength(4);
      expect(attention.map((r) => r.transactionId)).toEqual([
        'T0001',
        'T0003',
        'T0004',
        'T0005',
      ]);
    });

    it('filters rejected rows specifically', () => {
      const rejected = mockRows.filter((r) => r.outcome === 'rejected');
      expect(rejected).toHaveLength(2);
      expect(rejected.map((r) => r.transactionId)).toEqual(['T0003', 'T0005']);
    });

    it('filters future-dated quarantined rows', () => {
      const futureDated = mockRows.filter((r) => r.outcome === 'future_dated');
      expect(futureDated).toHaveLength(1);
      expect(futureDated[0]?.transactionId).toBe('T0004');
    });

    it('generates well-formed CSV download content', () => {
      const rejectedRows = mockRows.filter((r) => r.outcome === 'rejected');
      const header = 'file_line,transaction_id,outcome,error_code,message';
      const lines = rejectedRows.map((r) => {
        const line = r.rowNumber;
        const tx = r.transactionId;
        const outcome = r.outcome;
        const code = r.errorCode ?? '';
        const msg = (r.reason || '').replace(/"/g, '""');
        return `${line},${tx},${outcome},${code},"${msg}"`;
      });

      const csv = [header, ...lines].join('\n');
      expect(csv).toContain('file_line,transaction_id,outcome,error_code,message');
      expect(csv).toContain('3,T0003,rejected,INVALID_INSTRUMENT_FK,"Unknown instrument ID"');
      expect(csv).toContain('5,T0005,rejected,NEGATIVE_QUANTITY,"Negative quantity is not allowed"');
    });
  });

  describe('Data quality aggregation logic', () => {
    const mockItems: DataQualityItem[] = [
      {
        anomaly: 'future_dated',
        count: 14,
        description: 'Transactions with trade dates after reference date',
        handling: 'Quarantined in ledger',
      },
      {
        anomaly: 'before_open_date',
        count: 8,
        description: 'Dated before account opened',
        handling: 'Flagged with before_open_flag',
      },
      {
        anomaly: 'on_closed_account',
        count: 3,
        description: 'Executed on closed accounts',
        handling: 'Flagged with on_closed_flag',
      },
      {
        anomaly: 'duplicate_transactions',
        count: 0,
        description: 'Duplicate IDs',
        handling: 'Skipped during load',
      },
    ];

    it('calculates total anomalies correctly', () => {
      const total = mockItems.reduce((acc, i) => acc + i.count, 0);
      expect(total).toBe(25);
    });

    it('categorizes out-of-bounds date counts', () => {
      const outOfBounds =
        (mockItems.find((i) => i.anomaly === 'before_open_date')?.count || 0) +
        (mockItems.find((i) => i.anomaly === 'on_closed_account')?.count || 0);
      expect(outOfBounds).toBe(11);
    });

    it('identifies clean vs warning anomaly items', () => {
      const isZeroClean = (item: DataQualityItem) => item.count === 0;
      expect(isZeroClean(mockItems[3]!)).toBe(true);
      expect(isZeroClean(mockItems[0]!)).toBe(false);
    });
  });

  describe('Paginated rejected rows & CSV endpoint logic', () => {
    it('constructs correct paginated endpoint URL with default pagination', () => {
      const batchId = 'IMP-0001';
      const page = 1;
      const pageSize = 20;
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const url = `/api/v1/admin/imports/${encodeURIComponent(batchId)}/rejected?${queryParams.toString()}`;
      expect(url).toBe('/api/v1/admin/imports/IMP-0001/rejected?page=1&pageSize=20');
    });

    it('constructs paginated endpoint URL with custom page and outcome filter', () => {
      const batchId = 'IMP-0002';
      const page = 2;
      const pageSize = 50;
      const outcome: string = 'rejected';
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (outcome && outcome !== 'all') {
        queryParams.set('outcome', outcome);
      }

      const url = `/api/v1/admin/imports/${encodeURIComponent(batchId)}/rejected?${queryParams.toString()}`;
      expect(url).toBe('/api/v1/admin/imports/IMP-0002/rejected?page=2&pageSize=50&outcome=rejected');
    });

    it('constructs direct server-side CSV download URL', () => {
      const batchId = 'IMP-0001';
      const csvUrl = `/api/v1/admin/imports/${encodeURIComponent(batchId)}/rejected/csv`;
      expect(csvUrl).toBe('/api/v1/admin/imports/IMP-0001/rejected/csv');
    });

    it('correctly calculates pagination metadata for rejected rows response', () => {
      const total = 55;
      const pageSize = 20;
      const totalPages = Math.ceil(total / pageSize);
      const currentPage = 2;
      const from = (currentPage - 1) * pageSize + 1;
      const to = Math.min(total, currentPage * pageSize);

      expect(totalPages).toBe(3);
      expect(from).toBe(21);
      expect(to).toBe(40);
    });
  });
});
