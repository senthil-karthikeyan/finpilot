import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';
import {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
  HEAD,
  buildForwardResponseHeaders,
} from '@/app/api/[...path]/route';

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

  describe('Header Forwarding & Compression Mismatch Prevention', () => {
    it('strips content-encoding and stale content-length when upstream was compressed', () => {
      const backendHeaders = new Headers({
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'br',
        'content-length': '986',
        etag: 'W/"11b4-h6uNnAVbWeHPWURF/BJKvqunR/k"',
        'x-correlation-id': 'corr-abc-123',
        'cache-control': 'private, no-cache',
        'transfer-encoding': 'chunked',
        connection: 'keep-alive',
      });

      const forwardHeaders = buildForwardResponseHeaders(backendHeaders);

      // Must strip content-encoding because fetch() decompressed the body
      expect(forwardHeaders.get('content-encoding')).toBeNull();
      // Must strip content-length because 986 was the compressed byte count
      expect(forwardHeaders.get('content-length')).toBeNull();
      // Must strip hop-by-hop headers
      expect(forwardHeaders.get('transfer-encoding')).toBeNull();
      expect(forwardHeaders.get('connection')).toBeNull();

      // Must preserve content-type, cache-control, correlation id, and weak etag
      expect(forwardHeaders.get('content-type')).toBe('application/json; charset=utf-8');
      expect(forwardHeaders.get('cache-control')).toBe('private, no-cache');
      expect(forwardHeaders.get('x-correlation-id')).toBe('corr-abc-123');
      expect(forwardHeaders.get('etag')).toBe('W/"11b4-h6uNnAVbWeHPWURF/BJKvqunR/k"');
    });

    it('weakens strong ETag when upstream was compressed', () => {
      const backendHeaders = new Headers({
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        'content-length': '500',
        etag: '"strong-etag-123"',
      });

      const forwardHeaders = buildForwardResponseHeaders(backendHeaders);
      expect(forwardHeaders.get('content-encoding')).toBeNull();
      expect(forwardHeaders.get('content-length')).toBeNull();
      expect(forwardHeaders.get('etag')).toBe('W/"strong-etag-123"');
    });

    it('preserves content-length and ETag when upstream was uncompressed', () => {
      const backendHeaders = new Headers({
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="report.csv"',
        'content-length': '4532',
        etag: '"strong-etag-123"',
        'x-correlation-id': 'corr-xyz',
      });

      const forwardHeaders = buildForwardResponseHeaders(backendHeaders);
      expect(forwardHeaders.get('content-length')).toBe('4532');
      expect(forwardHeaders.get('etag')).toBe('"strong-etag-123"');
      expect(forwardHeaders.get('content-type')).toBe('text/csv');
      expect(forwardHeaders.get('content-disposition')).toBe('attachment; filename="report.csv"');
      expect(forwardHeaders.get('x-correlation-id')).toBe('corr-xyz');
    });

    it('does not forward browser Accept-Encoding or hop-by-hop headers to upstream', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/json',
          'content-encoding': 'br',
          'content-length': '986',
        }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ data: [] })));
            controller.close();
          },
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/v1/customers?segment=Mass&page=1&limit=20&sortBy=name&sortDir=asc',
        {
          method: 'GET',
          headers: {
            'accept-encoding': 'gzip, deflate, br, zstd',
            connection: 'keep-alive',
            upgrade: 'websocket',
            accept: 'application/json',
          },
        },
      );

      const response = await GET(request, {
        params: Promise.resolve({ path: ['v1', 'customers'] }),
      });

      expect(response.status).toBe(200);

      // Verify request to upstream fetch
      const fetchMock = vi.mocked(global.fetch);
      const call = fetchMock.mock.calls[0];
      expect(call).toBeDefined();
      const sentHeaders = call?.[1]?.headers as Headers;

      // accept-encoding, connection, upgrade must NOT be forwarded to upstream fetch
      expect(sentHeaders.get('accept-encoding')).toBeNull();
      expect(sentHeaders.get('connection')).toBeNull();
      expect(sentHeaders.get('upgrade')).toBeNull();
      // standard request headers like accept must be forwarded
      expect(sentHeaders.get('accept')).toBe('application/json');

      // Verify response returned to client does NOT have content-encoding: br or stale content-length
      expect(response.headers.get('content-encoding')).toBeNull();
      expect(response.headers.get('content-length')).toBeNull();
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('safely handles 204 No Content with null body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        body: null,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/customers/C0001/goals/G0001', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ path: ['v1', 'customers', 'C0001', 'goals', 'G0001'] }),
      });

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it('supports all HTTP methods: PUT, PATCH, DELETE, HEAD', async () => {
      for (const method of ['PUT', 'PATCH', 'DELETE', 'HEAD'] as const) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ ok: true })));
              controller.close();
            },
          }),
        });

        const req = new NextRequest('http://localhost:3000/api/v1/resource', {
          method,
          headers: { 'content-type': 'application/json' },
          body: method === 'HEAD' || method === 'DELETE' ? undefined : JSON.stringify({ test: 1 }),
        });

        let res;
        if (method === 'PUT') res = await PUT(req, { params: Promise.resolve({ path: ['v1', 'resource'] }) });
        else if (method === 'PATCH') res = await PATCH(req, { params: Promise.resolve({ path: ['v1', 'resource'] }) });
        else if (method === 'DELETE') res = await DELETE(req, { params: Promise.resolve({ path: ['v1', 'resource'] }) });
        else res = await HEAD(req, { params: Promise.resolve({ path: ['v1', 'resource'] }) });

        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/resource'),
          expect.objectContaining({ method }),
        );
      }
    });
  });
});
