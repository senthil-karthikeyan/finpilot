'use client';

/**
 * QueryProvider — wraps the application in a TanStack Query client.
 *
 * Must be a Client Component ('use client') because QueryClientProvider
 * uses React context, which is a browser-only API.
 *
 * The QueryClient is created inside useState so each render gets
 * its own isolated instance — prevents state leaking between requests.
 */
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  handleAuthError,
  defaultQueryRetry,
} from '@/lib/auth-error-handler';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Fresh for 60 s — avoids redundant refetches on quick navigations.
          staleTime: 60 * 1_000,
          // Retry rules: false for 401, 403, 404; up to 2 retries for 5xx/network.
          retry: defaultQueryRetry,
          // Refetch when the browser tab regains focus (keeps data current).
          refetchOnWindowFocus: true,
        },
      },
      queryCache: new QueryCache({
        onError: (error, query) => {
          handleAuthError(error, query.meta, {
            queryClient: client,
            router,
          });
        },
      }),
      mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          handleAuthError(error, mutation.meta, {
            queryClient: client,
            router,
          });
        },
      }),
    });

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
