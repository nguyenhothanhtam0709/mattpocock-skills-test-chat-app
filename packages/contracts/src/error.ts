import { z } from 'zod';

/** Stable, machine-readable error codes. Clients and tests branch on these, never on messages. */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  NOT_A_MEMBER: 'NOT_A_MEMBER',
  NOT_GROUP_OWNER: 'NOT_GROUP_OWNER',
  ALREADY_A_MEMBER: 'ALREADY_A_MEMBER',
  GROUP_FULL: 'GROUP_FULL',
  GROUP_CLOSED: 'GROUP_CLOSED',
  CANNOT_MESSAGE_SELF: 'CANNOT_MESSAGE_SELF',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorCodeSchema = z.enum(ErrorCode);

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
