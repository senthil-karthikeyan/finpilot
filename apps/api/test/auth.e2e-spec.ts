import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  const mockAuthService = {
    validateUser: vi.fn().mockImplementation((email: string, pass: string) => {
      if (email === 'viewer@finpilot.test' && pass === 'Viewer#2026') {
        return Promise.resolve({
          id: 1,
          email: 'viewer@finpilot.test',
          name: 'Demo Viewer',
          role: 'VIEWER',
          passwordHash: 'hash',
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    }),
    login: vi.fn().mockResolvedValue({
      token: 'e2e-mock-jwt-token',
      user: {
        id: '1',
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        role: 'VIEWER',
      },
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests to protected endpoints (/api/v1/auth/me)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('rejects login with non-existent or invalid user credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'nobody@finpilot.test',
        password: 'wrongpassword',
      })
      .expect(401);

    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('authenticates valid credentials and returns access token and user profile in JSON body without setting cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'viewer@finpilot.test',
        password: 'Viewer#2026',
      })
      .expect(200);

    expect(res.body.user).toEqual({
      id: '1',
      email: 'viewer@finpilot.test',
      name: 'Demo Viewer',
      role: 'VIEWER',
    });
    expect(res.body.accessToken).toBe('e2e-mock-jwt-token');
    expect(res.body.token).toBe('e2e-mock-jwt-token');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('allows logging out without setting cookies on API', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully.');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
