import { describe, it, expect, beforeEach } from 'vitest';
import {
  reconcileTransactionRow,
  deduplicateHoldings,
  SNAPSHOT_REFERENCE_DATE,
  type RawTransactionInput,
  type AccountContext,
} from './anomaly-rules.js';

describe('Database Anomaly Reconciliation Rules', () => {
  let seenTxIds: Set<string>;
  let validInstrumentIds: Set<string>;
  let activeAccount: AccountContext;
  let closedAccount: AccountContext;

  beforeEach(() => {
    seenTxIds = new Set<string>(['T0000001']);
    validInstrumentIds = new Set<string>(['I0001', 'I0002', 'I0037']);
    activeAccount = {
      opened_at: '2025-06-01',
      status: 'ACTIVE',
    };
    closedAccount = {
      opened_at: '2025-01-01',
      status: 'CLOSED',
    };
  });

  describe('reconcileTransactionRow', () => {
    it('accepts and normalizes a standard settled BUY transaction', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0000002',
        account_id: 'A00001',
        instrument_id: 'I0001',
        transaction_type: 'BUY',
        trade_date: '2026-01-15',
        quantity: '10',
        price: '150.50',
        amount: '1505.00',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        activeAccount,
      );

      expect(result.accepted).toBe(true);
      expect(result.outcome).toBe('imported');
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.amount).toBe('1505.00');
      expect(result.transaction?.isFuture).toBe(false);
      expect(result.transaction?.beforeOpenFlag).toBe(false);
      expect(result.transaction?.onClosedFlag).toBe(false);
      expect(seenTxIds.has('T0000002')).toBe(true);
    });

    it('rejects duplicate transaction identifiers (e.g. line 4552 T0000026)', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0000001', // Already in seenTxIds
        account_id: 'A00001',
        instrument_id: 'I0001',
        transaction_type: 'BUY',
        trade_date: '2026-01-15',
        quantity: '10',
        price: '150.50',
        amount: '1505.00',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        activeAccount,
      );

      expect(result.accepted).toBe(false);
      expect(result.outcome).toBe('duplicate');
      expect(result.errorCode).toBe('DUPLICATE_TRANSACTION_ID');
      expect(result.errorMessage).toContain('T0000001');
    });

    it('rejects transactions referencing non-existent instrument foreign keys (e.g. line 4553 I9999)', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0004551',
        account_id: 'A00001',
        instrument_id: 'I9999', // Not in validInstrumentIds
        transaction_type: 'BUY',
        trade_date: '2026-09-15',
        quantity: '10',
        price: '100',
        amount: '1000',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        activeAccount,
      );

      expect(result.accepted).toBe(false);
      expect(result.outcome).toBe('rejected');
      expect(result.errorCode).toBe('INVALID_INSTRUMENT_FK');
      expect(result.errorMessage).toContain('I9999');
    });

    it('rejects transactions referencing non-existent accounts', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0000999',
        account_id: 'A99999',
        instrument_id: 'I0001',
        transaction_type: 'BUY',
        trade_date: '2026-05-15',
        quantity: '1',
        price: '100',
        amount: '100',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        undefined, // No account context
      );

      expect(result.accepted).toBe(false);
      expect(result.outcome).toBe('rejected');
      expect(result.errorCode).toBe('INVALID_ACCOUNT_FK');
    });

    it('normalizes inverted negative fee amount to positive cash ledger amount (e.g. line 4554 FEE -75)', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0004552',
        account_id: 'A00002',
        instrument_id: 'I0001',
        transaction_type: 'FEE',
        trade_date: '2026-08-22',
        quantity: '0',
        price: '0',
        amount: '-75',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        activeAccount,
      );

      expect(result.accepted).toBe(true);
      expect(result.outcome).toBe('imported');
      expect(result.transaction?.amount).toBe('75.00');
    });

    it('flags future-dated pending transactions with isFuture=true without quarantine (e.g. line 4555 T0004553 2027-01-05)', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0004553',
        account_id: 'A00003',
        instrument_id: 'I0002',
        transaction_type: 'BUY',
        trade_date: '2027-01-05',
        quantity: '2',
        price: '210',
        amount: '420',
        status: 'PENDING',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        activeAccount,
        SNAPSHOT_REFERENCE_DATE,
      );

      expect(result.accepted).toBe(true);
      expect(result.outcome).toBe('future_dated');
      expect(result.transaction?.isFuture).toBe(true);
      expect(result.transaction?.status).toBe('PENDING');
      expect(result.transaction?.tradeDate).toBe('2027-01-05');
    });

    it('flags transactions executed before account opening date (beforeOpenFlag)', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0000100',
        account_id: 'A00001',
        instrument_id: 'I0001',
        transaction_type: 'BUY',
        trade_date: '2025-01-10', // Account opened_at is 2025-06-01
        quantity: '5',
        price: '100',
        amount: '500',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        activeAccount,
      );

      expect(result.accepted).toBe(true);
      expect(result.transaction?.beforeOpenFlag).toBe(true);
    });

    it('flags transactions executed on closed accounts (onClosedFlag)', () => {
      const raw: RawTransactionInput = {
        transaction_id: 'T0000200',
        account_id: 'A00024',
        instrument_id: 'I0001',
        transaction_type: 'BUY',
        trade_date: '2026-03-01',
        quantity: '5',
        price: '100',
        amount: '500',
        status: 'SETTLED',
      };

      const result = reconcileTransactionRow(
        raw,
        seenTxIds,
        validInstrumentIds,
        closedAccount,
      );

      expect(result.accepted).toBe(true);
      expect(result.transaction?.onClosedFlag).toBe(true);
    });
  });

  describe('deduplicateHoldings', () => {
    it('removes duplicate position rows with identical account_id, instrument_id, snapshot_date', () => {
      const rawHoldings = [
        {
          account_id: 'A00145',
          instrument_id: 'I0036',
          snapshot_date: '2026-09-18',
          val: 1,
        },
        {
          account_id: 'A00146',
          instrument_id: 'I0010',
          snapshot_date: '2026-09-18',
          val: 2,
        },
        {
          account_id: 'A00145',
          instrument_id: 'I0036',
          snapshot_date: '2026-09-18',
          val: 3,
        }, // Duplicate
      ];

      const { unique, duplicatesCount } = deduplicateHoldings(rawHoldings);

      expect(unique.length).toBe(2);
      expect(duplicatesCount).toBe(1);
      expect(unique[0].val).toBe(1);
    });
  });
});
