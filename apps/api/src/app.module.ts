import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { PortfolioModule } from './portfolio/portfolio.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

/**
 * AppModule — root module.
 *
 * Feature modules (AuthModule, CustomersModule, PortfolioModule, etc.)
 * are added in their respective feature branches.
 */
@Module({
  imports: [
    // ── Database — PostgreSQL via pg.Pool + Drizzle ORM (DRIZZLE_DB) ────────
    DatabaseModule,

    // ── Authentication & Access Control ──────────────────────────────────────
    AuthModule,

    // ── Customers — Search, Profile & Accounts ───────────────────────────────
    CustomersModule,

    // ── Portfolio & Cash-Flow Analytics ──────────────────────────────────────
    PortfolioModule,

    // ── Transactions Ledger & Filtering ──────────────────────────────────────
    TransactionsModule,

    // ── Config — makes process.env available across all modules ──────────────
    ConfigModule.forRoot({
      isGlobal: true, // no need to import ConfigModule in child modules
      cache: true,
    }),

    // ── Rate limiting (in-memory store, no Redis needed) ─────────────────────
    // Global limit: 100 requests per 60 seconds.
    // Login endpoint gets a stricter limit applied in AuthModule (10/15 min).
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000, // 60 seconds in milliseconds
        limit: 100,
      },
    ]),

    // ── Structured logging via Pino ───────────────────────────────────────────
    LoggerModule.forRoot({
      pinoHttp: {
        // In production emit JSON; in development use pino-pretty for readability.
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
              }
            : undefined,
        // Never log auth headers or cookie values — they contain the JWT.
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        // Correlation ID is injected per-request in a later branch via AsyncLocalStorage.
        // The X-Correlation-Id response header is set there too.
        autoLogging: true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply the throttle guard globally so every route is rate-limited.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Apply JWT authentication globally by default (routes opt out with @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply role-based access control globally (routes specify roles with @Roles()).
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
