import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';
import { GET, POST } from '@/app/api/[...path]/route';

describe('Next.js API Proxy Route Handler & Auth Lifecycle', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Login (POST /api/v1/auth/login)', () => {
    it('intercepts login, sets httpOnly session cookie, and returns tokens + user', async () => {
      const mockBackendUser = {
        id: '1',
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        role: 'VIEWER' as const,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          accessToken: 'mock-jwt-token-123',
          token: 'mock-jwt-token-123',
          user: mockBackendUser,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'viewer@finpilot.test', password: 'Viewer#2026' }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ path: ['v1', 'auth', 'login'] }),
      });

      expect(response.status).toBe(200);

      // Verify backend was called with credentials
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Verify response body contains accessToken, token, and user
      const body = await response.json();
      expect(body).toEqual({
        accessToken: 'mock-jwt-token-123',
        token: 'mock-jwt-token-123',
        user: mockBackendUser,
      });

      // Verify httpOnly session cookie was set on frontend origin
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=mock-jwt-token-123`);
      expect(setCookie?.toLowerCase()).toContain('httponly');
      expect(setCookie?.toLowerCase()).toContain('samesite=lax');
      expect(setCookie).toContain('Path=/');
    });

    it('returns error without setting cookie when credentials are invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          statusCode: 401,
          message: 'Invalid email or password.',
          error: 'Unauthorized',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad@user.test', password: 'wrong' }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ path: ['v1', 'auth', 'login'] }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Invalid email or password.');

      // Verify NO auth cookie is set on failed login
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeNull();
    });
  });

  describe('Logout (POST /api/v1/auth/logout)', () => {
    it('clears httpOnly session cookie with maxAge: 0', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
      });

      const response = await POST(request, {
        params: Promise.resolve({ path: ['v1', 'auth', 'logout'] }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Logged out successfully.');

      // Verify cookie is cleared
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=;`);
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  describe('Protected Request Forwarding with Bearer Auth', () => {
    it('extracts session cookie and injects Authorization: Bearer <token> to upstream API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({ data: [{ id: 'C0001' }] })),
            );
            controller.close();
          },
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/customers?page=1', {
        method: 'GET',
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=session-token-xyz`,
        },
      });

      const response = await GET(request, {
        params: Promise.resolve({ path: ['v1', 'customers'] }),
      });

      expect(response.status).toBe(200);

      // Verify upstream request received Authorization: Bearer header
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/customers?page=1'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        }),
      );

      const fetchMock = vi.mocked(global.fetch);
      const call = fetchMock.mock.calls[0];
      expect(call).toBeDefined();
      const calledHeaders = call?.[1]?.headers as Headers;
      expect(calledHeaders.get('Authorization')).toBe('Bearer session-token-xyz');
      // Host and cookie should NOT be forwarded to backend
      expect(calledHeaders.get('cookie')).toBeNull();
    });

    it('forwards request without Authorization header when cookie is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({ message: 'Authentication required' })),
            );
            controller.close();
          },
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/v1/customers', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ path: ['v1', 'customers'] }),
      });

      expect(response.status).toBe(401);
      const fetchMock = vi.mocked(global.fetch);
      const call = fetchMock.mock.calls[0];
      expect(call).toBeDefined();
      const calledHeaders = call?.[1]?.headers as Headers;
      expect(calledHeaders.get('Authorization')).toBeNull();
    });
  });
});
