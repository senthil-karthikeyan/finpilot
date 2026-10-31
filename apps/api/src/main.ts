/**
 * reflect-metadata must be the FIRST import in the entry point.
 * NestJS decorators rely on the Reflect API it provides.
 */
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Defer logger until nestjs-pino Logger is available.
    bufferLogs: true,
  });

  // ── Structured logger ──────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Cookie parser — needed to read the httpOnly JWT cookie ─────────────────
  app.use(cookieParser());

  // ── Global API prefix ──────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation pipe — strips unknown fields, auto-transforms primitives ────
  // `whitelist: true` silently removes properties not declared in the DTO.
  // `transform: true` auto-converts query-string strings to numbers/booleans.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // warn but don't error on extra fields
    }),
  );

  // ── CORS — allow only the web origin, and allow credentials (cookie) ───────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,          // must be true for httpOnly cookie to be sent
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Correlation-Id'],
  });

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FinPilot API')
    .setDescription('Internal investment portfolio and goal monitoring platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token (e.g. Bearer <token>)',
        in: 'header',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

await bootstrap();
