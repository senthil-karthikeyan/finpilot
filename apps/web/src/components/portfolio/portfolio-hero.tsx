'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { inr, inr0, inrShort, fmtDate, pct, sgn, pnlClass, daysFromToday } from '@/lib/formatters';
import { ASSET_META } from '@/lib/constants';
import type { PortfolioResponse } from '@finpilot/shared';

interface PortfolioHeroProps {
  portfolio: PortfolioResponse;
}

export function PortfolioHero({ portfolio }: PortfolioHeroProps) {
  const {
    totalAum,
    totalCostBasis,
    totalUnrealisedPnl,
    totalUnrealisedPnlPct,
    snapshotDate,
    priceDate,
    accounts,
    allocation,
  } = portfolio;

  const totalPositions = accounts.reduce((acc, a) => acc + a.positions.length, 0);

  // Age of price data in calendar days using system reference date (pure & deterministic)
  const priceAgeDays = priceDate ? Math.max(0, -daysFromToday(priceDate)) : 0;

  if (totalPositions === 0) {
    return (
      <section className="panel hero">
        <div>
          <div className="lbl">Portfolio value</div>
          <div className="bignum text-[var(--ink-3)]">No holdings</div>
        </div>
        <p className="text-[var(--ink-2)]">
          This customer has {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} but
          no positions in the latest snapshot.
        </p>
      </section>
    );
  }

  return (
    <section className="panel hero" aria-labelledby="pv-heading">
      <div>
        <div className="lbl" id="pv-heading">
          Portfolio value across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </div>

        <div className="bignum">
          <span className="cur">₹</span>
          {inr(totalAum).replace('₹', '')}
        </div>

        <div className="pnl">
          <span className={pnlClass(totalUnrealisedPnl)}>
            {sgn(totalUnrealisedPnl)}
            {inr(Math.abs(totalUnrealisedPnl))} ({sgn(totalUnrealisedPnl)}
            {pct(Math.abs(totalUnrealisedPnlPct ?? 0))})
          </span>
          <span className="text-[var(--ink-2)] font-normal">
            unrealised gain or loss on {inr0(totalCostBasis)} invested
          </span>
        </div>
      </div>

      {/* Asset Allocation Strip */}
      <div>
        <div
          className="strip enter"
          role="group"
          aria-label="Allocation by asset class. Details in the table below."
        >
          {allocation.map((a) => {
            const meta = ASSET_META[a.assetClass] || {
              label: a.assetClass,
              color: '#8a9a4b',
            };
            return (
              <div
                key={a.assetClass}
                className="seg"
                style={{
                  flex: `${a.weightPct} 1 0`,
                  background: meta.color,
                }}
                tabIndex={0}
                role="img"
                aria-label={`${meta.label}: ${pct(a.weightPct)} of portfolio, ${inr0(a.marketValue)}`}
              >
                <span className="tip">
                  {meta.label} {pct(a.weightPct)} · {inrShort(a.marketValue)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="legend">
          {allocation.slice(0, 4).map((a) => {
            const meta = ASSET_META[a.assetClass] || {
              label: a.assetClass,
              color: '#8a9a4b',
            };
            return (
              <span key={a.assetClass}>
                <span className="swatch" style={{ background: meta.color }} />
                {meta.label} <b>{pct(a.weightPct)}</b>
              </span>
            );
          })}
          {allocation.length > 4 && (
            <span className="faint">+{allocation.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Freshness Bar */}
      <div className="fresh">
        <span className="item">
          <span className="tick" aria-hidden="true" />
          Prices as of <b>{fmtDate(priceDate)}</b>
        </span>
        <span className="item">
          Holdings snapshot <b>{fmtDate(snapshotDate)}</b>
        </span>
        {priceAgeDays > 7 && (
          <span className="item stale">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{priceAgeDays} days old. Values may have moved.</span>
          </span>
        )}
      </div>
    </section>
  );
}
