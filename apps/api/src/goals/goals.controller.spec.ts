import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerGoalsController } from './customer-goals.controller.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';
import type { Goal } from '@finpilot/shared';

describe('GoalsControllers', () => {
  let customerGoalsController: CustomerGoalsController;
  let goalsController: GoalsController;
  let mockService: Partial<GoalsService>;

  const mockGoal: Goal = {
    id: 'G00001',
    goalId: 'G00001',
    customerId: 'C0001',
    name: 'Retirement Nest Egg',
    goalName: 'Retirement Nest Egg',
    type: 'RETIREMENT',
    goalType: 'RETIREMENT',
    priority: 'HIGH',
    targetAmount: 1000000,
    currentAmount: 250000,
    currentFundedAmount: 250000,
    fundedPct: 25,
    targetDate: '2035-12-31',
    isOverdue: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockService = {
      getCustomerGoals: vi.fn(),
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
    };
    customerGoalsController = new CustomerGoalsController(
      mockService as GoalsService,
    );
    goalsController = new GoalsController(mockService as GoalsService);
  });

  describe('CustomerGoalsController', () => {
    it('getCustomerGoals calls service.getCustomerGoals', async () => {
      (mockService.getCustomerGoals as any).mockResolvedValue([mockGoal]);

      const res = await customerGoalsController.getCustomerGoals('C0001');

      expect(res).toEqual([mockGoal]);
      expect(mockService.getCustomerGoals).toHaveBeenCalledWith('C0001');
    });

    it('createGoal calls service.createGoal', async () => {
      (mockService.createGoal as any).mockResolvedValue(mockGoal);

      const dto = {
        name: 'Retirement Nest Egg',
        type: 'RETIREMENT' as const,
        priority: 'HIGH' as const,
        targetAmount: 1000000,
        currentAmount: 250000,
        targetDate: '2035-12-31',
      };

      const res = await customerGoalsController.createGoal('C0001', dto);

      expect(res).toEqual(mockGoal);
      expect(mockService.createGoal).toHaveBeenCalledWith('C0001', dto);
    });
  });

  describe('GoalsController', () => {
    it('updateGoal calls service.updateGoal', async () => {
      (mockService.updateGoal as any).mockResolvedValue(mockGoal);

      const dto = {
        name: 'Updated Name',
      };

      const res = await goalsController.updateGoal('G00001', dto);

      expect(res).toEqual(mockGoal);
      expect(mockService.updateGoal).toHaveBeenCalledWith('G00001', dto);
    });

    it('deleteGoal calls service.deleteGoal', async () => {
      (mockService.deleteGoal as any).mockResolvedValue({
        success: true,
        goalId: 'G00001',
      });

      const res = await goalsController.deleteGoal('G00001');

      expect(res).toEqual({ success: true, goalId: 'G00001' });
      expect(mockService.deleteGoal).toHaveBeenCalledWith('G00001');
    });
  });
});

