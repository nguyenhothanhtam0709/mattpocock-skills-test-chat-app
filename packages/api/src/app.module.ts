import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { Logger } from 'pino';
import type { Pool } from 'pg';
import { AccessTokenAuthenticator } from './auth/access-token-authenticator.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { PostgresTokenDenyList } from './auth/postgres-token-deny-list.js';
import { TOKEN_DENY_LIST } from './auth/token-deny-list.js';
import { TokenService } from './auth/token.service.js';
import { UsersController } from './auth/users.controller.js';
import { ThrottlingModule } from './throttling/throttling.module.js';
import { ClockModule } from './clock/clock.module.js';
import { CLOCK, type Clock } from './clock/clock.js';
import { ErrorsModule } from './common/errors.module.js';
import { loadConfig } from './config/config.js';
import { DatabaseModule, PG_POOL } from './db/database.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { GroupsController } from './groups/groups.controller.js';
import { GroupsService } from './groups/groups.service.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { CommitOrder } from './messages/commit-order.js';
import { ConversationQueries } from './messages/conversation-queries.js';
import { MessagesController } from './messages/messages.controller.js';
import { MessagesService } from './messages/messages.service.js';
import { RealtimeGateway } from './realtime/realtime.gateway.js';

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
      ],
      controllers: [AuthController, UsersController, MessagesController, GroupsController],
      providers: [
        AuthService,
        MessagesService,
        GroupsService,
        CommitOrder,
        ConversationQueries,
        AuthGuard,
        AccessTokenAuthenticator,
        RealtimeGateway,
        TokenService,
        {
          provide: TOKEN_DENY_LIST,
          inject: [PG_POOL, CLOCK],
          useFactory: (pool: Pool) => new PostgresTokenDenyList(pool),
        },
      ],
    };
  }
}
