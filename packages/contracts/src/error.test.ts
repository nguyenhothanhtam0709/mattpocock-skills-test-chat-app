import { describe, expect, it } from 'vitest';
import { ErrorCode, ErrorResponseSchema } from './error.js';

describe('ErrorCode', () => {
  it('is a string-valued enum whose values equal their names', () => {
    for (const [name, value] of Object.entries(ErrorCode)) {
      expect(value).toBe(name);
    }
    expect(Object.values(ErrorCode)).toEqual([
      'VALIDATION_FAILED',
      'UNAUTHENTICATED',
      'SESSION_REVOKED',
      'INVALID_CREDENTIALS',
      'USERNAME_TAKEN',
      'EMAIL_TAKEN',
      'USER_NOT_FOUND',
      'CONVERSATION_NOT_FOUND',
      'NOT_A_MEMBER',
      'NOT_GROUP_OWNER',
      'ALREADY_A_MEMBER',
      'GROUP_FULL',
      'GROUP_CLOSED',
      'CANNOT_MESSAGE_SELF',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ]);
  });
});

describe('ErrorResponseSchema', () => {
  it('accepts an error with a code and message', () => {
    const body = { error: { code: 'RATE_LIMITED', message: 'Too many requests' } };
    expect(ErrorResponseSchema.parse(body)).toEqual(body);
  });

  it('accepts optional details', () => {
    const body = {
      error: { code: 'VALIDATION_FAILED', message: 'Invalid', details: [{ path: ['a'] }] },
    };
    expect(ErrorResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects an unknown code', () => {
    expect(ErrorResponseSchema.safeParse({ error: { code: 'NOPE', message: 'x' } }).success).toBe(
      false,
    );
  });
});
