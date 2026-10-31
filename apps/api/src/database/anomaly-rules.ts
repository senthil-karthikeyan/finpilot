export interface RawTransactionInput {
  transaction_id: string;
  account_id: string;
  instrument_id?: string | null;
  transaction_type: string;
  trade_date: string;
  quantity: string;
  price: string;
  amount: string;
  status: string;
}

export interface AccountContext {
  opened_at: string;
  status: string;
}

export interface ReconciledResult {
  accepted: boolean;
  outcome: 'imported' | 'future_dated' | 'duplicate' | 'rejected';
  errorCode: string | null;
  errorMessage: string | null;
  transaction?: {
    transactionId: string;
    accountId: string;
    instrumentId: string | null;
    transactionType: 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE';
    tradeDate: string;
    quantity: string;
    price: string;
    amount: string;
    status: 'SETTLED' | 'PENDING' | 'REVERSED';
    isFuture: boolean;
    beforeOpenFlag: boolean;
    onClosedFlag: boolean;
  };
}

export const SNAPSHOT_REFERENCE_DATE = '2026-09-18';

/**
 * Reconciles a single raw transaction row against business rules,
 * security master references, and account status.
 */
export function reconcileTransactionRow(
  raw: RawTransactionInput,
  seenTxIds: Set<string>,
  validInstrumentIds: Set<string>,
  account?: AccountContext,
  referenceDate: string = SNAPSHOT_REFERENCE_DATE,
): ReconciledResult {
  // 1. Duplicate transaction ID check
  if (seenTxIds.has(raw.transaction_id)) {
    return {
      accepted: false,
      outcome: 'duplicate',
      errorCode: 'DUPLICATE_TRANSACTION_ID',
      errorMessage: `Duplicate transaction identifier ${raw.transaction_id} rejected.`,
    };
  }

  // 2. Instrument reference check (DIVIDEND/FEE can have null instrument)
  const trimmedInstrument = raw.instrument_id?.trim() || null;
  if (trimmedInstrument && !validInstrumentIds.has(trimmedInstrument)) {
    return {
      accepted: false,
      outcome: 'rejected',
      errorCode: 'INVALID_INSTRUMENT_FK',
      errorMessage: `Instrument ID ${trimmedInstrument} does not exist in instruments security master.`,
    };
  }

  // 3. Account existence check
  if (!account) {
    return {
      accepted: false,
      outcome: 'rejected',
      errorCode: 'INVALID_ACCOUNT_FK',
      errorMessage: `Account ID ${raw.account_id} does not exist.`,
    };
  }

  // 4. Inverted negative fee normalization (textbook accounting anomaly)
  let parsedAmount = parseFloat(raw.amount);
  if (parsedAmount < 0) {
    parsedAmount = Math.abs(parsedAmount);
  }
  const normalizedAmount = parsedAmount.toFixed(2);

  // 5. Future-dated pending transaction detection
  // Preserved in main ledger with is_future = true (excluded from cash flows)
  const isFuture = raw.trade_date > referenceDate;

  // 6. Pre-account opening execution anomaly flag
  const beforeOpenFlag = raw.trade_date < account.opened_at;

  // 7. Closed account execution anomaly flag
  const onClosedFlag = account.status === 'CLOSED';

  seenTxIds.add(raw.transaction_id);

  return {
    accepted: true,
    outcome: isFuture ? 'future_dated' : 'imported',
    errorCode: null,
    errorMessage: isFuture
      ? 'Future-dated pending transaction preserved in main ledger with is_future=true.'
      : null,
    transaction: {
      transactionId: raw.transaction_id,
      accountId: raw.account_id,
      instrumentId: trimmedInstrument,
      transactionType: raw.transaction_type as
        'BUY' | 'SELL' | 'DIVIDEND' | 'FEE',
      tradeDate: raw.trade_date,
      quantity: raw.quantity,
      price: raw.price,
      amount: normalizedAmount,
      status: raw.status as 'SETTLED' | 'PENDING' | 'REVERSED',
      isFuture,
      beforeOpenFlag,
      onClosedFlag,
    },
  };
}

/**
 * Deduplicates holdings snapshots keeping the first occurrence of
 * composite key (accountId, instrumentId, snapshotDate).
 */
export function deduplicateHoldings<
  T extends {
    account_id: string;
    instrument_id: string;
    snapshot_date: string;
  },
>(holdings: T[]): { unique: T[]; duplicatesCount: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicatesCount = 0;

  for (const h of holdings) {
    const key = `${h.account_id}:${h.instrument_id}:${h.snapshot_date}`;
    if (seen.has(key)) {
      duplicatesCount++;
    } else {
      seen.add(key);
      unique.push(h);
    }
  }

  return { unique, duplicatesCount };
}
