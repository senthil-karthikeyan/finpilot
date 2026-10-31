import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

/*
 * Use Geist (the Next.js 16 CLI default) instead of Inter.
 * The CSS variable --font-geist-sans is declared in globals.css @theme
 * so Tailwind's font-sans utility resolves to it automatically.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinPilot",
  description: "Internal investment portfolio and goal monitoring platform",
};

/**
 * Root layout — wraps every page with:
 *  • Geist font (via CSS variable)
 *  • TanStack Query provider (client-side data-fetching)
 *  • Sonner toast container (positioned top-right, rich colours)
 *
 * This is a React Server Component — it renders on the server.
 * Client-only concerns (Query client, Toaster) are pushed into
 * <QueryProvider> which carries the 'use client' directive.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          {children}
          {/*
           * Toaster is a client component from sonner.
           * richColors maps success/error/warning to semantic colours.
           * closeButton gives users an explicit dismiss action.
           */}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
