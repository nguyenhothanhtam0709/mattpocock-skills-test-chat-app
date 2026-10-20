import {
  GetMessagesResponseSchema,
  ListConversationsResponseSchema,
  type ConversationSummary,
  type Message,
} from '@chat/contracts';

export type ListConversationsResult =
  { ok: true; conversations: ConversationSummary[] } | { ok: false; error: string };

export type MessagesCursor = { before?: number; after?: number };

export type MessagesPageResult =
  { ok: true; messages: Message[]; hasMore: boolean } | { ok: false; error: string };

async function get(accessToken: string, path: string, signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(new URL(path, window.location.origin), {
      headers: { authorization: `Bearer ${accessToken}` },
      signal,
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Try again.' } as const;
  }
  if (!res.ok) return { ok: false, error: 'Something went wrong. Try again.' } as const;
  return { ok: true, payload: (await res.json().catch(() => undefined)) as unknown } as const;
}

/** `GET /api/v1/conversations`: already sorted, most recently active first. */
export async function listConversations(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ListConversationsResult> {
  const res = await get(accessToken, '/api/v1/conversations', signal);
  if (!res.ok) return res;
  return { ok: true, ...ListConversationsResponseSchema.parse(res.payload) };
}

/**
 * `GET /api/v1/conversations/:id/messages`: a page of Messages, returned oldest first. Without
 * a cursor it is the newest page; `before` gives the page just older than that sequence, and
 * `after` the page just newer (to fill a gap).
 */
export async function messagesPage(
  accessToken: string,
  conversationId: string,
  cursor: MessagesCursor = {},
  signal?: AbortSignal,
): Promise<MessagesPageResult> {
  const query =
    cursor.before !== undefined
      ? `?before=${cursor.before}`
      : cursor.after !== undefined
        ? `?after=${cursor.after}`
        : '';
  const res = await get(
    accessToken,
    `/api/v1/conversations/${conversationId}/messages${query}`,
    signal,
  );
  if (!res.ok) return res;
  const { messages, hasMore } = GetMessagesResponseSchema.parse(res.payload);
  // `before` and the default come newest first; `after` already comes oldest first.
  return {
    ok: true,
    messages: cursor.after === undefined ? [...messages].reverse() : messages,
    hasMore,
  };
}
