import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockJwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let mockReflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: vi.fn(),
    };
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new JwtAuthGuard(
      mockJwtService as unknown as JwtService,
      mockReflector as unknown as Reflector,
    );
  });

  function createMockContext(request: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request as Request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access to endpoints marked @Public() without requiring token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext({});

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('authenticates with Bearer token in Authorization header', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const request = {
      headers: { authorization: 'Bearer bearer-token-123' },
    };
    mockJwtService.verifyAsync.mockResolvedValue({
      sub: '2',
      email: 'admin@finpilot.test',
      name: 'Demo Admin',
      role: 'ADMIN',
    });

    const context = createMockContext(request);
    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect((request as unknown as { user: unknown }).user).toEqual({
      id: '2',
      email: 'admin@finpilot.test',
      name: 'Demo Admin',
      role: 'ADMIN',
    });
  });

  it('rejects cookie tokens and requires Authorization Bearer header', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    // Request has cookies but NO Authorization header
    const request = {
      cookies: { finpilot_token: 'cookie-jwt' },
      headers: {},
    };
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no token is present', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const request = { headers: {} };
    const context = createMockContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when token verification fails or expires', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const request = {
      headers: { authorization: 'Bearer expired-token' },
    };
    mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    const context = createMockContext(request);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
