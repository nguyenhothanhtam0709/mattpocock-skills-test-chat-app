import {
  ErrorCode,
  ErrorResponseSchema,
  LoginResponseSchema,
  MeResponseSchema,
} from '@chat/contracts';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { describe, expect, it } from 'vitest';
import { withApp } from '../../test/app-harness.js';

const alice = { username: 'Alice', email: 'alice@example.com', password: 'correct horse battery' };

async function signIn(app: NestFastifyApplication) {
  await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: alice });
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { identifier: 'alice', password: alice.password },
  });
  return LoginResponseSchema.parse(res.json()).accessToken;
}

function patchMe(app: NestFastifyApplication, accessToken: string | undefined, payload: unknown) {
  return app.inject({
    method: 'PATCH',
    url: '/api/v1/users/me',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    payload: payload as object,
  });
}

async function currentUser(app: NestFastifyApplication, accessToken: string) {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/users/me',
    headers: { authorization: `Bearer ${accessToken}` },
  });
  return MeResponseSchema.parse(res.json()).user;
}

describe('PATCH /users/me (Nickname)', () => {
  it('sets a Nickname, trimmed, and returns the updated User', async () => {
    await withApp({}, async (app) => {
      const token = await signIn(app);

      const res = await patchMe(app, token, { nickname: '  Ali  ' });

      expect(res.statusCode).toBe(200);
      expect(MeResponseSchema.parse(res.json()).user).toMatchObject({
        username: 'Alice',
        email: 'alice@example.com',
        nickname: 'Ali',
      });
      expect((await currentUser(app, token)).nickname).toBe('Ali');
    });
  });

  it('changes an existing Nickname', async () => {
    await withApp({}, async (app) => {
      const token = await signIn(app);
      await patchMe(app, token, { nickname: 'Ali' });

      await patchMe(app, token, { nickname: 'Allie' });

      expect((await currentUser(app, token)).nickname).toBe('Allie');
    });
  });

  it('clears the Nickname with null', async () => {
    await withApp({}, async (app) => {
      const token = await signIn(app);
      await patchMe(app, token, { nickname: 'Ali' });

      const res = await patchMe(app, token, { nickname: null });

      expect(res.statusCode).toBe(200);
      expect(MeResponseSchema.parse(res.json()).user.nickname).toBeNull();
      expect((await currentUser(app, token)).nickname).toBeNull();
    });
  });

  it('accepts a 50-character Nickname', async () => {
    await withApp({}, async (app) => {
      const token = await signIn(app);

      const res = await patchMe(app, token, { nickname: 'a'.repeat(50) });

      expect(res.statusCode).toBe(200);
    });
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['over 50 characters', 'a'.repeat(51)],
    ['containing a control character', 'Al\u0000i'],
    ['not a string', 42],
  ])('answers a Nickname that is %s with VALIDATION_FAILED', async (_name, nickname) => {
    await withApp({}, async (app) => {
      const token = await signIn(app);
      await patchMe(app, token, { nickname: 'Ali' });

      const res = await patchMe(app, token, { nickname });

      expect(res.statusCode).toBe(400);
      expect(ErrorResponseSchema.parse(res.json()).error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect((await currentUser(app, token)).nickname).toBe('Ali');
    });
  });

  it.each([
    ['a missing Nickname', {}],
    ['a body with a Username', { nickname: 'Ali', username: 'Mallory' }],
    ['a body with an email', { nickname: 'Ali', email: 'x@example.com' }],
  ])('answers %s with VALIDATION_FAILED and changes nothing', async (_name, payload) => {
    await withApp({}, async (app) => {
      const token = await signIn(app);

      const res = await patchMe(app, token, payload);

      expect(res.statusCode).toBe(400);
      expect(ErrorResponseSchema.parse(res.json()).error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(await currentUser(app, token)).toMatchObject({
        username: 'Alice',
        email: 'alice@example.com',
        nickname: null,
      });
    });
  });

  it('answers 401 UNAUTHENTICATED without an access token', async () => {
    await withApp({}, async (app) => {
      const res = await patchMe(app, undefined, { nickname: 'Ali' });

      expect(res.statusCode).toBe(401);
      expect(ErrorResponseSchema.parse(res.json()).error.code).toBe(ErrorCode.UNAUTHENTICATED);
    });
  });
});
