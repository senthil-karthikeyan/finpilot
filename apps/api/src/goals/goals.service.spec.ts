import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GoalsService } from './goals.service.js';
import type { DrizzleDb } from '../database/database.module.js';

describe('GoalsService', () => {
  let service: GoalsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new GoalsService(mockDb as DrizzleDb);
  });

  describe('getCustomerGoals', () => {
    it('returns formatted goals with funded percentage and overdue status', async () => {
      // 1. Mock customer exists
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };

      // 2. Mock goals query
      const mockGoalRows = [
        {
          goalId: 'G00001',
          customerId: 'C0001',
          goalType: 'RETIREMENT',
          goalName: 'Retirement Nest Egg',
          targetAmount: '1000000.00',
          currentFundedAmount: '250000.00',
          targetDate: '2035-12-31',
          priority: 'HIGH',
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      const mockGoalsSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockGoalRows),
          }),
        }),
      };

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) return mockCustomerSelect;
        return mockGoalsSelect;
      });

      const result = await service.getCustomerGoals('C0001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('G00001');
      expect(result[0].name).toBe('Retirement Nest Egg');
      expect(result[0].type).toBe('RETIREMENT');
      expect(result[0].targetAmount).toBe(1000000);
      expect(result[0].currentAmount).toBe(250000);
      expect(result[0].fundedPct).toBe(25);
      expect(result[0].isOverdue).toBe(false);
    });

    it('throws NotFoundException if customer does not exist', async () => {
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      mockDb.select.mockReturnValue(mockCustomerSelect);

      await expect(service.getCustomerGoals('C9999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createGoal', () => {
    it('creates a new goal with generated ID when valid', async () => {
      // Mock customer exists
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };

      // Mock max goalId query
      const mockMaxIdSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ goalId: 'G00177' }]),
            }),
          }),
        }),
      };

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) return mockCustomerSelect;
        return mockMaxIdSelect;
      });

      const futureDate = '2035-06-30';
      const insertedGoalRow = {
        goalId: 'G00178',
        customerId: 'C0001',
        goalType: 'EMERGENCY_FUND',
        goalName: 'Emergency Reserve',
        targetAmount: '500000.00',
        currentFundedAmount: '100000.00',
        targetDate: futureDate,
        priority: 'MEDIUM',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertedGoalRow]),
        }),
      });

      const result = await service.createGoal('C0001', {
        name: 'Emergency Reserve',
        type: 'EMERGENCY_FUND',
        priority: 'MEDIUM',
        targetAmount: 500000,
        currentAmount: 100000,
        targetDate: futureDate,
      });

      expect(result.id).toBe('G00178');
      expect(result.name).toBe('Emergency Reserve');
      expect(result.fundedPct).toBe(20);
    });

    it('rejects target date in the past with UnprocessableEntityException', async () => {
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };
      mockDb.select.mockReturnValue(mockCustomerSelect);

      await expect(
        service.createGoal('C0001', {
          name: 'Past Goal',
          type: 'EDUCATION',
          priority: 'LOW',
          targetAmount: 100000,
          targetDate: '2020-01-01',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects goal name shorter than 3 characters with BadRequestException', async () => {
      const mockCustomerSelect = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ customerId: 'C0001' }]),
          }),
        }),
      };
      mockDb.select.mockReturnValue(mockCustomerSelect);

      await expect(
        service.createGoal('C0001', {
          name: 'ab',
          type: 'EDUCATION',
          priority: 'LOW',
          targetAmount: 100000,
          targetDate: '2030-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateGoal', () => {
    it('allows past date if target date is unchanged', async () => {
      const existingGoal = {
        goalId: 'G00001',
        customerId: 'C0001',
        goalType: 'TRAVEL',
        goalName: 'Old Vacation',
        targetAmount: '200000.00',
        currentFundedAmount: '50000.00',
        targetDate: '2022-01-01', // past date
        priority: 'LOW',
        createdAt: new Date('2021-01-01T00:00:00Z'),
        updatedAt: new Date('2021-01-01T00:00:00Z'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingGoal]),
          }),
        }),
      });

      const updatedGoal = {
        ...existingGoal,
        goalName: 'Updated Vacation Title',
        updatedAt: new Date(),
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedGoal]),
          }),
        }),
      });

      const result = await service.updateGoal('G00001', {
        name: 'Updated Vacation Title',
        targetDate: '2022-01-01', // unchanged past date
      });

      expect(result.name).toBe('Updated Vacation Title');
    });

    it('rejects changing target date to a new past date', async () => {
      const existingGoal = {
        goalId: 'G00001',
        customerId: 'C0001',
        goalType: 'TRAVEL',
        goalName: 'Old Vacation',
        targetAmount: '200000.00',
        currentFundedAmount: '50000.00',
        targetDate: '2028-01-01',
        priority: 'LOW',
        createdAt: new Date('2021-01-01T00:00:00Z'),
        updatedAt: new Date('2021-01-01T00:00:00Z'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingGoal]),
          }),
        }),
      });

      await expect(
        service.updateGoal('G00001', {
          targetDate: '2020-05-01', // new past date
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException if goal does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.updateGoal('G99999', {
          name: 'Non existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteGoal', () => {
    it('deletes goal and returns success when found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ goalId: 'G00001' }]),
          }),
        }),
      });

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      });

      const result = await service.deleteGoal('G00001');

      expect(result).toEqual({ success: true, goalId: 'G00001' });
    });

    it('throws NotFoundException when goal does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.deleteGoal('G99999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

