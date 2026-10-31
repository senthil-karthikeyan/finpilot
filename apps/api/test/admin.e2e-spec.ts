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
import { AdminService } from '../src/admin/admin.service.js';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let viewerToken: string;
  let adminToken: string;

  const sampleBatch = {
    batchId: 'IMP-0001',
    fileName: 'txs.csv',
    importedBy: 'admin@finpilot.test',
    importedAt: '2026-09-18T00:00:00.000Z',
    totalRows: 10,
    imported: 8,
    futureDated: 1,
    duplicate: 0,
    rejected: 1,
    durationMs: 45,
    status: 'COMPLETED',
  };

  const mockAdminService = {
    importTransactionsCsv: vi.fn().mockImplementation((file: any) => {
      return Promise.resolve({
        batchId: 'IMP-0001',
        fileName: file?.originalname || 'txs.csv',
        totalRows: 2,
        imported: 1,
        futureDated: 0,
        duplicate: 0,
        rejected: 1,
        durationMs: 25,
        status: 'COMPLETED',
        rows: [
          {
            rowNumber: 2,
            transactionId: 'T0001',
            outcome: 'imported',
            reason: null,
          },
          {
            rowNumber: 3,
            transactionId: 'T0002',
            outcome: 'rejected',
            reason: 'Instrument does not exist',
          },
        ],
      });
    }),
    getImportBatches: vi.fn().mockResolvedValue([sampleBatch]),
    getImportBatch: vi.fn().mockImplementation((batchId: string) => {
      if (batchId === 'IMP-0001') {
        return Promise.resolve({
          batch: sampleBatch,
          rows: [],
        });
      }
      throw new NotFoundException(`Import batch with ID '${batchId}' was not found.`);
    }),
    getDataQualitySummary: vi.fn().mockResolvedValue({
      items: [
        {
          anomaly: 'future_dated',
          count: 1,
          description: 'Future trade date',
          handling: 'Excluded from cash flows',
        },
      ],
      generatedAt: '2026-09-18T00:00:00.000Z',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AdminService)
      .useValue(mockAdminService)
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
    viewerToken = jwtService.sign({
      sub: 'U000001',
      email: 'viewer@finpilot.test',
      role: 'VIEWER',
    });
    adminToken = jwtService.sign({
      sub: 'U000002',
      email: 'admin@finpilot.test',
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/admin/imports/transactions', () => {
    it('returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/imports/transactions')
        .expect(401);
    });

    it('returns 401 when cookie is provided without Bearer header (cookies ignored)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/imports/transactions')
        .set('Cookie', [`${AUTH_COOKIE_NAME}=${adminToken}`])
        .expect(401);
    });

    it('returns 403 Forbidden when authenticated as VIEWER with Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/imports/transactions')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('returns 201 when authenticated as ADMIN and uploading valid CSV', async () => {
      const csvContent =
        'transaction_id,account_id,instrument_id,transaction_type,trade_date,quantity,price,amount,status\nT0001,A00001,I0001,BUY,2026-05-01,10,100,1000,SETTLED';

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/imports/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent), 'test_txs.csv')
        .expect(201);

      expect(res.body.batchId).toBe('IMP-0001');
      expect(res.body.imported).toBe(1);
      expect(res.body.rejected).toBe(1);
    });
  });

  describe('GET /api/v1/admin/imports', () => {
    it('returns 403 Forbidden when accessed by VIEWER', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/imports')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('returns 200 with import batch list when accessed by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/imports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].batchId).toBe('IMP-0001');
    });
  });

  describe('GET /api/v1/admin/imports/:batchId', () => {
    it('returns 403 when accessed by VIEWER', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/imports/IMP-0001')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('returns 200 with batch detail when accessed by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/imports/IMP-0001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('batch');
      expect(res.body.batch.batchId).toBe('IMP-0001');
    });

    it('returns 404 when batch does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/imports/NONEXISTENT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/data-quality', () => {
    it('returns 403 when accessed by VIEWER', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/data-quality')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('returns 200 with anomaly summary when accessed by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/data-quality')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].anomaly).toBe('future_dated');
    });
  });
});

