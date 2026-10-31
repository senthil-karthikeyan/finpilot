'use client';

import React from 'react';
import Link from 'next/link';
import { inrShort, pct, cap } from '@/lib/formatters';
import { GOAL_TYPE_LABELS } from '@/lib/constants';
import type { Goal } from '@finpilot/shared';

interface GoalsPreviewCardProps {
  customerId: string;
  goals: Goal[];
}

export function GoalsPreviewCard({ customerId, goals }: GoalsPreviewCardProps) {
  // Sort goals by priority then progress
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sortedGoals = [...goals].sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] || a.fundedPct - b.fundedPct,
  );
  const displayGoals = sortedGoals.slice(0, 4);

  return (
    <section className="panel" aria-labelledby="g-heading">
      <div className="panel-head" style={{ paddingBottom: '6px' }}>
        <h2 className="panel-title" id="g-heading">
          Goals
        </h2>
        <Link href={`/customers/${customerId}/goals`} className="text-sm">
          Manage goals
        </Link>
      </div>

      <div className="rows">
        {displayGoals.length ? (
          displayGoals.map((g) => {
            const typeLabel =
              GOAL_TYPE_LABELS[g.goalType || g.type] || cap(g.goalType || g.type);
            const isHighBehind = g.priority === 'HIGH' && g.fundedPct < 25;
            const isDone = g.fundedPct >= 100;
            const barClass = isHighBehind ? 'low' : isDone ? 'done' : '';

            const priorityBadgeClass =
              g.priority === 'HIGH'
                ? 'indigo'
                : g.priority === 'LOW'
                  ? 'outline'
                  : '';

            return (
              <div key={g.goalId || g.id} className="goal-mini">
                <div className="top">
                  <b>{g.goalName || g.name}</b>
                  <b>{pct(g.fundedPct, 0)}</b>
                </div>

                <div
                  className={`bar ${barClass}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(g.fundedPct))}
                  aria-label={`${g.goalName || g.name} funded`}
                >
                  <i
                    style={{
                      width: `${Math.min(100, Math.max(0, g.fundedPct))}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[var(--ink-2)] text-[13px]">
                  <span>
                    {typeLabel}: {inrShort(g.currentFundedAmount || g.currentAmount)} of{' '}
                    {inrShort(g.targetAmount)}
                  </span>
                  <span className={`badge ${priorityBadgeClass}`}>
                    {cap(g.priority)} priority
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">
            <p className="text-[var(--ink-2)]">No goals yet.</p>
            <Link href={`/customers/${customerId}/goals`} className="btn ghost sm">
              Add a goal
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

