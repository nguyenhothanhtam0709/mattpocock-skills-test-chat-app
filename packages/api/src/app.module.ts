import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Logger } from 'pino';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
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
            ],
          }),
        }),
        LoggingModule.register(logger),
        DatabaseModule,
        ErrorsModule,
      ],
      controllers: [HealthController, AuthController],
      providers: [
        AuthService,
        { provide: CLOCK, useValue: clock },
        // Rate limit every route by default.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
      exports: [CLOCK],
    };
  }
}
