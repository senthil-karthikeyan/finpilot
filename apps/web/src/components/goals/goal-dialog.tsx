'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

import { useCreateGoal, useUpdateGoal } from '@/hooks/use-goals';
import { SYSTEM_TODAY } from '@/lib/formatters';
import { GOAL_TYPE_LABELS } from '@/lib/constants';
import type { Goal, GoalType, GoalPriority } from '@finpilot/shared';

export interface GoalFormData {
  name: string;
  type: GoalType | '';
  priority: GoalPriority;
  targetAmount: string;
  currentFundedAmount: string;
  targetDate: string;
}

export interface GoalValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  summary?: string;
}

/**
 * Pure validation for goal form inputs.
 * Enforces business rules matching the backend and mock source of truth:
 * - Name: 3–60 characters.
 * - Type: required enum.
 * - Priority: required enum.
 * - Target amount: positive number, max 100 crore.
 * - Funded amount: >= 0, cannot exceed target amount.
 * - Target date:
 *   - On create: must be today or in the future (>= SYSTEM_TODAY).
 *   - On edit: if unchanged, allowed even if past; if modified, must be >= SYSTEM_TODAY.
 */
export function validateGoalForm(
  data: GoalFormData,
  isEdit: boolean,
  originalTargetDate?: string,
): GoalValidationResult {
  const errors: Record<string, string> = {};

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    errors.name = 'Give the goal a name.';
  } else if (trimmedName.length < 3 || trimmedName.length > 60) {
    errors.name = 'Use between 3 and 60 characters.';
  }

  if (!data.type) {
    errors.type = 'Choose one of the listed goal types.';
  }

  if (!['HIGH', 'MEDIUM', 'LOW'].includes(data.priority)) {
    errors.priority = 'Choose High, Medium or Low.';
  }

  const rawTarget = data.targetAmount.trim();
  const numTarget = Number(rawTarget.replace(/,/g, ''));
  if (!rawTarget || !Number.isFinite(numTarget)) {
    errors.targetAmount = 'Enter the target amount as a number, like 500000.';
  } else if (numTarget <= 0) {
    errors.targetAmount = 'Target amount must be more than 0.';
  } else if (numTarget > 1e9) {
    errors.targetAmount = "Target amount can't be more than ₹100 crore.";
  }

  const rawFunded = data.currentFundedAmount.trim();
  const numFunded = rawFunded === '' ? 0 : Number(rawFunded.replace(/,/g, ''));
  if (rawFunded !== '' && !Number.isFinite(numFunded)) {
    errors.currentFundedAmount = 'Enter the funded amount as a number, like 50000.';
  } else if (numFunded < 0) {
    errors.currentFundedAmount = "Funded amount can't be negative.";
  }

  if (
    !errors.targetAmount &&
    !errors.currentFundedAmount &&
    Number.isFinite(numTarget) &&
    Number.isFinite(numFunded) &&
    numFunded > numTarget
  ) {
    errors.currentFundedAmount = "Funded amount can't be more than the target.";
  }

  const rawDate = data.targetDate.trim();
  if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    errors.targetDate = 'Pick a valid target date.';
  } else {
    const isDateModified = isEdit ? rawDate !== originalTargetDate : true;
    if (isDateModified && rawDate < SYSTEM_TODAY) {
      errors.targetDate = "The target date can't be in the past. Pick today or later.";
    }
  }

  const errorKeys = Object.keys(errors);
  const isValid = errorKeys.length === 0;
  let summary: string | undefined;

  if (!isValid) {
    summary = `Fix ${errorKeys.length === 1 ? '1 field' : `${errorKeys.length} fields`} to save this goal.`;
  }

  return { isValid, errors, summary };
}

interface GoalFormProps {
  customerId: string;
  goal?: Goal | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function GoalForm({ customerId, goal, onClose, onSuccess }: GoalFormProps) {
  const isEdit = Boolean(goal);
  const goalId = goal?.goalId || goal?.id || '';

  const [formData, setFormData] = useState<GoalFormData>(() => ({
    name: goal ? goal.goalName || goal.name || '' : '',
    type: (goal ? goal.goalType || goal.type || '' : '') as GoalType,
    priority: goal?.priority || 'MEDIUM',
    targetAmount: goal ? String(goal.targetAmount ?? '') : '',
    currentFundedAmount: goal
      ? String(goal.currentFundedAmount ?? goal.currentAmount ?? '0')
      : '0',
    targetDate: goal?.targetDate || '',
  }));

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formSummary, setFormSummary] = useState<string | null>(null);

  const createGoal = useCreateGoal(customerId);
  const updateGoal = useUpdateGoal(customerId);
  const isSaving = createGoal.isPending || updateGoal.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const originalDate = goal?.targetDate;
    const validation = validateGoalForm(formData, isEdit, originalDate);

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormSummary(validation.summary || 'Please correct errors before saving.');
      return;
    }

    setFieldErrors({});
    setFormSummary(null);

    const payload = {
      name: formData.name.trim(),
      type: formData.type as GoalType,
      priority: formData.priority,
      targetAmount: Number(formData.targetAmount.replace(/,/g, '')),
      currentAmount: Number(formData.currentFundedAmount.replace(/,/g, '') || 0),
      currentFundedAmount: Number(formData.currentFundedAmount.replace(/,/g, '') || 0),
      targetDate: formData.targetDate,
    };

    try {
      if (isEdit) {
        await updateGoal.mutateAsync({
          goalId,
          body: payload,
        });
        toast.success('Goal saved');
      } else {
        await createGoal.mutateAsync(payload);
        toast.success('Goal created');
      }

      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number;
        message?: string;
        details?: { field: string; message: string }[];
      };

      if (errorObj.details && Array.isArray(errorObj.details)) {
        const nextErrors: Record<string, string> = {};
        for (const d of errorObj.details) {
          nextErrors[d.field] = d.message;
        }
        setFieldErrors(nextErrors);
        setFormSummary(
          errorObj.message ||
            `Fix ${errorObj.details.length === 1 ? '1 field' : `${errorObj.details.length} fields`} to save this goal.`,
        );
      } else {
        setFormSummary(errorObj.message || 'An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleFieldChange = (field: keyof GoalFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formSummary) {
      setFormSummary(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="dialog-form">
      <div className="flex justify-between items-start">
        <div>
          <Dialog.Title className="h2" id="dlg-title">
            {isEdit ? 'Edit goal' : 'New goal'}
          </Dialog.Title>
          <p className="text-[var(--ink-2)] text-sm mt-1">
            {isEdit ? `Changes apply to ${goalId}.` : 'Amounts are in rupees.'}
          </p>
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

      {formSummary && (
        <div className="errsum flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formSummary}</span>
        </div>
      )}

      {/* Goal name */}
      <div className="field">
        <label htmlFor="g-name">Goal name</label>
        <input
          id="g-name"
          name="name"
          className="input"
          value={formData.name}
          maxLength={80}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'e-name' : undefined}
          onChange={(e) => handleFieldChange('name', e.target.value)}
        />
        {fieldErrors.name && (
          <div
            className="err flex items-center gap-1.5 mt-1 text-[var(--loss)] text-xs"
            id="e-name"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{fieldErrors.name}</span>
          </div>
        )}
      </div>

      {/* Type & Priority */}
      <div className="row2">
        <div className="field">
          <label htmlFor="g-type">Type</label>
          <select
            id="g-type"
            name="type"
            className="select"
            value={formData.type}
            aria-invalid={Boolean(fieldErrors.type)}
            aria-describedby={fieldErrors.type ? 'e-type' : undefined}
            onChange={(e) => handleFieldChange('type', e.target.value as GoalType)}
          >
            <option value="">Choose a type</option>
            {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((t) => (
              <option key={t} value={t}>
                {GOAL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {fieldErrors.type && (
            <div
              className="err flex items-center gap-1.5 mt-1 text-[var(--loss)] text-xs"
              id="e-type"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.type}</span>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="g-priority">Priority</label>
          <select
            id="g-priority"
            name="priority"
            className="select"
            value={formData.priority}
            aria-invalid={Boolean(fieldErrors.priority)}
            aria-describedby={fieldErrors.priority ? 'e-priority' : undefined}
            onChange={(e) =>
              handleFieldChange('priority', e.target.value as GoalPriority)
            }
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {fieldErrors.priority && (
            <div
              className="err flex items-center gap-1.5 mt-1 text-[var(--loss)] text-xs"
              id="e-priority"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.priority}</span>
            </div>
          )}
        </div>
      </div>

      {/* Target Amount & Funded Amount */}
      <div className="row2">
        <div className="field">
          <label htmlFor="g-targetAmount">Target amount (₹)</label>
          <input
            id="g-targetAmount"
            name="targetAmount"
            type="text"
            inputMode="decimal"
            className="input"
            value={formData.targetAmount}
            aria-invalid={Boolean(fieldErrors.targetAmount)}
            aria-describedby={
              fieldErrors.targetAmount ? 'e-targetAmount' : undefined
            }
            onChange={(e) => handleFieldChange('targetAmount', e.target.value)}
          />
          {fieldErrors.targetAmount && (
            <div
              className="err flex items-center gap-1.5 mt-1 text-[var(--loss)] text-xs"
              id="e-targetAmount"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.targetAmount}</span>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="g-fundedAmount">Funded so far (₹)</label>
          <input
            id="g-fundedAmount"
            name="fundedAmount"
            type="text"
            inputMode="decimal"
            className="input"
            value={formData.currentFundedAmount}
            aria-invalid={Boolean(fieldErrors.currentFundedAmount)}
            aria-describedby={
              fieldErrors.currentFundedAmount ? 'e-fundedAmount' : undefined
            }
            onChange={(e) =>
              handleFieldChange('currentFundedAmount', e.target.value)
            }
          />
          {fieldErrors.currentFundedAmount && (
            <div
              className="err flex items-center gap-1.5 mt-1 text-[var(--loss)] text-xs"
              id="e-fundedAmount"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.currentFundedAmount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Target Date */}
      <div className="field">
        <label htmlFor="g-targetDate">Target date</label>
        <input
          id="g-targetDate"
          name="targetDate"
          type="date"
          className="input"
          value={formData.targetDate}
          aria-invalid={Boolean(fieldErrors.targetDate)}
          aria-describedby={fieldErrors.targetDate ? 'e-targetDate' : undefined}
          onChange={(e) => handleFieldChange('targetDate', e.target.value)}
        />
        {fieldErrors.targetDate && (
          <div
            className="err flex items-center gap-1.5 mt-1 text-[var(--loss)] text-xs"
            id="e-targetDate"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{fieldErrors.targetDate}</span>
          </div>
        )}
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn ghost"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type="submit" className="btn" disabled={isSaving}>
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
        </button>
      </div>
    </form>
  );
}

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  goal?: Goal | null;
  onSuccess?: () => void;
}

export function GoalDialog({
  open,
  onOpenChange,
  customerId,
  goal,
  onSuccess,
}: GoalDialogProps) {
  const goalKey = goal ? goal.goalId || goal.id : 'new';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content className="dialog-box" aria-describedby={undefined}>
          {open && (
            <GoalForm
              key={goalKey}
              customerId={customerId}
              goal={goal}
              onClose={() => onOpenChange(false)}
              onSuccess={onSuccess}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
