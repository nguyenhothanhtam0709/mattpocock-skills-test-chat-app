import { randomUUID } from 'node:crypto';
import {
  CreateGroupResponseSchema,
  ErrorCode,
  ErrorResponseSchema,
  GetConversationResponseSchema,
  GetMessagesResponseSchema,
  ListConversationsResponseSchema,
  LoginResponseSchema,
  type Group,
} from '@chat/contracts';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { describe, expect, it } from 'vitest';
import { withApp } from '../../test/app-harness.js';

const password = 'correct horse battery';

interface Person {
  id: string;
  token: string;
}

async function signUp(app: NestFastifyApplication, username: string): Promise<Person> {
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { username, email: `${username.toLowerCase()}@example.com`, password },
  });
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { identifier: username, password },
  });
  const login = LoginResponseSchema.parse(res.json());
  return { id: login.user.id, token: login.accessToken };
}

const bearer = (p: Person) => ({ authorization: `Bearer ${p.token}` });

async function createGroup(
  app: NestFastifyApplication,
  owner: Person,
  memberIds: string[] = [],
): Promise<Group> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/groups',
    headers: bearer(owner),
    payload: { name: 'Club', memberIds },
  });
  return CreateGroupResponseSchema.parse(res.json()).conversation;
}

const addMember = (app: NestFastifyApplication, as: Person, groupId: string, userId: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/groups/${groupId}/members`,
    headers: bearer(as),
    payload: { userId },
  });

const removeMember = (app: NestFastifyApplication, as: Person, groupId: string, userId: string) =>
  app.inject({
    method: 'DELETE',
    url: `/api/v1/groups/${groupId}/members/${userId}`,
    headers: bearer(as),
  });

const post = (app: NestFastifyApplication, as: Person, groupId: string, body: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/conversations/${groupId}/messages`,
    headers: bearer(as),
    payload: { clientMessageId: randomUUID(), body },
  });

const history = (app: NestFastifyApplication, as: Person, groupId: string, query = '') =>
  app.inject({
    method: 'GET',
    url: `/api/v1/conversations/${groupId}/messages${query}`,
    headers: bearer(as),
  });

const bodies = (res: { json(): unknown }) =>
  GetMessagesResponseSchema.parse(res.json()).messages.map((m) => m.body);

async function summaryOf(app: NestFastifyApplication, as: Person, groupId: string) {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/conversations',
    headers: bearer(as),
  });
  return ListConversationsResponseSchema.parse(res.json()).conversations.find(
    (c) => c.id === groupId,
  );
}

const errorCode = (res: { json(): unknown }) => ErrorResponseSchema.parse(res.json()).error.code;

describe('membership periods and history windows', () => {
  it('shows a newly added Member only the Messages sent after they joined', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice);
      await post(app, alice, group.id, 'before bob');
      await addMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'after bob joined');

      expect(bodies(await history(app, bob, group.id, '?limit=100'))).toEqual(['after bob joined']);
      const newest = await history(app, bob, group.id);
      expect(bodies(newest)).toEqual(['after bob joined']);
      expect(GetMessagesResponseSchema.parse(newest.json()).hasMore).toBe(false);
      expect(bodies(await history(app, bob, group.id, '?before=2'))).toEqual([]);
      expect(bodies(await history(app, alice, group.id, '?limit=100'))).toEqual([
        'after bob joined',
        'before bob',
      ]);
    });
  });

  it('lets a Former Member read what was said while they were a Member, and nothing after', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      await post(app, alice, group.id, 'while bob was in');
      await removeMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'after bob left');

      expect(bodies(await history(app, bob, group.id, '?limit=100'))).toEqual(['while bob was in']);
      expect(bodies(await history(app, bob, group.id))).toEqual(['while bob was in']);
      const asBob = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${group.id}`,
        headers: bearer(bob),
      });
      expect(asBob.statusCode).toBe(200);
      expect(GetConversationResponseSchema.parse(asBob.json()).conversation.id).toBe(group.id);
    });
  });

  it('keeps the Group in a Former Member list, previewing the last Message of their window', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      await post(app, alice, group.id, 'last one bob saw');
      await removeMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'secret after leaving');

      const forBob = await summaryOf(app, bob, group.id);
      const forAlice = await summaryOf(app, alice, group.id);

      expect(forBob?.lastMessage?.preview).toBe('last one bob saw');
      expect(forBob?.isMember).toBe(false);
      expect(forAlice?.lastMessage?.preview).toBe('secret after leaving');
      expect(forAlice?.isMember).toBe(true);
    });
  });

  it('previews nothing for a Member added after the last Message', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice);
      await post(app, alice, group.id, 'old news');
      await addMember(app, alice, group.id, bob.id);

      const forBob = await summaryOf(app, bob, group.id);

      expect(forBob?.lastMessage).toBeNull();
      expect(forBob?.isMember).toBe(true);
    });
  });

  it('refuses a Former Member posting with NOT_A_MEMBER', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      await removeMember(app, alice, group.id, bob.id);

      const posted = await post(app, bob, group.id, 'hello?');

      expect(posted.statusCode).toBe(403);
      expect(errorCode(posted)).toBe(ErrorCode.NOT_A_MEMBER);
    });
  });

  it('opens a new period when a Former Member is added back, and the gap stays hidden', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      await post(app, alice, group.id, 'first period');
      await removeMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'the gap');
      await addMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'second period');
      await removeMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'after again');

      expect(bodies(await history(app, bob, group.id, '?limit=100'))).toEqual([
        'second period',
        'first period',
      ]);
      expect(bodies(await history(app, bob, group.id))).toEqual(['second period', 'first period']);
      const paged = await history(app, bob, group.id, '?limit=1');
      expect(bodies(paged)).toEqual(['second period']);
      expect(GetMessagesResponseSchema.parse(paged.json()).hasMore).toBe(true);
      expect(bodies(await history(app, bob, group.id, '?before=3'))).toEqual(['first period']);
    });
  });

  it('still answers CONVERSATION_NOT_FOUND to a never-Member', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const dave = await signUp(app, 'Dave');
      const group = await createGroup(app, alice);

      const read = await history(app, dave, group.id);
      const get = await app.inject({
        method: 'GET',
        url: `/api/v1/conversations/${group.id}`,
        headers: bearer(dave),
      });

      for (const res of [read, get]) {
        expect(res.statusCode).toBe(404);
        expect(errorCode(res)).toBe(ErrorCode.CONVERSATION_NOT_FOUND);
      }
      expect(await summaryOf(app, dave, group.id)).toBeUndefined();
    });
  });
});
