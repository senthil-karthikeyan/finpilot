import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Expose the NestJS API URL to the Next.js runtime.
  env: {
    API_URL: process.env.API_URL ?? 'http://localhost:3001',
  },

  // Transpile @finpilot/shared so Next.js bundles it directly from TypeScript
  transpilePackages: ['@finpilot/shared'],
  output: 'standalone',

  // ── Next.js 16 features ────────────────────────────────────────────────────
  cacheComponents: true,
  partialPrefetching: true,

  // ── Turbopack (dev server) ─────────────────────────────────────────────────
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
