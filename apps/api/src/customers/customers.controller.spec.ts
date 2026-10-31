import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { CustomerDetail } from '@finpilot/shared';

describe('CustomersController', () => {
  let controller: CustomersController;
  let mockService: Partial<CustomersService>;

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
    };
    controller = new CustomersController(mockService as CustomersService);
  });

  describe('findAll', () => {
    it('delegates query to service.findAll and returns paginated result', async () => {
      const mockResult = {
        data: [
          {
            id: 'C0001',
            name: 'Aarav Sharma',
            email: 'aarav.sharma1@example.test',
            phone: '+919876543210',
            city: 'Mumbai',
            state: 'MH',
            segment: 'Affluent' as const,
            kycStatus: 'VERIFIED' as const,
            accountCount: 2,
            aum: 1250000,
            riskLevel: 'Growth' as const,
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      (mockService.findAll as any).mockResolvedValue(mockResult);

      const query = {
        page: 1,
        limit: 20,
        sortBy: 'name' as const,
        sortDir: 'asc' as const,
      };
      const response = await controller.findAll(query);

      expect(response).toEqual(mockResult);
      expect(mockService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne and returns customer detail', async () => {
      const mockDetail: CustomerDetail = {
        id: 'C0001',
        name: 'Aarav Sharma',
        email: 'aarav.sharma1@example.test',
        phone: '+919876543210',
        city: 'Mumbai',
        state: 'MH',
        segment: 'Affluent',
        kycStatus: 'VERIFIED',
        dateOfBirth: '1985-06-02',
        onboardedAt: '2025-01-12',
        createdAt: '2025-01-12T00:00:00.000Z',
        totalAum: 750000,
        riskProfile: {
          score: 62,
          level: 'Growth',
          assessedAt: '2026-07-01',
          horizonYears: 12,
          liquidityNeed: 'MEDIUM',
        },
        accounts: [],
      };

      (mockService.findOne as any).mockResolvedValue(mockDetail);

      const response = await controller.findOne('C0001');

      expect(response).toEqual(mockDetail);
      expect(mockService.findOne).toHaveBeenCalledWith('C0001');
    });
  });
});
