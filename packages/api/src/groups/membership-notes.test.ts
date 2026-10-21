import { randomUUID } from 'node:crypto';
import {
  CreateGroupResponseSchema,
  GetMessagesResponseSchema,
  ListConversationsResponseSchema,
  LoginResponseSchema,
  MessageCreatedEventSchema,
  type Group,
} from '@chat/contracts';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { withApp } from '../../test/app-harness.js';
import { closeAllSockets, connectSocket, listenOnRandomPort } from '../../test/socket-client.js';

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

const leave = (app: NestFastifyApplication, as: Person, groupId: string) =>
  app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/leave`, headers: bearer(as) });

/** Oldest first, as `[kind, body-or-subject-username]`. */
async function timeline(app: NestFastifyApplication, as: Person, groupId: string) {
  const res = await history(app, as, groupId, '?limit=100');
  return GetMessagesResponseSchema.parse(res.json())
    .messages.reverse()
    .map((m) => [m.kind, m.kind === 'text' ? m.body : m.subject?.username] as const);
}

afterEach(closeAllSockets);

describe('stored membership notes', () => {
  it('stores "added" in history at its place in the sequence, for Members and the added User', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice);
      await post(app, alice, group.id, 'before');
      await addMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'after');

      expect(await timeline(app, alice, group.id)).toEqual([
        ['text', 'before'],
        ['member_added', 'Bob'],
        ['text', 'after'],
      ]);
      expect(await timeline(app, bob, group.id)).toEqual([
        ['member_added', 'Bob'],
        ['text', 'after'],
      ]);
      const res = await history(app, alice, group.id, '?limit=100');
      const note = GetMessagesResponseSchema.parse(res.json()).messages.find(
        (m) => m.kind === 'member_added',
      )!;
      expect(note.sequence).toBe(2);
      expect(note.senderId).toBe(alice.id);
    });
  });

  it('stores "removed" and "left", visible to the Former Member only up to their own note', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const carol = await signUp(app, 'Carol');
      const group = await createGroup(app, alice, [bob.id, carol.id]);
      await removeMember(app, alice, group.id, bob.id);
      await post(app, alice, group.id, 'bob is gone');
      await leave(app, carol, group.id);
      await post(app, alice, group.id, 'carol is gone');

      expect(await timeline(app, alice, group.id)).toEqual([
        ['member_removed', 'Bob'],
        ['text', 'bob is gone'],
        ['member_left', 'Carol'],
        ['text', 'carol is gone'],
      ]);
      expect(await timeline(app, bob, group.id)).toEqual([['member_removed', 'Bob']]);
      expect(await timeline(app, carol, group.id)).toEqual([
        ['member_removed', 'Bob'],
        ['text', 'bob is gone'],
        ['member_left', 'Carol'],
      ]);
    });
  });

  it('keeps a Former Member who is added back from seeing the gap, notes included', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const carol = await signUp(app, 'Carol');
      const group = await createGroup(app, alice, [bob.id]);
      await removeMember(app, alice, group.id, bob.id);
      await addMember(app, alice, group.id, carol.id);
      await post(app, alice, group.id, 'gap');
      await addMember(app, alice, group.id, bob.id);

      expect(await timeline(app, bob, group.id)).toEqual([
        ['member_removed', 'Bob'],
        ['member_added', 'Bob'],
      ]);
    });
  });

  it('does not let notes change the preview or the sequence of lastMessage', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice);
      expect((await summaryOf(app, alice, group.id))?.lastMessage).toBeNull();
      await post(app, alice, group.id, 'hello there');
      await addMember(app, alice, group.id, bob.id);

      expect((await summaryOf(app, alice, group.id))?.lastMessage?.preview).toBe('hello there');
      expect((await summaryOf(app, bob, group.id))?.lastMessage).toBeNull();
    });
  });

  it('pushes the note as message.created to the current Members and the added User, once each', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice);
      const url = await listenOnRandomPort(app);
      const aliceTab = await connectSocket(url, alice.token);
      const bobTab = await connectSocket(url, bob.token);
      const pushed = aliceTab.next('message.created');

      await addMember(app, alice, group.id, bob.id);

      const { message } = MessageCreatedEventSchema.parse(await pushed);
      expect(message.kind).toBe('member_added');
      expect(message.subject?.username).toBe('Bob');
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(bobTab.received.filter(([name]) => name === 'message.created')).toHaveLength(1);
      expect(aliceTab.received.filter(([name]) => name === 'message.created')).toHaveLength(1);
    });
  });
});
