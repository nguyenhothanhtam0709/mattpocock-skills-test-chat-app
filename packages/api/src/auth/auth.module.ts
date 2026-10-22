import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { CLOCK } from '../clock/clock.js';
import { PG_POOL } from '../db/database.module.js';
import { AccessTokenAuthenticator } from './access-token-authenticator.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { PostgresTokenDenyList } from './postgres-token-deny-list.js';
import { TOKEN_DENY_LIST } from './token-deny-list.js';
import { TokenService } from './token.service.js';

/** The auth providers. Knows nothing about realtime, so realtime can depend on it. */
@Module({
  providers: [
    AuthService,
    TokenService,
    AccessTokenAuthenticator,
    AuthGuard,
    {
      provide: TOKEN_DENY_LIST,
      inject: [PG_POOL, CLOCK],
      useFactory: (pool: Pool) => new PostgresTokenDenyList(pool),
    },
  ],
  exports: [AuthService, TokenService, AccessTokenAuthenticator, AuthGuard],
})
export class AuthModule {}
