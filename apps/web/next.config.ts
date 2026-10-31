import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the NestJS API URL to the Next.js runtime.
  env: {
    API_URL: process.env.API_URL ?? "http://localhost:3001",
  },

  // Proxy /api requests to backend NestJS API server
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // Transpile @finpilot/shared so Next.js bundles it directly from TypeScript
  transpilePackages: ["@finpilot/shared"],

  // ── Next.js 16 features ────────────────────────────────────────────────────
  cacheComponents: true,
  partialPrefetching: true,

  // ── Turbopack (dev server) ─────────────────────────────────────────────────
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
