import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import {
  handleAuthError,
  defaultQueryRetry,
  getSafeRedirectUrl,
  resetRedirectingFlag,
  getIsRedirecting,
} from '@/lib/auth-error-handler';
import { ApiError } from '@/lib/api-client';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Auth Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRedirectingFlag();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('handleAuthError', () => {
    it('handles 401 only once when multiple parallel requests fail', () => {
      const mockCancel = vi.fn();
      const mockClear = vi.fn();
      const mockQueryClient = {
        cancelQueries: mockCancel,
        clear: mockClear,
      };

      const mockReplace = vi.fn();
      const mockRouter = { replace: mockReplace };

      const error1 = new ApiError(401, 'Unauthorized');
      const error2 = new ApiError(401, 'Session timed out');
      const error3 = new ApiError(401, 'Token invalid');

      // 3 parallel 401 failures arrive simultaneously
      handleAuthError(error1, undefined, {
        queryClient: mockQueryClient as unknown as import('@tanstack/react-query').QueryClient,
        router: mockRouter,
        skipRedirect: true,
      });

      handleAuthError(error2, undefined, {
        queryClient: mockQueryClient as unknown as import('@tanstack/react-query').QueryClient,
        router: mockRouter,
        skipRedirect: true,
      });

      handleAuthError(error3, undefined, {
        queryClient: mockQueryClient as unknown as import('@tanstack/react-query').QueryClient,
        router: mockRouter,
        skipRedirect: true,
      });

      // Assert toast shown only once
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith('Session expired. Redirecting to login...', {
        id: 'session-expired',
      });

      // Assert queries cancelled and cache cleared once
      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockClear).toHaveBeenCalledTimes(1);

      // Assert fetch /logout called once
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/logout', { method: 'POST' });

      expect(getIsRedirecting()).toBe(true);
    });

    it('handles 403 by showing toast without logging out or redirecting', () => {
      const mockCancel = vi.fn();
      const mockClear = vi.fn();
      const mockQueryClient = {
        cancelQueries: mockCancel,
        clear: mockClear,
      };

      const mockReplace = vi.fn();
      const mockRouter = { replace: mockReplace };

      const error403 = new ApiError(403, 'Forbidden: Admin access required');

      handleAuthError(error403, undefined, {
        queryClient: mockQueryClient as unknown as import('@tanstack/react-query').QueryClient,
        router: mockRouter,
      });

      expect(toast.error).toHaveBeenCalledWith("You don't have access to this", {
        id: 'forbidden-error',
      });
      expect(mockCancel).not.toHaveBeenCalled();
      expect(mockClear).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(getIsRedirecting()).toBe(false);
    });

    it('ignores 401 when skipAuthRedirect is true (e.g. login form)', () => {
      const mockCancel = vi.fn();
      const mockClear = vi.fn();
      const mockQueryClient = {
        cancelQueries: mockCancel,
        clear: mockClear,
      };

      const error401 = new ApiError(401, 'Invalid email or password');

      handleAuthError(
        error401,
        { skipAuthRedirect: true },
        {
          queryClient: mockQueryClient as unknown as import('@tanstack/react-query').QueryClient,
        },
      );

      expect(toast.error).not.toHaveBeenCalled();
      expect(mockCancel).not.toHaveBeenCalled();
      expect(mockClear).not.toHaveBeenCalled();
      expect(getIsRedirecting()).toBe(false);
    });

    it('ignores non-ApiError errors', () => {
      const genericError = new Error('Random DOM error');

      handleAuthError(genericError);

      expect(toast.error).not.toHaveBeenCalled();
      expect(getIsRedirecting()).toBe(false);
    });
  });

  describe('defaultQueryRetry', () => {
    it('returns false immediately for 401, 403, and 404', () => {
      expect(defaultQueryRetry(0, new ApiError(401, 'Unauthorized'))).toBe(false);
      expect(defaultQueryRetry(0, new ApiError(403, 'Forbidden'))).toBe(false);
      expect(defaultQueryRetry(0, new ApiError(404, 'Not Found'))).toBe(false);
    });

    it('retries up to 2 times for 500 or network errors', () => {
      const serverError = new ApiError(500, 'Internal Server Error');
      expect(defaultQueryRetry(0, serverError)).toBe(true);
      expect(defaultQueryRetry(1, serverError)).toBe(true);
      expect(defaultQueryRetry(2, serverError)).toBe(false);

      const networkError = new TypeError('Failed to fetch');
      expect(defaultQueryRetry(0, networkError)).toBe(true);
      expect(defaultQueryRetry(1, networkError)).toBe(true);
      expect(defaultQueryRetry(2, networkError)).toBe(false);
    });
  });

  describe('getSafeRedirectUrl', () => {
    it('allows valid relative paths', () => {
      expect(getSafeRedirectUrl('/customers')).toBe('/customers');
      expect(getSafeRedirectUrl('/customers/C0001/transactions?page=2')).toBe(
        '/customers/C0001/transactions?page=2',
      );
      expect(getSafeRedirectUrl('/admin/imports')).toBe('/admin/imports');
    });

    it('rejects external open redirect URLs and protocol-relative URLs', () => {
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/customers');
      expect(getSafeRedirectUrl('//evil.com')).toBe('/customers');
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/customers');
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/customers');
    });

    it('falls back to provided fallback or default /customers', () => {
      expect(getSafeRedirectUrl(null)).toBe('/customers');
      expect(getSafeRedirectUrl(undefined)).toBe('/customers');
      expect(getSafeRedirectUrl('', '/admin')).toBe('/admin');
    });
  });
});
