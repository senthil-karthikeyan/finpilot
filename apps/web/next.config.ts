import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Next.js server actions and API routes to call the NestJS API internally.
  // The API_URL env var is set in docker-compose and .env.
  env: {
    API_URL: process.env.API_URL ?? 'http://localhost:3001',
  },

  // Transpile the shared workspace package so Next.js bundles it correctly.
  // Without this, Next.js would try to import from the (possibly unbuilt) dist/.
  transpilePackages: ['@finpilot/shared'],
};

export default nextConfig;

