import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import type { Logger } from 'pino';
import type { Pool } from 'pg';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { PostgresTokenDenyList } from './auth/postgres-token-deny-list.js';
import { TOKEN_DENY_LIST } from './auth/token-deny-list.js';
import { TokenService } from './auth/token.service.js';
import { UsersController } from './auth/users.controller.js';
import { AppThrottlerGuard } from './common/app-throttler.guard.js';
import { CLOCK, type Clock } from './clock/clock.js';
import { ErrorsModule } from './common/errors.module.js';
import { loadConfig, type Config } from './config/config.js';
import { DatabaseModule, PG_POOL } from './db/database.module.js';
import { HealthController } from './health/health.controller.js';
import { LoggingModule } from './logging/logging.module.js';
import { MessagesController } from './messages/messages.controller.js';
import { MessagesService } from './messages/messages.service.js';

const SEARCH_URL = '/api/v1/users/search';
const SEND_URLS = ['/api/v1/direct-messages', '/api/v1/conversations/:id/messages'];
const isSendRoute = (req: FastifyRequest): boolean =>
  req.method === 'POST' && SEND_URLS.includes(req.routeOptions?.url ?? '');

/** `AuthGuard` sets `request.auth`; the global throttler guard runs before it. */
const authenticatedUserId = (req: Record<string, unknown>): unknown =>
  (req['auth'] as { userId?: unknown } | undefined)?.userId;
const isAuthenticated = (req: object): boolean =>
  authenticatedUserId(req as Record<string, unknown>) !== undefined;

@Module({})
export class AppModule {
  static register(rawConfig: Record<string, unknown>, clock: Clock, logger: Logger): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          // Configuration is passed in explicitly (main.ts hands it process.env), so the
          // validate hook ignores what @nestjs/config collected and parses `rawConfig`.
          validate: () => loadConfig(rawConfig),
        }),
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService<Config, true>) => ({
            throttlers: [
              {
                limit: config.get('THROTTLE_LIMIT', { infer: true }),
                ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
                // Route-level guards run after authentication; the global guard has already
                // counted the request by then.
                skipIf: (context) => isAuthenticated(context.switchToHttp().getRequest()),
              },
              // User search only: 30 per minute per User, counted by the route-level guard
              // once the caller is authenticated.
              {
                name: 'search',
                limit: 30,
                ttl: 60 * 1000,
                skipIf: (context) => {
                  const req = context.switchToHttp().getRequest<FastifyRequest>();
                  return !isAuthenticated(req) || req.routeOptions?.url !== SEARCH_URL;
                },
                getTracker: (req) => `user:${String(authenticatedUserId(req))}`,
              },
              // Message sends only (direct and to a Conversation): 30 per 10 s per User.
              {
                name: 'send',
                limit: 30,
                ttl: 10 * 1000,
                skipIf: (context) => {
                  const req = context.switchToHttp().getRequest<FastifyRequest>();
                  return !isAuthenticated(req) || !isSendRoute(req);
                },
                getTracker: (req) => `user:${String(authenticatedUserId(req))}`,
              },
              // Login only: 5 attempts per 15 minutes per identifier (the per-IP limit is on
              // the route itself).
              {
                name: 'identifier',
                limit: 5,
                ttl: 15 * 60 * 1000,
                skipIf: (context) =>
                  context.switchToHttp().getRequest<FastifyRequest>().routeOptions?.url !==
                  '/api/v1/auth/login',
                getTracker: (req) => {
                  const identifier = (req['body'] as { identifier?: unknown } | undefined)
                    ?.identifier;
                  return typeof identifier === 'string'
                    ? `identifier:${identifier.normalize('NFC').toLowerCase()}`
                    : `ip:${String(req['ip'])}`;
                },
              },
            ],
          }),
        }),
        LoggingModule.register(logger),
        DatabaseModule,
        ErrorsModule,
      ],
      controllers: [HealthController, AuthController, UsersController, MessagesController],
      providers: [
        AuthService,
        MessagesService,
        AuthGuard,
        TokenService,
        { provide: CLOCK, useValue: clock },
        {
          provide: TOKEN_DENY_LIST,
          inject: [PG_POOL, CLOCK],
          useFactory: (pool: Pool, appClock: Clock) => new PostgresTokenDenyList(pool, appClock),
        },
        // Rate limit every route by default.
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
      ],
      exports: [CLOCK],
    };
  }
}
