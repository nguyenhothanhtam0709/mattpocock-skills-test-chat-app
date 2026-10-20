import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health.js';

describe('HealthResponseSchema', () => {
  it('accepts a healthy report', () => {
    expect(HealthResponseSchema.parse({ status: 'ok', database: 'up' })).toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('accepts an unhealthy report', () => {
    expect(HealthResponseSchema.safeParse({ status: 'error', database: 'down' }).success).toBe(
      true,
    );
  });

  it('rejects an unknown status', () => {
    expect(HealthResponseSchema.safeParse({ status: 'meh', database: 'up' }).success).toBe(false);
  });

  it('rejects a missing database field', () => {
    expect(HealthResponseSchema.safeParse({ status: 'ok' }).success).toBe(false);
  });
});
