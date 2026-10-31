import { toast } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

let isRedirecting = false;

export function getIsRedirecting(): boolean {
  return isRedirecting;
}

export function resetRedirectingFlag(): void {
  isRedirecting = false;
}

/**
 * Validates that the provided redirect URL is a safe relative path starting with a
 * single '/' and not '//' or '/\', preventing open redirect attacks.
 */
export function getSafeRedirectUrl(next: string | null | undefined, fallback = '/customers'): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\')
  ) {
    return trimmed;
  }
  return fallback;
}

export interface AuthErrorHandlerOptions {
  queryClient?: QueryClient;
  router?: { replace: (url: string) => void };
  currentPath?: string;
  skipRedirect?: boolean;
}

/**
 * Global authentication and authorization error handler for TanStack Query.
 *
 * 1. Status 403: Displays access denied error toast and preserves session state.
 * 2. Status 401: Executes session-expired flow once, cancels running queries, clears cache,
 *    calls /logout to clear httpOnly cookie, and redirects to /login?next=... after ~1.5s.
 */
export function handleAuthError(
  error: unknown,
  meta?: Record<string, unknown>,
  options?: AuthErrorHandlerOptions,
): void {
  // Exclude login mutations and explicitly skipped calls
  if (meta?.skipAuthRedirect) {
    return;
  }

  if (!(error instanceof ApiError)) {
    return;
  }

  // 403 Forbidden: Display access error toast without logging out
  if (error.status === 403) {
    toast.error("You don't have access to this", { id: 'forbidden-error' });
    return;
  }

  // 401 Unauthorized: Session-expired flow (runs once only)
  if (error.status === 401) {
    if (isRedirecting) {
      return;
    }
    isRedirecting = true;

    toast.error('Session expired. Redirecting to login...', {
      id: 'session-expired',
    });

    if (options?.queryClient) {
      options.queryClient.cancelQueries();
      options.queryClient.clear();
    }

    // Call /logout to clear frontend httpOnly session cookie
    fetch('/logout', { method: 'POST' }).catch(() => {
      // Ignore background clear failure
    });

    if (!options?.skipRedirect) {
      const currentPathAndQuery =
        options?.currentPath ??
        (typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/customers');

      const redirectUrl =
        '/login?next=' + encodeURIComponent(currentPathAndQuery);

      setTimeout(() => {
        if (options?.router) {
          options.router.replace(redirectUrl);
        } else if (typeof window !== 'undefined') {
          window.location.replace(redirectUrl);
        }
      }, 1500);
    }
  }
}

/**
 * Standard TanStack Query retry logic:
 * - 401, 403, 404 are never retried.
 * - Network errors and 5xx are retried at most 2 times.
 */
export function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404
    ) {
      return false;
    }
  }
  return failureCount < 2;
}

