import type { Pool } from 'pg';
import type { Logger } from 'pino';

function sqlText(first: unknown): string {
  if (typeof first === 'string') return first;
  const text = (first as { text?: unknown } | null)?.text;
  return typeof text === 'string' ? text : '<unknown query>';
}

/**
 * Wraps the pool's query path to log SQL text and duration at debug, and queries slower
 * than `slowQueryMs` at warn. Bound parameters are never logged.
 */
export function instrumentPool(pool: Pool, logger: Logger, slowQueryMs: number): Pool {
  const original = pool.query.bind(pool) as (...args: unknown[]) => unknown;

  const instrumented = (...args: unknown[]): unknown => {
    const start = performance.now();
    const sql = sqlText(args[0]);
    const report = () => {
      const durationMs = Math.round((performance.now() - start) * 1000) / 1000;
      const slow = durationMs > slowQueryMs;
      logger[slow ? 'warn' : 'debug']({ sql, durationMs }, slow ? 'slow db query' : 'db query');
    };
    const result = original(...args);
    if (result instanceof Promise) {
      return result.finally(report);
    }
    return result;
  };

  (pool as unknown as { query: unknown }).query = instrumented;
  return pool;
}
