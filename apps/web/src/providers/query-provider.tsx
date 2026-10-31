"use client";

/**
 * QueryProvider — wraps the application in a TanStack Query client.
 *
 * Must be a Client Component ('use client') because QueryClientProvider
 * uses React context, which is a browser-only API.
 *
 * The QueryClient is created inside useState so each server render gets
 * its own isolated instance — prevents state leaking between requests.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Fresh for 60 s — avoids redundant refetches on quick navigations.
            staleTime: 60 * 1_000,
            // Retry once on failure before showing an error (transient blips).
            retry: 1,
            // Refetch when the browser tab regains focus (keeps data current).
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

