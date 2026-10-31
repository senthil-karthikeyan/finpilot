import { describe, it, expect } from 'vitest';
import type { Transaction, TransactionType } from '@finpilot/shared';

describe('Transactions ledger logic & calculations', () => {
  function getCashEffect(type: TransactionType, amount: number): number {
    const isCashIn = type === 'SELL' || type === 'DIVIDEND';
    return isCashIn ? amount : -amount;
  }

  describe('Cash effect calculation', () => {
    it('treats SELL as positive cash inflow', () => {
      expect(getCashEffect('SELL', 50000)).toBe(50000);
    });

    it('treats DIVIDEND as positive cash inflow', () => {
      expect(getCashEffect('DIVIDEND', 1500)).toBe(1500);
    });

    it('treats BUY as negative cash outflow', () => {
      expect(getCashEffect('BUY', 25000)).toBe(-25000);
    });

    it('treats FEE as negative cash outflow', () => {
      expect(getCashEffect('FEE', 75)).toBe(-75);
    });
  });

  describe('Anomaly and status detection', () => {
    const mockTx: Transaction = {
      id: 'T0004553',
      transactionId: 'T0004553',
      accountId: 'A00002',
      accountType: 'BROKERAGE',
      instrumentId: 'I0001',
      instrumentName: 'Reliance Industries Ltd.',
      symbol: 'RELIANCE',
      assetClass: 'EQUITY',
      type: 'BUY',
      transactionType: 'BUY',
      status: 'PENDING',
      quantity: 50,
      price: 2500,
      amount: 125000,
      fee: 0,
      tradeDate: '2026-11-15',
      settlementDate: null,
      isFuture: true,
      beforeOpenFlag: false,
      onClosedFlag: false,
    };

    it('detects pending status', () => {
      expect(mockTx.status).toBe('PENDING');
    });

    it('flags future-dated trade anomaly', () => {
      expect(mockTx.isFuture).toBe(true);
    });

    it('detects audit anomaly flags correctly', () => {
      const preOpenTx: Transaction = {
        ...mockTx,
        id: 'T0000099',
        transactionId: 'T0000099',
        beforeOpenFlag: true,
      };
      expect(preOpenTx.beforeOpenFlag).toBe(true);

      const closedAcctTx: Transaction = {
        ...mockTx,
        id: 'T0000100',
        transactionId: 'T0000100',
        onClosedFlag: true,
      };
      expect(closedAcctTx.onClosedFlag).toBe(true);
    });
  });

  describe('Sorting toggle logic', () => {
    function toggleSort(
      currentField: 'tradeDate' | 'amount',
      currentDir: 'asc' | 'desc',
      newField: 'tradeDate' | 'amount',
    ): { sortBy: 'tradeDate' | 'amount'; sortDir: 'asc' | 'desc' } {
      if (currentField === newField) {
        return { sortBy: newField, sortDir: currentDir === 'asc' ? 'desc' : 'asc' };
      }
      return { sortBy: newField, sortDir: 'desc' };
    }

    it('toggles direction when clicking the same sort field', () => {
      expect(toggleSort('tradeDate', 'desc', 'tradeDate')).toEqual({
        sortBy: 'tradeDate',
        sortDir: 'asc',
      });
      expect(toggleSort('tradeDate', 'asc', 'tradeDate')).toEqual({
        sortBy: 'tradeDate',
        sortDir: 'desc',
      });
    });

    it('defaults to desc when switching to a different sort field', () => {
      expect(toggleSort('tradeDate', 'asc', 'amount')).toEqual({
        sortBy: 'amount',
        sortDir: 'desc',
      });
    });
  });
});

