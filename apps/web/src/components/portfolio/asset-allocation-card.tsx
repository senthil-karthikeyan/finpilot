'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { inr, pct } from '@/lib/formatters';
import { ASSET_META } from '@/lib/constants';
import type { AllocationBucket } from '@finpilot/shared';

interface AssetAllocationCardProps {
  allocation: AllocationBucket[];
}

export function AssetAllocationCard({ allocation }: AssetAllocationCardProps) {
  if (!allocation || allocation.length === 0) {
    return (
      <section className="panel" aria-labelledby="alloc-heading">
        <div className="panel-head">
          <h2 className="panel-title" id="alloc-heading">
            Allocation by asset class
          </h2>
        </div>
        <div className="empty">
          <Info className="w-6 h-6 text-[var(--ink-3)]" />
          <h2 className="h2">No holdings to chart</h2>
          <p className="text-[var(--ink-2)]">
            None of this customer&apos;s accounts have positions in the latest snapshot.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="alloc-heading">
      <div className="panel-head">
        <h2 className="panel-title" id="alloc-heading">
          Allocation by asset class
        </h2>
      </div>

      <div className="panel-body" style={{ paddingTop: '6px' }}>
        <div className="tablewrap">
          <table className="tbl">
            <caption className="sr-only">Allocation by asset class</caption>
            <thead>
              <tr>
                <th scope="col">Asset class</th>
                <th scope="col" className="num">
                  Positions
                </th>
                <th scope="col" className="num">
                  Market value
                </th>
                <th scope="col" className="num">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {allocation.map((a) => {
                const meta = ASSET_META[a.assetClass] || {
                  label: a.assetClass,
                  color: '#8a9a4b',
                };
                return (
                  <tr key={a.assetClass}>
                    <td>
                      <span className="swatch" style={{ background: meta.color }} />
                      <span>{meta.label}</span>
                    </td>
                    <td className="num">{a.positionCount}</td>
                    <td className="num">{inr(a.marketValue)}</td>
                    <td className="num">
                      <b>{pct(a.weightPct)}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

