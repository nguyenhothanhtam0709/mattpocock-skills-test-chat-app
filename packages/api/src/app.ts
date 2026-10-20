import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { systemClock, type Clock } from './clock/clock.js';

/** The only things app tests may swap out (see the spec's test-time overrides). */
export interface AppOverrides {
  clock?: Clock;
}

export async function createApp(
  rawConfig: Record<string, unknown>,
  overrides: AppOverrides = {},
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(rawConfig, overrides.clock ?? systemClock),
    new FastifyAdapter(),
    // Throw on boot failure (e.g. invalid config) instead of Nest's default process.abort().
    { logger: false, abortOnError: false },
  );
  app.setGlobalPrefix('api/v1');
  return app;
}
