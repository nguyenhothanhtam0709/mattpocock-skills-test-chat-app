import { z } from 'zod';

const LogLevel = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);

/** Env vars are strings: only the literals "true" and "false" are accepted. */
const EnvBoolean = z.enum(['true', 'false']).transform((v) => v === 'true');

/** `pino-roll` accepts 'daily' | 'hourly' or a number of milliseconds. */
const LogFileFrequency = z
  .union([z.enum(['daily', 'hourly']), z.coerce.number().int().positive()])
  .describe("'daily', 'hourly' or milliseconds");

export const ConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),

  /** The one origin CORS allows (the SPA), e.g. http://localhost:5173. */
  SPA_ORIGIN: z
    .url()
    .refine(
      (v) => URL.canParse(v) && new URL(v).origin === v,
      'must be an origin without path or trailing slash',
    )
    .default('http://localhost:5173'),

  /** Global log level, the fallback for every target without its own level. */
  LOG_LEVEL: LogLevel.default('info'),
  LOG_CONSOLE_ENABLED: EnvBoolean.default(true),
  LOG_CONSOLE_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_CONSOLE_LEVEL: LogLevel.optional(),
  LOG_FILE_ENABLED: EnvBoolean.default(false),
  LOG_FILE_PATH: z.string().min(1).default('logs/api.log'),
  /** Rotate when the file reaches this size, e.g. `10m`, `500k`. */
  LOG_FILE_MAX_SIZE: z
    .string()
    .regex(/^\d+[kmg]?$/i, 'must look like 10m, 500k or a byte count')
    .default('10m'),
  LOG_FILE_FREQUENCY: LogFileFrequency.default('daily'),
  /** Number of rotated files to keep. */
  LOG_FILE_RETENTION: z.coerce.number().int().min(1).default(7),
  LOG_FILE_LEVEL: LogLevel.optional(),

  /** Database queries slower than this are logged at warn. */
  DB_SLOW_QUERY_MS: z.coerce.number().int().min(0).default(200),

  /** Default rate limit: THROTTLE_LIMIT requests per THROTTLE_TTL_MS per client. */
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  THROTTLE_TTL_MS: z.coerce.number().int().min(1).default(60_000),
});

export type Config = z.infer<typeof ConfigSchema>;

/** Used as the `validate` hook of `@nestjs/config`: the app refuses to boot on invalid config. */
export function loadConfig(raw: Record<string, unknown>): Config {
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
