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
import { PortfolioService } from '../src/portfolio/portfolio.service.js';

describe('Portfolio (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authToken: string;

  const mockPortfolioService = {
    getCustomerPortfolio: vi.fn().mockImplementation((id: string) => {
      if (id === 'C0001') {
        return Promise.resolve({
          customerId: 'C0001',
          totalAum: 42550,
          totalCostBasis: 35000,
          totalUnrealisedPnl: 7550,
          totalUnrealisedPnlPct: 21.57,
          snapshotDate: '2026-09-18',
          priceDate: '2026-09-18',
          accounts: [
            {
              accountId: 'A00001',
              accountType: 'BROKERAGE',
              provider: 'NorthStar Securities',
              status: 'ACTIVE',
              openedAt: '2025-02-01',
              baseCurrency: 'INR',
              totalMarketValue: 42550,
              totalCostBasis: 35000,
              totalUnrealisedPnl: 7550,
              totalUnrealisedPnlPct: 21.57,
              positions: [
                {
                  instrumentId: 'I0001',
                  symbol: 'EQ001',
                  instrumentName: 'FinPilot Equity 1',
                  assetClass: 'EQUITY',
                  sector: 'Technology',
                  riskBand: 'MEDIUM',
                  quantity: 100,
                  avgCostPrice: 350,
                  currentPrice: 425.5,
                  marketValue: 42550,
                  costBasis: 35000,
                  unrealisedPnl: 7550,
                  unrealisedPnlPct: 21.57,
                  weightPct: 100,
                  priceDate: '2026-09-18',
                  snapshotDate: '2026-09-18',
                },
              ],
            },
          ],
          allocation: [
            {
              assetClass: 'EQUITY',
              marketValue: 42550,
              weightPct: 100,
              positionCount: 1,
            },
          ],
          monthlyCashFlow: [
            {
              month: '2026-08',
              buyAmount: 10000,
              sellAmount: 15000,
              netFlow: 5000,
            },
          ],
        });
      }
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }),
    getCustomerCashFlow: vi.fn().mockImplementation((id: string) => {
      if (id === 'C0001') {
        return Promise.resolve({
          customerId: 'C0001',
          months: [
            {
              month: '2026-08',
              buyAmount: 10000,
              sellAmount: 15000,
              netFlow: 5000,
            },
          ],
        });
      }
      throw new NotFoundException(`Customer with ID '${id}' was not found.`);
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PortfolioService)
      .useValue(mockPortfolioService)
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

  it('rejects unauthenticated requests to GET /api/v1/customers/:id/portfolio with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/C0001/portfolio')
      .expect(401);
  });

  it('rejects unauthenticated requests to GET /api/v1/customers/:id/cashflow with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/C0001/cashflow')
      .expect(401);
  });

  it('returns consolidated customer portfolio dashboard when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/C0001/portfolio')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.customerId).toBe('C0001');
    expect(res.body.totalAum).toBe(42550);
    expect(res.body.totalCostBasis).toBe(35000);
    expect(res.body.totalUnrealisedPnl).toBe(7550);
    expect(res.body.allocation).toBeDefined();
    expect(res.body.allocation.length).toBe(1);
    expect(res.body.accounts).toBeDefined();
    expect(res.body.accounts[0].positions.length).toBe(1);
    expect(res.body.monthlyCashFlow).toBeDefined();
  });

  it('returns monthly cash flows when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/customers/C0001/cashflow')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.customerId).toBe('C0001');
    expect(res.body.months).toBeDefined();
    expect(res.body.months.length).toBe(1);
    expect(res.body.months[0].month).toBe('2026-08');
  });

  it('returns 404 when customer ID does not exist', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/customers/C9999/portfolio')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
