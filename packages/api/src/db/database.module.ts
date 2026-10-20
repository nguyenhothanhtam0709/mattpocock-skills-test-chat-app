import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { Logger } from 'pino';
import type { Config } from '../config/config.js';
import { PINO } from '../logging/logging.module.js';
import { instrumentPool } from './instrument-pool.js';

export const PG_POOL = Symbol('PG_POOL');

@Injectable()
class PoolShutdown implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService, PINO],
      useFactory: (config: ConfigService<Config, true>, logger: Logger) => {
        const pool = new Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          connectionTimeoutMillis: 2_000,
        });
        // An idle-client error must not crash the process.
        pool.on('error', () => {});
        return instrumentPool(pool, logger, config.get('DB_SLOW_QUERY_MS', { infer: true }));
      },
    },
    PoolShutdown,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
