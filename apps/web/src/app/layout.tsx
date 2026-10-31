import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinPilot',
  description: 'Internal investment portfolio and goal monitoring platform',
};

/**
 * Root layout — wraps every page with:
 *  • Inter font
 *  • TanStack Query provider (client-side data-fetching)
 *  • Sonner toast container (positioned top-right, rich colours)
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
          {/*
           * Toaster is a client component from sonner.
           * richColors maps success/error/warning to semantic colours automatically.
           */}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}

