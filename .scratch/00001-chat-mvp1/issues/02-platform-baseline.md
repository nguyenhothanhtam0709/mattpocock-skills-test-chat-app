# 02: Platform baseline: config, security, logging, errors, rate limiting

**What to build:** The API is safe and observable before any feature lands. It refuses to boot on bad configuration, serves security headers and a strict CSP, allows only the SPA origin, logs every request with a request ID through pino, logs DB queries with timing, returns every error in one shape with a stable `ErrorCode`, and rate limits all requests by default.

**Blocked by:** 01

**Status:** resolved

- [x] Config is validated by a Zod schema through `@nestjs/config`'s validate hook; an invalid or missing value stops boot with a clear message (tested)
- [x] `@fastify/helmet` serves standard security headers and a strict Content-Security-Policy (tested on a response)
- [x] CORS allows only the configured SPA origin, with credentials; other origins are refused (tested)
- [x] `ErrorCode` string-valued enum in contracts plus the error response schema `{ error: { code, message, details? } }`; a global filter maps validation failures to `400 VALIDATION_FAILED` (with Zod issues in `details`), unknown errors to `500 INTERNAL_ERROR` without leaking internals
- [x] Project-owned `ZodValidationPipe` validates bodies, params and query strings against contracts schemas
- [x] One pino instance wrapped in a `PinoLoggerService` (Nest `LoggerService`, installed with buffered boot logs) and shared with the Fastify adapter
- [x] Request ID and User ID (when known) attached to every log line via AsyncLocalStorage, including DB query logs
- [x] One log line per HTTP request: method, route, status, duration, request ID, IP; no bodies; `authorization` and `cookie` headers redacted
- [x] DB queries logged with SQL text and duration at debug, never bound parameters; queries over 200 ms logged at warn
- [x] Transports configurable via validated env: console (JSON or pretty) and/or rotating file (`pino-roll`: path, max size, frequency, retention); per-target levels with a global fallback
- [x] Tests capture logs through an in-memory destination and assert on them
- [x] `@nestjs/throttler` applies a default 120 / min limit, responding `429 RATE_LIMITED` with `Retry-After`; test config lowers limits so this is testable

## Answer

Resolved on branch `agent/02-platform-baseline`. The API validates config at boot (Zod via `@nestjs/config` `validate`; boot failures throw instead of Nest's `process.abort`), serves helmet headers with a strict CSP, allows CORS only for `SPA_ORIGIN` (other origins get no CORS headers), returns every error as `{ error: { code, message, details? } }` through a global filter, and rate limits by default (120/min, `429 RATE_LIMITED` with `Retry-After`). `ErrorCode` and `ErrorResponseSchema` live in contracts; `ZodValidationPipe` is project-owned. One pino instance backs `PinoLoggerService` (buffered boot logs) and the Fastify adapter, with request ID and User ID via AsyncLocalStorage, one body-free line per request, DB query logs (SQL and duration at debug, warn over `DB_SLOW_QUERY_MS`, default 200), and console and `pino-roll` file transports with per-target levels. Tests capture logs through an in-memory destination (`logDestination` override). Unmapped `HttpException`s (e.g. an unknown route's 404) keep their status with code `INTERNAL_ERROR`, because the enum has no code for them.
