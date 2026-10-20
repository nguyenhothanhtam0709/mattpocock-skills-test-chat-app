import {
  ErrorCode,
  ErrorResponseSchema,
  SendDirectMessageResponseSchema,
  SendMessageResponseSchema,
  type Conversation,
  type Message,
  type SendDirectMessageRequest,
  type SendMessageRequest,
} from '@chat/contracts';

export type SendResult =
  { ok: true; message: Message; conversation?: Conversation } | { ok: false; error: string };

async function post(accessToken: string, path: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(new URL(path, window.location.origin), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Try again.' } as const;
  }
  const payload: unknown = await res.json().catch(() => undefined);
  if (res.ok) return { ok: true, payload } as const;
  const code = ErrorResponseSchema.safeParse(payload).data?.error.code;
  if (code === ErrorCode.RATE_LIMITED) {
    return { ok: false, error: 'You are sending too fast. Wait a moment and try again.' } as const;
  }
  if (code === ErrorCode.VALIDATION_FAILED) {
    return {
      ok: false,
      error: 'That Message cannot be sent. Check its length and characters.',
    } as const;
  }
  return { ok: false, error: 'Something went wrong. Try again.' } as const;
}

/** `POST /api/v1/direct-messages`: the first Message creates the Direct Conversation. */
export async function sendDirectMessage(
  accessToken: string,
  request: SendDirectMessageRequest,
): Promise<SendResult> {
  const res = await post(accessToken, '/api/v1/direct-messages', request);
  if (!res.ok) return res;
  return { ok: true, ...SendDirectMessageResponseSchema.parse(res.payload) };
}

/** `POST /api/v1/conversations/:id/messages` */
export async function sendMessage(
  accessToken: string,
  conversationId: string,
  request: SendMessageRequest,
): Promise<SendResult> {
  const res = await post(accessToken, `/api/v1/conversations/${conversationId}/messages`, request);
  if (!res.ok) return res;
  return { ok: true, ...SendMessageResponseSchema.parse(res.payload) };
}
