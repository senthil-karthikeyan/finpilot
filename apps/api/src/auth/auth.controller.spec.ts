import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockResponse: any;

  beforeEach(() => {
    mockAuthService = {
      validateUser: vi.fn(),
      login: vi.fn(),
    };
    mockResponse = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };
    controller = new AuthController(mockAuthService as AuthService);
  });

  describe('login', () => {
    it('sets secure httpOnly cookie and returns user profile without token in body', async () => {
      const fakeDbUser = {
        id: 1,
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        passwordHash: 'hash',
        role: 'VIEWER',
        createdAt: new Date(),
      };
      const fakeAuthUser = {
        id: '1',
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        role: 'VIEWER' as const,
      };

      (mockAuthService.validateUser as any).mockResolvedValue(fakeDbUser);
      (mockAuthService.login as any).mockResolvedValue({
        token: 'signed-jwt-token',
        user: fakeAuthUser,
      });

      const body = { email: 'viewer@finpilot.test', password: 'Password#123' };
      const response = await controller.login(body, mockResponse);

      expect(response).toEqual({ user: fakeAuthUser });
      expect((response as any).token).toBeUndefined();
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'signed-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });

    it('throws UnauthorizedException when validation fails', async () => {
      (mockAuthService.validateUser as any).mockResolvedValue(null);

      const body = { email: 'bad@example.com', password: 'wrong' };
      await expect(controller.login(body, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears httpOnly authentication cookie', () => {
      const response = controller.logout(mockResponse);

      expect(response).toEqual({ message: 'Logged out successfully.' });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('returns the profile from current user decorator', () => {
      const user = {
        id: '1',
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        role: 'VIEWER' as const,
      };
      const result = controller.getProfile(user);
      expect(result).toEqual({ user });
    });
  });
});

