import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockJwtService: Partial<JwtService>;
  let mockReflector: Partial<Reflector>;

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: vi.fn(),
    };
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new JwtAuthGuard(
      mockJwtService as JwtService,
      mockReflector as Reflector,
    );
  });

  function createMockContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access to endpoints marked @Public() without requiring token', async () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(true);
    const context = createMockContext({});

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('authenticates successfully with valid JWT from httpOnly cookie', async () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(false);
    const request: { cookies: Record<string, string>; headers: Record<string, string>; user?: any } = {
      cookies: { [AUTH_COOKIE_NAME]: 'valid-jwt' },
      headers: {},
    };
    (mockJwtService.verifyAsync as any).mockResolvedValue({
      sub: '1',
      email: 'viewer@finpilot.test',
      name: 'Demo Viewer',
      role: 'VIEWER',
    });

    const context = createMockContext(request);
    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({
      id: '1',
      email: 'viewer@finpilot.test',
      name: 'Demo Viewer',
      role: 'VIEWER',
    });
  });

  it('authenticates with Bearer token in Authorization header as fallback', async () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(false);
    const request: { cookies: Record<string, string>; headers: Record<string, string>; user?: any } = {
      cookies: {},
      headers: { authorization: 'Bearer bearer-token-123' },
    };
    (mockJwtService.verifyAsync as any).mockResolvedValue({
      sub: '2',
      email: 'admin@finpilot.test',
      name: 'Demo Admin',
      role: 'ADMIN',
    });

    const context = createMockContext(request);
    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({
      id: '2',
      email: 'admin@finpilot.test',
      name: 'Demo Admin',
      role: 'ADMIN',
    });
  });

  it('throws UnauthorizedException when no token is present', async () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(false);
    const request = { cookies: {}, headers: {} };
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when token verification fails or expires', async () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(false);
    const request = {
      cookies: { [AUTH_COOKIE_NAME]: 'expired-token' },
      headers: {},
    };
    (mockJwtService.verifyAsync as any).mockRejectedValue(new Error('jwt expired'));

    const context = createMockContext(request);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
