import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { AuthUser, UserRole } from '@finpilot/shared';
import { DRIZZLE_DB, type DrizzleDb } from '../database/database.module.js';
import * as schema from '../database/schema/index.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<schema.User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async login(user: schema.User): Promise<{ token: string; user: AuthUser }> {
    const payload: JwtPayload = {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
      },
    };
  }

  async getUserById(id: number | string): Promise<AuthUser | null> {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) return null;

    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.id, numericId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };
  }
}
