import type { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';

/**
 * Named throttlers get a suffixed header (`Retry-After-identifier`); clients only know the
 * plain `Retry-After`, so every 429 carries that one too.
 */
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    void reply.header('Retry-After', String(detail.timeToBlockExpire));
    return super.throwThrottlingException(context, detail);
  }
}

/**
 * Route-level guard that runs after `AuthGuard`, so the `search` throttler can be keyed by
 * User (the global guard runs before authentication and only sees the IP).
 */
export class SearchThrottlerGuard extends AppThrottlerGuard {}
