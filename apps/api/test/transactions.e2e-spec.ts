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
import { AppModule } from './../src/app.module.js';
import { TransactionsService } from '../src/transactions/transactions.service.js';

describe('Transactions (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authToken: string;

  const mockTransactionsService = {
    getCustomerTransactions: vi.fn().mockImplementation((id: string, query: any) => {
      if (id === 'C0001') {
        return Promise.resolve({
          data: [
            {
              id: 'T0000001',
              transactionId: 'T0000001',
              accountId: 'A00001',
              accountType: 'BROKERAGE',
              instrumentId: 'I0001',
              instrumentName: 'FinPilot BlueChip Alpha',
              symbol: 'FPBCA',
              assetClass: 'EQUITY',
              type: 'BUY',
              transactionType: 'BUY',
              status: 'SETTLED',
              quantity: 50,
              price: 1200.5,
              amount: 60025,
              tradeDate: '2026-05-15',
              isFuture: false,
              beforeOpenFlag: false,
              onClosedFlag: false,
            },
          ],
          meta: {
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            total: 1,
            totalPages: 1,
          },
          pagination: {
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            total: 1,
            totalPages: 1,
          },
        });
      }
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TransactionsService)
      .useValue(mockTransactionsService)
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

  describe('GET /api/v1/customers/:id/transactions', () => {
    it('returns 401 when unauthenticated (no cookie)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/C0001/transactions')
        .expect(401);
    });

    it('returns 200 with paginated transactions when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers/C0001/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].transactionId).toBe('T0000001');
      expect(res.body.data[0].amount).toBe(60025);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta.total).toBe(1);
      expect(res.body).toHaveProperty('pagination');
    });

    it('handles query parameters and filters correctly', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/customers/C0001/transactions?transactionType=BUY&status=SETTLED&page=1&limit=10',
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(mockTransactionsService.getCustomerTransactions).toHaveBeenCalledWith(
        'C0001',
        expect.objectContaining({
          transactionType: 'BUY',
          status: 'SETTLED',
          page: 1,
          limit: 10,
        }),
      );
    });

    it('returns 404 when customer is not found', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/C9999/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

