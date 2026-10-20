import { inject } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp, type AppOverrides } from '../src/app.js';

export interface HarnessOptions extends AppOverrides {
  /** Defaults to the run's Testcontainers Postgres. */
  databaseUrl?: string;
}

/**
 * Boots the real Nest app against the run's Postgres, hands it to the test (use
 * `app.inject()` for HTTP), and always closes it afterwards.
 */
export async function withApp(
  options: HarnessOptions,
  run: (app: NestFastifyApplication) => Promise<void>,
): Promise<void> {
  const { databaseUrl = inject('databaseUrl'), ...overrides } = options;
  const app = await createApp({ DATABASE_URL: databaseUrl }, overrides);
  try {
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    await run(app);
  } finally {
    await app.close();
  }
}
