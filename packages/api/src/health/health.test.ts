import { HealthResponseSchema } from '@chat/contracts';
import { describe, expect, it } from 'vitest';
import { withApp } from '../../test/app-harness.js';

describe('GET /api/v1/health', () => {
  it('reports healthy when the database is reachable', async () => {
    await withApp({}, async (app) => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });

      expect(res.statusCode).toBe(200);
      expect(HealthResponseSchema.parse(res.json())).toEqual({ status: 'ok', database: 'up' });
    });
  });

  it('reports unhealthy when the database is unreachable', async () => {
    await withApp({ databaseUrl: 'postgres://chat:chat@127.0.0.1:1/chat' }, async (app) => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/health' });

      expect(res.statusCode).toBe(503);
      expect(HealthResponseSchema.parse(res.json())).toEqual({
        status: 'error',
        database: 'down',
      });
    });
  });
});
