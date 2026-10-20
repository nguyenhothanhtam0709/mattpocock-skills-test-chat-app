import {
  GetMessagesResponseSchema,
  ListConversationsResponseSchema,
  type ConversationSummary,
  type Message,
} from '@chat/contracts';

export type ListConversationsResult =
  { ok: true; conversations: ConversationSummary[] } | { ok: false; error: string };

export type LatestMessagesResult = { ok: true; messages: Message[] } | { ok: false; error: string };

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

/** `GET /api/v1/conversations/:id/messages`: the newest page, returned oldest first. */
export async function latestMessages(
  accessToken: string,
  conversationId: string,
  signal?: AbortSignal,
): Promise<LatestMessagesResult> {
  const res = await get(accessToken, `/api/v1/conversations/${conversationId}/messages`, signal);
  if (!res.ok) return res;
  const { messages } = GetMessagesResponseSchema.parse(res.payload);
  return { ok: true, messages: [...messages].reverse() };
}
