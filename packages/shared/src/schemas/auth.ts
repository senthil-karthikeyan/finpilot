import { z } from 'zod';

// ── Request ──────────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email({ message: 'A valid email address is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ── Response ─────────────────────────────────────────────────────────────────

/**
 * The authenticated user object returned in the login response body
 * and stored in client state. Note: the JWT lives only in the httpOnly
 * cookie — it is never exposed here.
 */
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['VIEWER', 'ADMIN']),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

