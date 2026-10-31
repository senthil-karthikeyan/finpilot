'use client';

import React from 'react';
import { inr0, inrShort, sgn, pnlClass } from '@/lib/formatters';
import type { CashFlowMonth } from '@finpilot/shared';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface CashFlowChartProps {
  months: CashFlowMonth[];
}

export function CashFlowChart({ months }: CashFlowChartProps) {
  const allZero = months.every((m) => m.buyAmount === 0 && m.sellAmount === 0);

  if (!months.length || allZero) {
    return (
      <section className="panel" aria-labelledby="cf-heading">
        <div className="panel-head">
          <div>
            <h2 className="panel-title" id="cf-heading">
              Net cash flow by month
            </h2>
            <p className="hint text-[12.5px] text-[var(--ink-3)]">
              Settled buys and sells over trailing 12 months
            </p>
          </div>
        </div>
        <div className="panel-body">
          <div className="empty" style={{ padding: '30px 0' }}>
            <p className="text-[var(--ink-2)]">
              No settled buys or sells in the last 12 months.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const W = 620;
  const H = 220;
  const top = 14;
  const bot = 30;
  const left = 6;
  const right = 6;
  const mid = top + (H - top - bot) / 2;
  const half = (H - top - bot) / 2 - 6;

  const maxAbs = Math.max(...months.map((m) => Math.abs(m.netFlow)), 1);
  const count = months.length || 12;
  const slot = (W - left - right) / count;
  const bw = slot * 0.56;

  return (
    <section className="panel" aria-labelledby="cf-heading">
      <div className="panel-head">
        <div>
          <h2 className="panel-title" id="cf-heading">
            Net cash flow by month
          </h2>
          <p className="hint text-[12.5px] text-[var(--ink-3)]">
            Settled buys and sells over trailing 12 months
          </p>
        </div>
      </div>

      <div className="panel-body">
        <svg
          className="flow"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Monthly net cash flow, last 12 months. Details in the table below."
        >
          {months.map((m, i) => {
            const h = Math.max(1.5, (Math.abs(m.netFlow) / maxAbs) * half);
            const x = left + i * slot + (slot - bw) / 2;
            const y = m.netFlow >= 0 ? mid - h : mid;

            const parts = m.month.split('-');
            const yr = Number(parts[0]);
            const mo = Number(parts[1]);
            const monthLabel = MONTH_NAMES[mo - 1] || m.month;

            return (
              <g key={m.month}>
                <title>
                  {`${monthLabel} ${yr}: bought ${inr0(m.buyAmount)}, sold ${inr0(
                    m.sellAmount,
                  )}, net ${sgn(m.netFlow)}${inr0(Math.abs(m.netFlow))}`}
                </title>
                <rect
                  className={`${m.netFlow >= 0 ? 'pos' : 'neg'} b`}
                  x={x}
                  y={y}
                  width={bw}
                  height={h}
                  rx={2}
                />
                <text x={x + bw / 2} y={H - 10} textAnchor="middle">
                  {monthLabel}
                  {mo === 1 ? ` ’${String(yr).slice(2)}` : ''}
                </text>
              </g>
            );
          })}

          <line className="zero" x1={left} x2={W - right} y1={mid} y2={mid} />
          <text x={left} y={top - 2}>
            Up to +{inrShort(maxAbs)}
          </text>
        </svg>

        <div className="flow-legend">
          <span>
            <span className="swatch" style={{ background: 'var(--indigo)' }} />
            Sold more than bought
          </span>
          <span>
            <span className="swatch" style={{ background: '#b9812a' }} />
            Bought more than sold
          </span>
        </div>

        <details style={{ marginTop: '8px' }}>
          <summary className="linkbtn" style={{ display: 'inline-block' }}>
            Show as a table
          </summary>
          <div className="tablewrap mt-2">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col" className="num">
                    Bought
                  </th>
                  <th scope="col" className="num">
                    Sold
                  </th>
                  <th scope="col" className="num">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td className="num">{inr0(m.buyAmount)}</td>
                    <td className="num">{inr0(m.sellAmount)}</td>
                    <td className={`num ${pnlClass(m.netFlow)}`}>
                      {sgn(m.netFlow)}
                      {inr0(Math.abs(m.netFlow))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

