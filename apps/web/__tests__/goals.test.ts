import { describe, it, expect } from 'vitest';
import {
  validateGoalForm,
  type GoalFormData,
} from '@/components/goals/goal-dialog';
import { relFuture, humanDays, SYSTEM_TODAY } from '@/lib/formatters';
import type { Goal } from '@finpilot/shared';

describe('Goals logic & validation', () => {
  describe('validateGoalForm', () => {
    const validCreateData: GoalFormData = {
      name: 'Higher Education Fund',
      type: 'EDUCATION',
      priority: 'HIGH',
      targetAmount: '1500000',
      currentFundedAmount: '300000',
      targetDate: '2028-06-30',
    };

    it('passes for valid create goal data', () => {
      const res = validateGoalForm(validCreateData, false);
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
      expect(res.summary).toBeUndefined();
    });

    describe('Name validation', () => {
      it('rejects empty or whitespace-only name', () => {
        const res = validateGoalForm({ ...validCreateData, name: '   ' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.name).toBe('Give the goal a name.');
      });

      it('rejects name shorter than 3 characters', () => {
        const res = validateGoalForm({ ...validCreateData, name: 'Ab' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.name).toBe('Use between 3 and 60 characters.');
      });

      it('rejects name longer than 60 characters', () => {
        const longName = 'A'.repeat(61);
        const res = validateGoalForm({ ...validCreateData, name: longName }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.name).toBe('Use between 3 and 60 characters.');
      });

      it('accepts valid name between 3 and 60 characters', () => {
        const res = validateGoalForm({ ...validCreateData, name: 'Retirement 2045' }, false);
        expect(res.errors.name).toBeUndefined();
      });
    });

    describe('Type validation', () => {
      it('rejects unselected type', () => {
        const res = validateGoalForm({ ...validCreateData, type: '' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.type).toBe('Choose one of the listed goal types.');
      });

      it('accepts valid goal type', () => {
        const res = validateGoalForm({ ...validCreateData, type: 'RETIREMENT' }, false);
        expect(res.errors.type).toBeUndefined();
      });
    });

    describe('Priority validation', () => {
      it('accepts HIGH, MEDIUM, LOW', () => {
        expect(validateGoalForm({ ...validCreateData, priority: 'HIGH' }, false).errors.priority).toBeUndefined();
        expect(validateGoalForm({ ...validCreateData, priority: 'MEDIUM' }, false).errors.priority).toBeUndefined();
        expect(validateGoalForm({ ...validCreateData, priority: 'LOW' }, false).errors.priority).toBeUndefined();
      });
    });

    describe('Target amount validation', () => {
      it('rejects non-numeric target amount', () => {
        const res = validateGoalForm({ ...validCreateData, targetAmount: 'abc' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.targetAmount).toBe('Enter the target amount as a number, like 500000.');
      });

      it('rejects target amount of 0 or negative', () => {
        const zeroRes = validateGoalForm({ ...validCreateData, targetAmount: '0' }, false);
        expect(zeroRes.isValid).toBe(false);
        expect(zeroRes.errors.targetAmount).toBe('Target amount must be more than 0.');

        const negRes = validateGoalForm({ ...validCreateData, targetAmount: '-500' }, false);
        expect(negRes.isValid).toBe(false);
        expect(negRes.errors.targetAmount).toBe('Target amount must be more than 0.');
      });

      it('rejects target amount greater than 100 crore', () => {
        const res = validateGoalForm({ ...validCreateData, targetAmount: '1000000001' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.targetAmount).toBe("Target amount can't be more than ₹100 crore.");
      });

      it('formats commas gracefully in target amount', () => {
        const res = validateGoalForm({ ...validCreateData, targetAmount: '1,500,000' }, false);
        expect(res.errors.targetAmount).toBeUndefined();
      });
    });

    describe('Funded amount validation', () => {
      it('rejects negative funded amount', () => {
        const res = validateGoalForm({ ...validCreateData, currentFundedAmount: '-100' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.currentFundedAmount).toBe("Funded amount can't be negative.");
      });

      it('rejects funded amount exceeding target amount', () => {
        const res = validateGoalForm(
          { ...validCreateData, targetAmount: '500000', currentFundedAmount: '600000' },
          false,
        );
        expect(res.isValid).toBe(false);
        expect(res.errors.currentFundedAmount).toBe("Funded amount can't be more than the target.");
      });

      it('accepts funded amount equal to target amount (100% funded)', () => {
        const res = validateGoalForm(
          { ...validCreateData, targetAmount: '500000', currentFundedAmount: '500000' },
          false,
        );
        expect(res.errors.currentFundedAmount).toBeUndefined();
      });

      it('defaults to 0 if blank', () => {
        const res = validateGoalForm({ ...validCreateData, currentFundedAmount: '' }, false);
        expect(res.errors.currentFundedAmount).toBeUndefined();
      });
    });

    describe('Target date rules (create vs edit)', () => {
      it('rejects invalid date format', () => {
        const res = validateGoalForm({ ...validCreateData, targetDate: 'invalid-date' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.targetDate).toBe('Pick a valid target date.');
      });

      it('on create: rejects past dates before SYSTEM_TODAY', () => {
        const res = validateGoalForm({ ...validCreateData, targetDate: '2026-10-15' }, false);
        expect(res.isValid).toBe(false);
        expect(res.errors.targetDate).toBe("The target date can't be in the past. Pick today or later.");
      });

      it('on create: accepts SYSTEM_TODAY or future dates', () => {
        const todayRes = validateGoalForm({ ...validCreateData, targetDate: SYSTEM_TODAY }, false);
        expect(todayRes.errors.targetDate).toBeUndefined();

        const futureRes = validateGoalForm({ ...validCreateData, targetDate: '2027-01-01' }, false);
        expect(futureRes.errors.targetDate).toBeUndefined();
      });

      it('on edit: accepts unchanged past target date', () => {
        // Original date was in the past ('2026-05-10'), user edits name but leaves date unchanged
        const res = validateGoalForm(
          { ...validCreateData, targetDate: '2026-05-10' },
          true,
          '2026-05-10',
        );
        expect(res.errors.targetDate).toBeUndefined();
        expect(res.isValid).toBe(true);
      });

      it('on edit: rejects modified date if set to a past date', () => {
        // Original date was '2026-05-10', user changed it to another past date '2026-08-01'
        const res = validateGoalForm(
          { ...validCreateData, targetDate: '2026-08-01' },
          true,
          '2026-05-10',
        );
        expect(res.isValid).toBe(false);
        expect(res.errors.targetDate).toBe("The target date can't be in the past. Pick today or later.");
      });

      it('on edit: accepts modified date if changed to a future date', () => {
        const res = validateGoalForm(
          { ...validCreateData, targetDate: '2027-05-10' },
          true,
          '2026-05-10',
        );
        expect(res.errors.targetDate).toBeUndefined();
        expect(res.isValid).toBe(true);
      });
    });
  });

  describe('Relative date formatters (relFuture & humanDays)', () => {
    it('formats days phrasing correctly', () => {
      expect(humanDays(1)).toBe('1 day');
      expect(humanDays(5)).toBe('5 days');
      expect(humanDays(60)).toBe('2 months');
      expect(humanDays(365)).toBe('1 year');
      expect(humanDays(730)).toBe('2 years');
    });

    it('returns overdue status and text for dates before SYSTEM_TODAY', () => {
      // SYSTEM_TODAY is 2026-10-31
      const res = relFuture('2026-10-15');
      expect(res.late).toBe(true);
      expect(res.text).toBe('Overdue by 16 days');
    });

    it('returns "Due today" for SYSTEM_TODAY', () => {
      const res = relFuture(SYSTEM_TODAY);
      expect(res.late).toBe(false);
      expect(res.text).toBe('Due today');
    });

    it('returns future relative text for future dates', () => {
      const res = relFuture('2026-11-15');
      expect(res.late).toBe(false);
      expect(res.text).toBe('In 15 days');
    });
  });

  describe('Goal sorting and flag calculations', () => {
    const mockGoals: Goal[] = [
      {
        id: 'G1',
        goalId: 'G1',
        customerId: 'C001',
        name: 'Emergency Fund',
        goalName: 'Emergency Fund',
        type: 'EMERGENCY_FUND',
        goalType: 'EMERGENCY_FUND',
        priority: 'LOW',
        targetAmount: 100000,
        currentAmount: 80000,
        currentFundedAmount: 80000,
        fundedPct: 80,
        targetDate: '2027-01-01',
        isOverdue: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'G2',
        goalId: 'G2',
        customerId: 'C001',
        name: 'Home Purchase',
        goalName: 'Home Purchase',
        type: 'HOME_PURCHASE',
        goalType: 'HOME_PURCHASE',
        priority: 'HIGH',
        targetAmount: 5000000,
        currentAmount: 1000000,
        currentFundedAmount: 1000000,
        fundedPct: 20,
        targetDate: '2026-09-01', // past target date
        isOverdue: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'G3',
        goalId: 'G3',
        customerId: 'C001',
        name: 'Child Education',
        goalName: 'Child Education',
        type: 'EDUCATION',
        goalType: 'EDUCATION',
        priority: 'HIGH',
        targetAmount: 2000000,
        currentAmount: 1500000,
        currentFundedAmount: 1500000,
        fundedPct: 75,
        targetDate: '2028-06-01',
        isOverdue: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'G4',
        goalId: 'G4',
        customerId: 'C001',
        name: 'Europe Vacation',
        goalName: 'Europe Vacation',
        type: 'TRAVEL',
        goalType: 'TRAVEL',
        priority: 'MEDIUM',
        targetAmount: 500000,
        currentAmount: 550000, // overfunded
        currentFundedAmount: 550000,
        fundedPct: 110,
        targetDate: '2027-04-01',
        isOverdue: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('sorts goals by priority (HIGH -> MEDIUM -> LOW) then fundedPct ascending', () => {
      const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const sorted = [...mockGoals].sort(
        (a, b) =>
          (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2) ||
          a.fundedPct - b.fundedPct,
      );

      expect(sorted.map((g) => g.id)).toEqual(['G2', 'G3', 'G4', 'G1']);
    });

    it('accurately identifies flagged goals needing attention', () => {
      const flags = mockGoals.map((g) => {
        const due = relFuture(g.targetDate);
        const isOverdue = g.isOverdue || (due.late && g.fundedPct < 100);
        const isOverFunded = (g.currentFundedAmount ?? g.currentAmount) > g.targetAmount;
        const isHighBehind = g.priority === 'HIGH' && g.fundedPct < 25;
        return { id: g.id, isOverdue, isOverFunded, isHighBehind };
      });

      // G1: LOW, 80%, future -> no flags
      expect(flags[0]).toEqual({
        id: 'G1',
        isOverdue: false,
        isOverFunded: false,
        isHighBehind: false,
      });

      // G2: HIGH, 20% (< 25%), overdue (targetDate in past) -> both overdue and high behind
      expect(flags[1]).toEqual({
        id: 'G2',
        isOverdue: true,
        isOverFunded: false,
        isHighBehind: true,
      });

      // G3: HIGH, 75%, future -> no flags
      expect(flags[2]).toEqual({
        id: 'G3',
        isOverdue: false,
        isOverFunded: false,
        isHighBehind: false,
      });

      // G4: MEDIUM, 110%, funded > target -> overFunded
      expect(flags[3]).toEqual({
        id: 'G4',
        isOverdue: false,
        isOverFunded: true,
        isHighBehind: false,
      });
    });
  });
});

