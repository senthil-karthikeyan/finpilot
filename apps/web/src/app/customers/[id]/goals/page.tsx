'use client';

import React, { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Target, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { TableLoadingBar } from '@/components/ui/table-loading-bar';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CustomerHeader } from '@/components/customers/customer-header';
import { GoalDialog } from '@/components/goals/goal-dialog';
import { DeleteGoalDialog } from '@/components/goals/delete-goal-dialog';
import { useCustomer } from '@/hooks/use-portfolio';
import { useCustomerGoals } from '@/hooks/use-goals';
import {
  inr0,
  inrShort,
  pct,
  cap,
  fmtDate,
  relFuture,
} from '@/lib/formatters';
import { GOAL_TYPE_LABELS } from '@/lib/constants';
import type { Goal } from '@finpilot/shared';

function GoalsContent() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const {
    data: customer,
    isLoading: isCustLoading,
    isError: isCustError,
    error: custError,
    refetch: refetchCust,
  } = useCustomer(id);

  const {
    data: goals = [],
    isLoading: isGoalsLoading,
    isError: isGoalsError,
    error: goalsError,
    refetch: refetchGoals,
    isFetching: isGoalsFetching,
  } = useCustomerGoals(id);

  // Modal dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const handleOpenCreate = () => {
    setSelectedGoal(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (g: Goal) => {
    setSelectedGoal(g);
    setDialogOpen(true);
  };

  const handleOpenDelete = (g: Goal) => {
    setGoalToDelete(g);
    setDeleteDialogOpen(true);
  };

  // Sort goals by priority (HIGH -> MEDIUM -> LOW) then fundedPct ascending
  const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sortedGoals = [...goals].sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2) ||
      a.fundedPct - b.fundedPct,
  );

  // Summary statistics
  const count = goals.length;
  const targetTotal = goals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);
  const fundedTotal = goals.reduce(
    (acc, g) => acc + (g.currentFundedAmount ?? g.currentAmount ?? 0),
    0,
  );

  const flaggedCount = goals.filter((g) => {
    const due = relFuture(g.targetDate);
    const isOverdue = g.isOverdue || (due.late && g.fundedPct < 100);
    const isOverFunded =
      (g.currentFundedAmount ?? g.currentAmount ?? 0) > g.targetAmount;
    const isHighBehind = g.priority === 'HIGH' && g.fundedPct < 25;
    return isOverdue || isOverFunded || isHighBehind;
  }).length;

  const customerContext = customer
    ? {
        id: customer.id,
        name: customer.name,
        segment: customer.segment,
        kycStatus: customer.kycStatus,
      }
    : undefined;

  return (
    <ProtectedRoute>
      <AppShell customerContext={customerContext}>
        {isCustLoading ? (
          <div className="space-y-4 relative" style={{ opacity: isGoalsFetching ? 0.7 : 1, transition: 'opacity 0.15s ease' }}>
                    <TableLoadingBar isFetching={isGoalsFetching && !isGoalsLoading} message="Updating financial goals..." />
            <div className="skel" style={{ height: '40px', width: '320px' }} />
            <div className="skel" style={{ height: '20px', width: '220px' }} />
            <div className="skel" style={{ height: '360px', marginTop: '24px' }} />
          </div>
        ) : isCustError || !customer ? (
          <div className="panel panel-body text-center py-12">
            <p className="text-[var(--loss)] font-semibold mb-2">
              {custError?.message || `Customer "${id}" could not be found.`}
            </p>
            <button className="btn ghost sm mt-2" onClick={() => refetchCust()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <CustomerHeader customer={customer} activeTab="goals" />

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4.5 mt-2">
              <p className="text-[var(--ink-2)] text-sm max-w-[62ch]">
                Funded percentage is the funded amount divided by the target. High-priority goals
                under 25% funded are flagged.
              </p>
              <button
                type="button"
                className="btn"
                onClick={handleOpenCreate}
                data-action="new-goal"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New goal
              </button>
            </div>

            <div id="goal-region" aria-busy={isGoalsLoading || isGoalsFetching}>
              {/* Summary line */}
              {count > 0 && (
                <div className="summary-line panel panel-body mb-5">
                  <div>
                    <b>{count}</b>
                    <span>{count === 1 ? 'goal' : 'goals'}</span>
                  </div>
                  <div>
                    <b>{inrShort(targetTotal)}</b>
                    <span>combined target</span>
                  </div>
                  <div>
                    <b>{pct(targetTotal ? (fundedTotal / targetTotal) * 100 : 0, 0)}</b>
                    <span>funded overall</span>
                  </div>
                  <div>
                    <b className={flaggedCount > 0 ? 'down' : ''}>{flaggedCount}</b>
                    <span>need attention</span>
                  </div>
                </div>
              )}

              {/* Goals list or state */}
              {isGoalsLoading ? (
                <div className="panel p-6 space-y-4">
                  <div className="skel" style={{ height: '48px' }} />
                  <div className="skel" style={{ height: '48px' }} />
                  <div className="skel" style={{ height: '48px' }} />
                </div>
              ) : isGoalsError ? (
                <div className="panel panel-body text-center py-8">
                  <div className="errsum inline-flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4" />
                    <span>{goalsError?.message || 'Failed to load goals.'}</span>
                  </div>
                  <br />
                  <button
                    type="button"
                    className="btn ghost sm mt-1"
                    onClick={() => refetchGoals()}
                  >
                    Retry
                  </button>
                </div>
              ) : count === 0 ? (
                <div className="panel">
                  <div className="empty">
                    <Target className="w-7 h-7 text-[var(--ink-2)]" />
                    <h2 className="h2 mt-2">No goals yet</h2>
                    <p className="text-[var(--ink-2)]">
                      Add the first goal to track how much of it is funded and when it is due.
                    </p>
                    <button
                      type="button"
                      className="btn mt-3"
                      onClick={handleOpenCreate}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add a goal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="panel">
                  <div className="rows">
                    {sortedGoals.map((g) => {
                      const goalId = g.goalId || g.id;
                      const goalName = g.goalName || g.name;
                      const gType = g.goalType || g.type;
                      const typeLabel = GOAL_TYPE_LABELS[gType] || cap(gType);
                      const due = relFuture(g.targetDate);

                      const fundedAmount =
                        g.currentFundedAmount ?? g.currentAmount ?? 0;
                      const isOverdue =
                        g.isOverdue || (due.late && g.fundedPct < 100);
                      const isOverFunded = fundedAmount > g.targetAmount;
                      const isHighBehind =
                        g.priority === 'HIGH' && g.fundedPct < 25;
                      const isDone = g.fundedPct >= 100;

                      const priorityBadgeClass =
                        g.priority === 'HIGH'
                          ? 'indigo'
                          : g.priority === 'LOW'
                            ? 'outline'
                            : '';

                      return (
                        <div key={goalId} className="goal-row">
                          <div>
                            <div className="name">{goalName}</div>
                            <div className="text-[var(--ink-2)] text-[13.5px] mt-0.5">
                              {typeLabel}, due {fmtDate(g.targetDate)}{' '}
                              <span
                                className={due.late ? 'down' : ''}
                                style={due.late ? { fontWeight: 600 } : undefined}
                              >
                                ({due.text})
                              </span>
                            </div>
                            <div className="flags">
                              <span className={`badge ${priorityBadgeClass}`}>
                                {cap(g.priority)} priority
                              </span>
                              {isOverdue && (
                                <span className="badge bad flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Overdue
                                </span>
                              )}
                              {isOverFunded && (
                                <span className="badge warn flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Funded above target
                                </span>
                              )}
                              {isHighBehind && (
                                <span className="badge bad flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  High priority, under 25% funded
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="prog">
                            <div
                              className={`bar ${isHighBehind ? 'low' : isDone ? 'done' : ''}`}
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.min(
                                100,
                                Math.round(g.fundedPct),
                              )}
                              aria-label={`${goalName} funded`}
                            >
                              <i
                                style={{
                                  width: `${Math.min(100, Math.max(0, g.fundedPct))}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between items-center mt-1.5 text-[13.5px]">
                              <span>
                                <b>{pct(g.fundedPct)}</b> funded
                              </span>
                              <span className="text-[var(--ink-2)]">
                                {inr0(fundedAmount)} of {inr0(g.targetAmount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => handleOpenEdit(g)}
                              aria-label={`Edit ${goalName}`}
                              data-action="edit-goal"
                              data-id={goalId}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => handleOpenDelete(g)}
                              aria-label={`Delete ${goalName}`}
                              data-action="delete-goal"
                              data-id={goalId}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1 text-[var(--loss)]" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Create / Edit Goal Dialog */}
            <GoalDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              customerId={id}
              goal={selectedGoal}
              onSuccess={() => refetchGoals()}
            />

            {/* Delete Goal Dialog */}
            <DeleteGoalDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              customerId={id}
              goal={goalToDelete}
              onSuccess={() => refetchGoals()}
            />
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function CustomerGoalsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status" aria-label="Loading customer goals">
          <div className="skel" style={{ height: '40px', width: '320px' }} />
          <div
            className="skel"
            style={{ height: '20px', width: '220px', marginTop: '14px' }}
          />
          <div className="skel" style={{ height: '360px', marginTop: '24px' }} />
        </div>
      }
    >
      <GoalsContent />
    </Suspense>
  );
}

