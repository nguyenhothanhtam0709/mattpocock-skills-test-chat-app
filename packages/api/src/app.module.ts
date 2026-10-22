import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { Logger } from 'pino';
import { AuthApiModule } from './auth/auth-api.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import type { Clock } from './clock/clock.js';
import { ThrottlingModule } from './throttling/throttling.module.js';
import { ClockModule } from './clock/clock.module.js';
import { ErrorsModule } from './common/errors.module.js';
import { loadConfig } from './config/config.js';
import { DatabaseModule } from './db/database.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { GroupsController } from './groups/groups.controller.js';
import { GroupsService } from './groups/groups.service.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { CommitOrder } from './messages/commit-order.js';
import { ConversationQueries } from './messages/conversation-queries.js';
import { MessagesController } from './messages/messages.controller.js';
import { MessagesService } from './messages/messages.service.js';

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
        ThrottlingModule,
        LoggingModule.register(logger),
        DatabaseModule,
        ErrorsModule,
        ClockModule.register(clock),
        HealthModule,
        MembershipsModule,
        AuthModule,
        RealtimeModule,
        AuthApiModule,
      ],
      controllers: [MessagesController, GroupsController],
      providers: [MessagesService, GroupsService, CommitOrder, ConversationQueries],
    };
  }
}
