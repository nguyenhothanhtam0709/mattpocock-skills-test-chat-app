import {
  CreateGroupResponseSchema,
  ErrorCode,
  ErrorResponseSchema,
  type CreateGroupRequest,
  type Group,
} from '@chat/contracts';

export type CreateGroupResult = { ok: true; group: Group } | { ok: false; error: string };

/** `POST /api/v1/groups`: the caller becomes the Owner. */
export async function createGroup(
  accessToken: string,
  request: CreateGroupRequest,
): Promise<CreateGroupResult> {
  let res: Response;
  try {
    res = await fetch(new URL('/api/v1/groups', window.location.origin), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Try again.' };
  }
  const payload: unknown = await res.json().catch(() => undefined);
  if (res.ok) return { ok: true, group: CreateGroupResponseSchema.parse(payload).conversation };
  const code = ErrorResponseSchema.safeParse(payload).data?.error.code;
  if (code === ErrorCode.GROUP_FULL) {
    return { ok: false, error: 'A Group can have at most 256 Members.' };
  }
  if (code === ErrorCode.USER_NOT_FOUND) {
    return { ok: false, error: 'One of the chosen people no longer exists.' };
  }
  if (code === ErrorCode.VALIDATION_FAILED) {
    return { ok: false, error: 'That Group name is not allowed. Use 1-100 plain characters.' };
  }
  return { ok: false, error: 'Something went wrong. Try again.' };
}
