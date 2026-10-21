import { randomUUID } from 'node:crypto';
import {
  CreateGroupResponseSchema,
  GroupMembershipEndedEventSchema,
  LoginResponseSchema,
  type Group,
} from '@chat/contracts';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { withApp } from '../../test/app-harness.js';
import {
  closeAllSockets,
  connectSocket,
  listenOnRandomPort,
  type TestSocket,
} from '../../test/socket-client.js';
import { RealtimeGateway, conversationRoom } from '../realtime/realtime.gateway.js';

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

const removeMember = (app: NestFastifyApplication, as: Person, groupId: string, userId: string) =>
  app.inject({
    method: 'DELETE',
    url: `/api/v1/groups/${groupId}/members/${userId}`,
    headers: bearer(as),
  });

const addMember = (app: NestFastifyApplication, as: Person, groupId: string, userId: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/groups/${groupId}/members`,
    headers: bearer(as),
    payload: { userId },
  });

const leave = (app: NestFastifyApplication, as: Person, groupId: string) =>
  app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/leave`, headers: bearer(as) });

const post = (app: NestFastifyApplication, as: Person, groupId: string, body = 'hello') =>
  app.inject({
    method: 'POST',
    url: `/api/v1/conversations/${groupId}/messages`,
    headers: bearer(as),
    payload: { clientMessageId: randomUUID(), body },
  });

const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

const inRoom = async (app: NestFastifyApplication, groupId: string): Promise<string[]> => {
  const sockets = await app
    .get(RealtimeGateway)
    .server.in(conversationRoom(groupId))
    .fetchSockets();
  return sockets.map((s) => s.id).sort();
};

const ids = (...clients: TestSocket[]) => clients.map((c) => c.socket.id!).sort();
const names = (client: TestSocket) => client.received.map(([name]) => name);
const bothNext = (event: string, a: TestSocket, b: TestSocket) =>
  Promise.all([a.next(event), b.next(event)]);

afterEach(closeAllSockets);

describe('Group rooms', () => {
  it('puts the sockets of every Member, on connect, in the Group room and nobody else', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const carol = await signUp(app, 'Carol');
      const group = await createGroup(app, alice, [bob.id]);
      const url = await listenOnRandomPort(app);

      const aliceTab = await connectSocket(url, alice.token);
      const bobTab1 = await connectSocket(url, bob.token);
      const bobTab2 = await connectSocket(url, bob.token);
      await connectSocket(url, carol.token);

      expect(await inRoom(app, group.id)).toEqual(ids(aliceTab, bobTab1, bobTab2));
    });
  });

  it('takes a removed User out of the room on every tab, with one event saying so, and nothing after', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      const url = await listenOnRandomPort(app);
      const aliceTab = await connectSocket(url, alice.token);
      const bobTab1 = await connectSocket(url, bob.token);
      const bobTab2 = await connectSocket(url, bob.token);
      const ended = bothNext('group.membership_ended', bobTab1, bobTab2);

      await removeMember(app, alice, group.id, bob.id);

      for (const payload of await ended) {
        expect(GroupMembershipEndedEventSchema.parse(payload)).toEqual({
          conversationId: group.id,
        });
      }
      expect(await inRoom(app, group.id)).toEqual(ids(aliceTab));
      await post(app, alice, group.id, 'after removal');
      await settle();
      for (const tab of [bobTab1, bobTab2]) expect(names(tab)).toEqual(['group.membership_ended']);
      expect(names(aliceTab)).toContain('message.created');
    });
  });

  it('does not re-join a removed User on reconnect', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      const url = await listenOnRandomPort(app);
      const aliceTab = await connectSocket(url, alice.token);
      const bobTab = await connectSocket(url, bob.token);
      await removeMember(app, alice, group.id, bob.id);
      bobTab.close();

      const bobAgain = await connectSocket(url, bob.token);
      await post(app, alice, group.id, 'after removal');
      await settle();

      expect(await inRoom(app, group.id)).toEqual(ids(aliceTab));
      expect(names(bobAgain)).toEqual([]);
    });
  });

  it('re-joins every socket of a Former Member who is added back', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      const url = await listenOnRandomPort(app);
      const aliceTab = await connectSocket(url, alice.token);
      const bobTab1 = await connectSocket(url, bob.token);
      const bobTab2 = await connectSocket(url, bob.token);
      await removeMember(app, alice, group.id, bob.id);
      await settle();
      expect(await inRoom(app, group.id)).toEqual(ids(aliceTab));

      await addMember(app, alice, group.id, bob.id);
      const received = bothNext('message.created', bobTab1, bobTab2);
      await post(app, alice, group.id, 'welcome back');

      expect(await inRoom(app, group.id)).toEqual(ids(aliceTab, bobTab1, bobTab2));
      expect(await received).toHaveLength(2);
    });
  });

  it('takes a leaver out of the room on every tab, with one event saying so', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const bob = await signUp(app, 'Bob');
      const group = await createGroup(app, alice, [bob.id]);
      const url = await listenOnRandomPort(app);
      const aliceTab = await connectSocket(url, alice.token);
      const bobTab1 = await connectSocket(url, bob.token);
      const bobTab2 = await connectSocket(url, bob.token);
      const ended = bothNext('group.membership_ended', bobTab1, bobTab2);

      await leave(app, bob, group.id);
      await ended;
      await post(app, alice, group.id, 'after leaving');
      await settle();

      expect(await inRoom(app, group.id)).toEqual(ids(aliceTab));
      for (const tab of [bobTab1, bobTab2]) expect(names(tab)).toEqual(['group.membership_ended']);
    });
  });

  it('tells the last Member who leaves only that the Group closed', async () => {
    await withApp({}, async (app) => {
      const alice = await signUp(app, 'Alice');
      const group = await createGroup(app, alice);
      const url = await listenOnRandomPort(app);
      const tab = await connectSocket(url, alice.token);
      const closed = tab.next('group.closed');

      await leave(app, alice, group.id);
      await closed;
      await settle();

      expect(names(tab)).toEqual(['group.closed']);
      expect(await inRoom(app, group.id)).toEqual([]);
    });
  });
});
