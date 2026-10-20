import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { Logger } from 'pino';
import { CLOCK, type Clock } from './clock/clock.js';
import { ErrorsModule } from './common/errors.module.js';
import { loadConfig } from './config/config.js';
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
        LoggingModule.register(logger),
        DatabaseModule,
        ErrorsModule,
      ],
      controllers: [HealthController],
      providers: [{ provide: CLOCK, useValue: clock }],
      exports: [CLOCK],
    };
  }
}
