# 02: Platform baseline: config, security, logging, errors, rate limiting

**What to build:** The API is safe and observable before any feature lands. It refuses to boot on bad configuration, serves security headers and a strict CSP, allows only the SPA origin, logs every request with a request ID through pino, logs DB queries with timing, returns every error in one shape with a stable `ErrorCode`, and rate limits all requests by default.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Config is validated by a Zod schema through `@nestjs/config`'s validate hook; an invalid or missing value stops boot with a clear message (tested)
- [ ] `@fastify/helmet` serves standard security headers and a strict Content-Security-Policy (tested on a response)
- [ ] CORS allows only the configured SPA origin, with credentials; other origins are refused (tested)
- [ ] `ErrorCode` string-valued enum in contracts plus the error response schema `{ error: { code, message, details? } }`; a global filter maps validation failures to `400 VALIDATION_FAILED` (with Zod issues in `details`), unknown errors to `500 INTERNAL_ERROR` without leaking internals
- [ ] Project-owned `ZodValidationPipe` validates bodies, params and query strings against contracts schemas
- [ ] One pino instance wrapped in a `PinoLoggerService` (Nest `LoggerService`, installed with buffered boot logs) and shared with the Fastify adapter
- [ ] Request ID and User ID (when known) attached to every log line via AsyncLocalStorage, including DB query logs
- [ ] One log line per HTTP request: method, route, status, duration, request ID, IP; no bodies; `authorization` and `cookie` headers redacted
- [ ] DB queries logged with SQL text and duration at debug, never bound parameters; queries over 200 ms logged at warn
- [ ] Transports configurable via validated env: console (JSON or pretty) and/or rotating file (`pino-roll`: path, max size, frequency, retention); per-target levels with a global fallback
- [ ] Tests capture logs through an in-memory destination and assert on them
- [ ] `@nestjs/throttler` applies a default 120 / min limit, responding `429 RATE_LIMITED` with `Retry-After`; test config lowers limits so this is testable
