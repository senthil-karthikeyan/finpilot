import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { DrizzleDb } from '../database/database.module.js';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    service = new CustomersService(mockDb as DrizzleDb);
  });

  describe('findAll', () => {
    it('returns paginated customer summaries with AUM and account counts', async () => {
      // Mock count query
      const mockCountChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 120 }]),
        }),
      };

      // Mock subqueries and main select
      const mockAumSubquery = {
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            as: vi.fn().mockReturnValue({ customerId: 'p_sub' }),
          }),
        }),
      };

      const mockAccSubquery = {
        from: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockReturnValue({
            as: vi.fn().mockReturnValue({ customerId: 'acc_sub' }),
          }),
        }),
      };

      const mockRows = [
        {
          id: 'C0001',
          name: 'Aarav Sharma',
          email: 'aarav.sharma1@example.test',
          phone: '+919876543210',
          city: 'Mumbai',
          state: 'MH',
          segment: 'Affluent',
          kycStatus: 'VERIFIED',
          accountCount: 2,
          aum: 1250000.5,
          riskLevel: 'Growth',
        },
      ];

      const mockMainChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      offset: vi.fn().mockResolvedValue(mockRows),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockCountChain;
        if (callCount === 2) return mockAumSubquery;
        if (callCount === 3) return mockAccSubquery;
        return mockMainChain;
      });

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortDir: 'asc',
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('C0001');
      expect(result.data[0].name).toBe('Aarav Sharma');
      expect(result.data[0].aum).toBe(1250000.5);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 120,
        totalPages: 12,
      });
    });
  });

  describe('findOne', () => {
    it('returns customer detail with accounts and risk profile', async () => {
      const mockCustomer = {
        customerId: 'C0001',
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma1@example.test',
        phone: '+919876543210',
        city: 'Mumbai',
        state: 'MH',
        segment: 'Affluent',
        kycStatus: 'VERIFIED',
        dateOfBirth: '1985-06-02',
        onboardedAt: '2025-01-12',
        createdAt: new Date('2025-01-12T00:00:00Z'),
      };

      const mockRisk = {
        customerId: 'C0001',
        riskScore: 62,
        riskLevel: 'Growth',
        assessedAt: '2026-07-01',
        horizonYears: 12,
        liquidityNeed: 'MEDIUM',
      };

      const mockAccounts = [
        {
          accountId: 'A00001',
          accountType: 'BROKERAGE',
          provider: 'NorthStar Securities',
          openedAt: '2025-02-01',
          status: 'ACTIVE',
          baseCurrency: 'INR',
          aum: 750000,
        },
      ];

      let selectCall = 0;
      mockDb.select.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          // customer
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockCustomer]),
              }),
            }),
          };
        }
        if (selectCall === 2) {
          // risk profile
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRisk]),
              }),
            }),
          };
        }
        // accounts
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockAccounts),
                }),
              }),
            }),
          }),
        };
      });

      const customer = await service.findOne('C0001');

      expect(customer.id).toBe('C0001');
      expect(customer.name).toBe('Aarav Sharma');
      expect(customer.totalAum).toBe(750000);
      expect(customer.riskProfile?.score).toBe(62);
      expect(customer.riskProfile?.level).toBe('Growth');
      expect(customer.accounts.length).toBe(1);
      expect(customer.accounts[0].accountId).toBe('A00001');
    });

    it('throws NotFoundException when customer does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(service.findOne('C9999')).rejects.toThrow(NotFoundException);
    });
  });
});
