import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { GoalsService } from '../src/goals/goals.service.js';

describe('Goals (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authToken: string;

  const sampleGoal = {
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

  const mockGoalsService = {
    getCustomerGoals: vi.fn().mockImplementation((id: string) => {
      if (id === 'C0001') {
        return Promise.resolve([sampleGoal]);
      }
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }),
    createGoal: vi.fn().mockImplementation((id: string, dto: any) => {
      if (id !== 'C0001') {
        throw new NotFoundException(`Customer with ID '${id}' was not found.`);
      }
      if (dto.targetDate < new Date().toISOString().slice(0, 10)) {
        throw new UnprocessableEntityException(
          'Target date must be today or in the future.',
        );
      }
      return Promise.resolve({
        ...sampleGoal,
        id: 'G00178',
        goalId: 'G00178',
        name: dto.name || dto.goalName,
        goalName: dto.name || dto.goalName,
        targetDate: dto.targetDate,
      });
    }),
    updateGoal: vi.fn().mockImplementation((goalId: string, dto: any) => {
      if (goalId !== 'G00001') {
        throw new NotFoundException(`Goal with ID '${goalId}' was not found.`);
      }
      if (
        dto.targetDate &&
        dto.targetDate !== sampleGoal.targetDate &&
        dto.targetDate < new Date().toISOString().slice(0, 10)
      ) {
        throw new UnprocessableEntityException(
          'Target date must be today or in the future when updating date.',
        );
      }
      return Promise.resolve({
        ...sampleGoal,
        ...dto,
      });
    }),
    deleteGoal: vi.fn().mockImplementation((goalId: string) => {
      if (goalId !== 'G00001') {
        throw new NotFoundException(`Goal with ID '${goalId}' was not found.`);
      }
      return Promise.resolve({ success: true, goalId });
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoalsService)
      .useValue(mockGoalsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    authToken = jwtService.sign({
      sub: 'U000001',
      email: 'viewer@finpilot.test',
      role: 'VIEWER',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/customers/:id/goals', () => {
    it('returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/C0001/goals')
        .expect(401);
    });

    it('returns 200 with customer goals when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers/C0001/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].goalId).toBe('G00001');
      expect(res.body[0].fundedPct).toBe(25);
    });

    it('returns 404 when customer does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/C9999/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/customers/:id/goals', () => {
    it('returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers/C0001/goals')
        .send({
          name: 'House Downpayment',
          type: 'HOME_PURCHASE',
          priority: 'HIGH',
          targetAmount: 2000000,
          targetDate: '2030-01-01',
        })
        .expect(401);
    });

    it('creates a goal and returns 201 when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/customers/C0001/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'House Downpayment',
          type: 'HOME_PURCHASE',
          priority: 'HIGH',
          targetAmount: 2000000,
          targetDate: '2030-01-01',
        })
        .expect(201);

      expect(res.body.goalId).toBe('G00178');
      expect(res.body.name).toBe('House Downpayment');
    });

    it('returns 422 when target date is in the past', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers/C0001/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'House Downpayment',
          type: 'HOME_PURCHASE',
          priority: 'HIGH',
          targetAmount: 2000000,
          targetDate: '2020-01-01',
        })
        .expect(422);
    });
  });

  describe('PATCH /api/v1/goals/:goalId', () => {
    it('updates a goal and returns 200 when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/goals/G00001')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Retirement Goal',
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Retirement Goal');
    });

    it('returns 422 when modifying target date to a past date', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/goals/G00001')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetDate: '2019-01-01',
        })
        .expect(422);
    });

    it('returns 404 when goal does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/goals/G99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Will fail',
        })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/goals/:goalId', () => {
    it('deletes goal and returns 200 when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/goals/G00001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, goalId: 'G00001' });
    });
  });
});

