'use client';

/**
 * QueryProvider — wraps the application in a TanStack Query client.
 *
 * This must be a Client Component ('use client') because QueryClientProvider
 * uses React context, which is a browser API.
 *
 * The QueryClient is created inside useState so that each server render
 * gets its own instance (no shared state between requests).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 60 seconds — avoids redundant refetches
            // when navigating between pages quickly.
            staleTime: 60 * 1_000,
            // Retry once on failure before showing an error (network blips).
            retry: 1,
            // Refetch when the browser tab regains focus (keeps data current).
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

