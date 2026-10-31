import { UserRole } from '@finpilot/shared';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

