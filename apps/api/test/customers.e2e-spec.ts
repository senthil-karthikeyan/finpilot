import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';
import { AppModule } from './../src/app.module.js';
import { CustomersService } from '../src/customers/customers.service.js';

describe('Customers (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authToken: string;

  const mockCustomersService = {
    findAll: vi.fn().mockResolvedValue({
      data: [
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
          aum: 1250000,
          riskLevel: 'Growth',
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    }),
    findOne: vi.fn().mockImplementation((id: string) => {
      if (id === 'C0001') {
        return Promise.resolve({
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
          totalAum: 1250000,
          riskProfile: {
            score: 62,
            level: 'Growth',
            assessedAt: '2026-07-01',
            horizonYears: 12,
            liquidityNeed: 'MEDIUM',
          },
          accounts: [],
        });
      }
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CustomersService)
      .useValue(mockCustomersService)
      .compile();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    authToken = await jwtService.signAsync({
      sub: '1',
      email: 'viewer@finpilot.test',
      name: 'Demo Viewer',
      role: 'VIEWER',
    });

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
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests to GET /api/v1/customers with 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/customers').expect(401);
  });

  it('rejects unauthenticated requests to GET /api/v1/customers/:id with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/C0001')
      .expect(401);
  });

  it('returns paginated customer list when authenticated with valid cookie', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers?page=1&limit=20&segment=Affluent')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe('C0001');
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns customer details by ID when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/C0001')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
      .expect(200);

    expect(res.body.id).toBe('C0001');
    expect(res.body.name).toBe('Aarav Sharma');
    expect(res.body.totalAum).toBe(1250000);
    expect(res.body.riskProfile).toBeDefined();
    expect(res.body.riskProfile.score).toBe(62);
  });

  it('returns 404 when customer ID does not exist', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/C9999')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${authToken}`])
      .expect(404);
  });
});
