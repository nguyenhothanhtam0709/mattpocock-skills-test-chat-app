import { z } from 'zod';

export const ConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
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
