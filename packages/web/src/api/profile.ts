import { ErrorCode, ErrorResponseSchema, MeResponseSchema, type User } from '@chat/contracts';

export type UpdateNicknameResult = { ok: true; user: User } | { ok: false; error: string };

/** Calls `PATCH /api/v1/users/me`; `null` clears the Nickname. */
export async function updateNickname(
  accessToken: string,
  nickname: string | null,
): Promise<UpdateNicknameResult> {
  let res: Response;
  try {
    res = await fetch(new URL('/api/v1/users/me', window.location.origin), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ nickname }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Try again.' };
  }

  const payload: unknown = await res.json().catch(() => undefined);
  if (res.ok) return { ok: true, user: MeResponseSchema.parse(payload).user };
  const code = ErrorResponseSchema.safeParse(payload).data?.error.code;
  if (code === ErrorCode.VALIDATION_FAILED) {
    return { ok: false, error: 'Nickname must be 1-50 characters, without control characters.' };
  }
  return { ok: false, error: 'Something went wrong. Try again.' };
}
