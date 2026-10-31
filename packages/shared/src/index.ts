/**
 * @finpilot/shared — barrel export
 *
 * Import from this package in both apps/api and apps/web:
 *   import { LoginRequestSchema, PaginatedResponseSchema } from '@finpilot/shared';
 *
 * During local development TypeScript resolves the path alias directly to src/
 * (see each app's tsconfig paths), so no build step is required in dev mode.
 */

export * from './constants';
export * from './types/api';
export * from './schemas/auth';
export * from './schemas/customer';
export * from './schemas/portfolio';
export * from './schemas/transaction';
export * from './schemas/goal';
export * from './schemas/import';

