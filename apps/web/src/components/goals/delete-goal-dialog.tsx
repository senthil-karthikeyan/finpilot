'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDeleteGoal } from '@/hooks/use-goals';
import type { Goal } from '@finpilot/shared';

interface DeleteGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  goal: Goal | null;
  onSuccess?: () => void;
}

export function DeleteGoalDialog({
  open,
  onOpenChange,
  customerId,
  goal,
  onSuccess,
}: DeleteGoalDialogProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteGoal = useDeleteGoal(customerId);

  if (!goal) return null;

  const goalName = goal.goalName || goal.name;
  const goalId = goal.goalId || goal.id;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteGoal.mutateAsync(goalId);
      toast.success('Goal deleted');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setDeleteError(errorObj.message || 'Failed to delete goal. Please try again.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="dialog-box" aria-describedby="delete-goal-desc">
          <div className="p-6 grid gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-[var(--loss)]">
                <Trash2 className="w-5 h-5 shrink-0" />
                <Dialog.Title className="h2" id="delete-dlg-title">
                  Delete goal
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1 rounded transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            <p id="delete-goal-desc" className="text-[var(--ink-2)] text-sm leading-relaxed">
              Are you sure you want to delete <b className="text-[var(--ink)]">{goalName}</b> ({goalId})?
              This action cannot be undone and will permanently remove this goal and its funding history.
            </p>

            {deleteError && (
              <div className="errsum flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                className="btn ghost"
                onClick={() => onOpenChange(false)}
                disabled={deleteGoal.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: 'var(--loss)',
                  borderColor: 'var(--loss)',
                  color: '#ffffff',
                }}
                onClick={handleDelete}
                disabled={deleteGoal.isPending}
              >
                {deleteGoal.isPending ? 'Deleting…' : 'Delete goal'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

