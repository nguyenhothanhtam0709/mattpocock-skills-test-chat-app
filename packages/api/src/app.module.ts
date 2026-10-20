import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import type { Logger } from 'pino';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { TokenService } from './auth/token.service.js';
import { UsersController } from './auth/users.controller.js';
import { AppThrottlerGuard } from './common/app-throttler.guard.js';
import { CLOCK, type Clock } from './clock/clock.js';
import { ErrorsModule } from './common/errors.module.js';
import { loadConfig, type Config } from './config/config.js';
import { DatabaseModule } from './db/database.module.js';
import { HealthController } from './health/health.controller.js';
import { LoggingModule } from './logging/logging.module.js';

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
      controllers: [HealthController, AuthController, UsersController],
      providers: [
        AuthService,
        AuthGuard,
        TokenService,
        { provide: CLOCK, useValue: clock },
        // Rate limit every route by default.
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
      ],
      exports: [CLOCK],
    };
  }
}
