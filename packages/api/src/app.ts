import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { systemClock, type Clock } from './clock/clock.js';
import { loadConfig } from './config/config.js';
import { installHttpLogging } from './logging/http-logging.js';
import { createLogger, type LogDestination } from './logging/logger.js';
import { PinoLoggerService } from './logging/pino-logger.service.js';

/** The only things app tests may swap out (see the spec's test-time overrides). */
export interface AppOverrides {
  clock?: Clock;
  /** Replaces the configured log transports, e.g. with an in-memory destination. */
  logDestination?: LogDestination;
}

export async function createApp(
  rawConfig: Record<string, unknown>,
  overrides: AppOverrides = {},
): Promise<NestFastifyApplication> {
  // Fail fast on invalid configuration, before anything is opened.
  const config = loadConfig(rawConfig);
  const { logger, close: closeLogger } = await createLogger(config, overrides.logDestination);

  const adapter = new FastifyAdapter({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    // We emit our own single, body-free line per request (see installHttpLogging).
    disableRequestLogging: true,
  });
  installHttpLogging(adapter.getInstance(), logger);

  let app: NestFastifyApplication;
  try {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule.register(rawConfig, overrides.clock ?? systemClock, logger),
      adapter,
      // Boot logs are buffered until PinoLoggerService is installed below.
      // abortOnError: throw on boot failure instead of Nest's default process.abort().
      { bufferLogs: true, abortOnError: false },
    );
  } catch (error) {
    closeLogger();
    throw error;
  }
  app.useLogger(new PinoLoggerService(logger));
  app.setGlobalPrefix('api/v1');
  adapter.getInstance().addHook('onClose', (_instance, done) => {
    closeLogger();
    done();
  });
  return app;
}
