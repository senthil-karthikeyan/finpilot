import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: Partial<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(mockReflector as Reflector);
  });

  function createMockContext(user?: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles are required on the route', () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user role matches required role', () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(['ADMIN']);
    const context = createMockContext({ role: 'ADMIN' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when user lacks required role', () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(['ADMIN']);
    const context = createMockContext({ role: 'VIEWER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is not attached to request', () => {
    (mockReflector.getAllAndOverride as any).mockReturnValue(['ADMIN']);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

