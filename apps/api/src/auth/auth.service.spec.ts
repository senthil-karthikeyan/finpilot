import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { DrizzleDb } from '../database/database.module.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: Partial<DrizzleDb>;
  let mockJwtService: Partial<JwtService>;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
    };
    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
    };
    authService = new AuthService(
      mockDb as DrizzleDb,
      mockJwtService as JwtService,
    );
  });

  describe('validateUser', () => {
    it('returns user when email and password match', async () => {
      const passwordHash = await bcrypt.hash('Secret#123', 10);
      const fakeUser = {
        id: 1,
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        passwordHash,
        role: 'VIEWER',
        createdAt: new Date(),
      };

      const mockFrom = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeUser]),
        }),
      };
      (mockDb.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockFrom),
      });

      const result = await authService.validateUser(
        'viewer@finpilot.test',
        'Secret#123',
      );
      expect(result).toBeDefined();
      expect(result?.email).toBe('viewer@finpilot.test');
    });

    it('returns null when user is not found in database', async () => {
      const mockFrom = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      };
      (mockDb.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockFrom),
      });

      const result = await authService.validateUser(
        'nonexistent@finpilot.test',
        'password',
      );
      expect(result).toBeNull();
    });

    it('returns null when password does not match hash', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword', 10);
      const fakeUser = {
        id: 1,
        email: 'viewer@finpilot.test',
        name: 'Demo Viewer',
        passwordHash,
        role: 'VIEWER',
        createdAt: new Date(),
      };

      const mockFrom = {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeUser]),
        }),
      };
      (mockDb.select as any) = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(mockFrom),
      });

      const result = await authService.validateUser(
        'viewer@finpilot.test',
        'WrongPassword',
      );
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('signs JWT and returns user object without exposing password hash', async () => {
      const fakeUser = {
        id: 42,
        email: 'admin@finpilot.test',
        name: 'Demo Admin',
        passwordHash: 'hash',
        role: 'ADMIN',
        createdAt: new Date(),
      };

      const result = await authService.login(fakeUser);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: '42',
        email: 'admin@finpilot.test',
        name: 'Demo Admin',
        role: 'ADMIN',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: '42',
        email: 'admin@finpilot.test',
        name: 'Demo Admin',
        role: 'ADMIN',
      });
    });
  });
});

