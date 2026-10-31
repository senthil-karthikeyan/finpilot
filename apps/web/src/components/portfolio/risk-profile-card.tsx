'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { fmtDate, cap, daysFromToday } from '@/lib/formatters';
import type { CustomerDetail } from '@finpilot/shared';

interface RiskProfileCardProps {
  risk: CustomerDetail['riskProfile'];
}

export function RiskProfileCard({ risk }: RiskProfileCardProps) {
  if (!risk) {
    return (
      <section className="panel risk" aria-labelledby="risk-heading">
        <h2 className="panel-title" id="risk-heading">
          Risk profile
        </h2>
        <div className="empty" style={{ padding: '20px 0' }}>
          <p className="text-[var(--ink-2)]">
            No risk assessment is on file for this customer. Ask the customer to complete one before
            recommending products.
          </p>
        </div>
      </section>
    );
  }

  const zone = Math.min(3, Math.floor(risk.score / 25));
  const isStale = -daysFromToday(risk.assessedAt) > 180;

  return (
    <section className="panel risk" aria-labelledby="risk-heading">
      <h2 className="panel-title" id="risk-heading">
        Risk profile
      </h2>

      <div className="risk-top">
        <span className="risk-score">{risk.score}</span>
        <span className="risk-level">
          {risk.level}
          <span className="text-[var(--ink-2)] font-normal"> · score out of 100</span>
        </span>
      </div>

      <div>
        <div
          className="ruler"
          role="img"
          aria-label={`Risk score ${risk.score} out of 100, level ${risk.level}`}
        >
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i <= zone ? 'on' : ''} />
          ))}
          <span
            className="pin"
            style={{ left: `${Math.min(100, Math.max(0, risk.score))}%` }}
          />
        </div>
        <div className="rlabels">
          <span>Conservative</span>
          <span>Moderate</span>
          <span>Growth</span>
          <span>Aggressive</span>
        </div>
      </div>

      <dl className="kv">
        <dt>Investment horizon</dt>
        <dd>{risk.horizonYears} years</dd>
        <dt>Liquidity need</dt>
        <dd>{cap(risk.liquidityNeed)}</dd>
        <dt>Assessed</dt>
        <dd>{fmtDate(risk.assessedAt)}</dd>
      </dl>

      {isStale && (
        <div className="banner" style={{ fontSize: '13.5px' }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-none mt-0.5" />
          <span>Assessed over 6 months ago. Ask for a fresh assessment before advising.</span>
        </div>
      )}
    </section>
  );
}
