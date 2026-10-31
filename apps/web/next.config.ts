import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the NestJS API URL to the Next.js runtime.
  // Server-only (no NEXT_PUBLIC_ prefix) — never sent to the browser.
  env: {
    API_URL: process.env.API_URL ?? "http://localhost:3001",
  },

  // Transpile @finpilot/shared so Next.js bundles it directly from TypeScript
  // source (the tsconfig path alias handles resolution; this tells webpack/
  // turbopack to process the package through its loaders instead of trying
  // to load from an unbuilt dist/ folder).
  transpilePackages: ["@finpilot/shared"],

  // ── Next.js 16 features ────────────────────────────────────────────────────
  // Cache React Server Component output across requests for unchanged routes.
  cacheComponents: true,
  // Prefetch route content gradually as links enter the viewport.
  partialPrefetching: true,

  // ── Turbopack (dev server) ─────────────────────────────────────────────────
  // Wire Tailwind v4's official Turbopack loader so @import "tailwindcss" is
  // processed correctly in development mode without a separate PostCSS step.
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
