import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from '@finpilot/shared';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    validateUser: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      validateUser: vi.fn(),
      login: vi.fn(),
    };
    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  describe('login', () => {
    it('returns access token and user profile in JSON body without setting cookies', async () => {
      const fakeDbUser = {
        id: 1,
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        passwordHash: 'hash',
        role: 'VIEWER',
        createdAt: new Date(),
      };
      const fakeAuthUser: AuthUser = {
        id: '1',
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        role: 'VIEWER',
      };

      mockAuthService.validateUser.mockResolvedValue(fakeDbUser);
      mockAuthService.login.mockResolvedValue({
        token: 'signed-jwt-token',
        user: fakeAuthUser,
      });

      const body = { email: 'viewer@finpilot.test', password: 'Password#123' };
      const response = await controller.login(body);

      expect(response).toEqual({
        accessToken: 'signed-jwt-token',
        token: 'signed-jwt-token',
        user: fakeAuthUser,
      });
    });

    it('throws UnauthorizedException when validation fails', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      const body = { email: 'bad@example.com', password: 'wrong' };
      await expect(controller.login(body)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('returns success message without touching response cookies', () => {
      const response = controller.logout();
      expect(response).toEqual({ message: 'Logged out successfully.' });
    });
  });

  describe('getProfile', () => {
    it('returns the profile from current user decorator', () => {
      const user: AuthUser = {
        id: '1',
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        role: 'VIEWER',
      };
      const result = controller.getProfile(user);
      expect(result).toEqual({ user });
    });
  });
});

