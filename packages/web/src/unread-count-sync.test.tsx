import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { fakeRealtime } from './test/fake-realtime';
import { server } from './test/server';

const alice = {
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: null,
  shareReadReceipts: true,
};
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const carol = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b62', username: 'carol', nickname: null };
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';
const withCarol = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b71';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const BEFORE = '2020-03-04T10:00:00.000Z';
const AT = '2020-03-05T10:00:00.000Z';
const AFTER = '2020-03-06T10:00:00.000Z';

let nextSequence = 10;
const message = (conversationId: string, senderId: string, over: Record<string, unknown> = {}) => {
  const sequence = nextSequence++;
  const n = String(sequence).padStart(4, '0');
  return {
    id: `0198a2b4-7c3e-7a52-9f31-5d2f4c1e${n}`,
    conversationId,
    senderId,
    sequence,
    clientMessageId: `0198a2b4-7c3e-7a52-9f31-5d2f4d1e${n}`,
    kind: 'text' as const,
    body: `message ${sequence}`,
    createdAt: AT,
    ...over,
  };
};

type Peer = typeof bob | typeof carol;

const summary = (
  id: string,
  peer: Peer,
  unreadCount: number,
  last: { sequence: number; body: string; createdAt: string } = {
    sequence: 5,
    body: 'from before',
    createdAt: BEFORE,
  },
) => ({
  id,
  kind: 'direct' as const,
  name: peer.nickname ?? peer.username,
  members: [aliceMember, peer],
  isMember: true,
  closed: false,
  unreadCount,
  lastMessage: {
    senderId: peer.id,
    sequence: last.sequence,
    preview: last.body,
    createdAt: last.createdAt,
  },
});

interface ServerList {
  current: unknown[];
  /** While true, each list request waits here for the test to answer it. */
  holding: boolean;
  held: ((conversations: unknown[]) => void)[];
  fetches: number;
  marked: number[];
  markReadStatus: number;
}

/** Signed in as Alice; Bob's and Carol's histories are empty and every mark-read is recorded. */
function signedIn(current: unknown[]): ServerList {
  const token = fakeAccessToken();
  const list: ServerList = {
    current,
    holding: false,
    held: [],
    fetches: 0,
    marked: [],
    markReadStatus: 200,
  };
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', async () => {
      list.fetches += 1;
      if (!list.holding) return HttpResponse.json({ conversations: list.current });
      const conversations = await new Promise<unknown[]>((resolve) => list.held.push(resolve));
      return HttpResponse.json({ conversations });
    }),
    http.get('*/api/v1/conversations/:id/messages', () =>
      HttpResponse.json({ messages: [], hasMore: false }),
    ),
    http.put('*/api/v1/conversations/:id/read', async ({ request }) => {
      const { upToSequence } = (await request.json()) as { upToSequence: number };
      list.marked.push(upToSequence);
      return list.markReadStatus === 200
        ? HttpResponse.json({ upToSequence })
        : HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Nope' } },
            { status: list.markReadStatus },
          );
    }),
  );
  return list;
}

const row = (name: RegExp) => screen.findByRole('button', { name });
const rowNames = () =>
  screen
    .getAllByRole('button', { name: /Bob|carol/ })
    .map((button) => button.textContent ?? '')
    .join(' | ');

/** Starts a list reload through a reconnect and waits until its request is held at the server. */
async function reloadHeld(list: ServerList, fake: ReturnType<typeof fakeRealtime>) {
  list.holding = true;
  const heldBefore = list.held.length;
  act(() => fake.disconnect());
  act(() => fake.reconnect());
  await waitFor(() => expect(list.held.length).toBe(heldBefore + 1));
  return list.held[heldBefore]!;
}

/** Answers a held request and lets the response reach the list. */
async function answer(respond: (conversations: unknown[]) => void, conversations: unknown[]) {
  await act(async () => {
    respond(conversations);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

async function openBob() {
  await userEvent.setup().click(await row(/Bob/));
  await screen.findByRole('heading', { name: 'Bob' });
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('The first Message of a new Direct Conversation', () => {
  it('counts once when its message.created follows the conversation.created that already counted it', async () => {
    signedIn([]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByText(/no conversations yet/i);
    const first = message(withBob, bob.id);

    act(() =>
      fake.emit({
        type: 'conversation.created',
        conversation: summary(withBob, bob, 1, first),
      }),
    );
    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
    act(() => fake.emit({ type: 'message.created', message: first }));

    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);

    const second = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: second }));
    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);
  });

  it('counts once when both events land before a render', async () => {
    signedIn([]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByText(/no conversations yet/i);
    const first = message(withBob, bob.id);

    act(() => {
      fake.emit({ type: 'conversation.created', conversation: summary(withBob, bob, 1, first) });
      fake.emit({ type: 'message.created', message: first });
    });

    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
  });
});

describe('Pushes landing before the list re-renders', () => {
  it('counts both of two message.created', async () => {
    signedIn([summary(withBob, bob, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);

    act(() => {
      fake.emit({ type: 'message.created', message: message(withBob, bob.id) });
      fake.emit({ type: 'message.created', message: message(withBob, bob.id) });
    });

    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);
  });

  it('keeps the update to another Conversation', async () => {
    signedIn([summary(withBob, bob, 0), summary(withCarol, carol, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);

    act(() => {
      fake.emit({ type: 'message.created', message: message(withBob, bob.id) });
      fake.emit({ type: 'message.created', message: message(withCarol, carol.id) });
    });

    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
    expect(await row(/carol/)).toHaveAccessibleName(/1 unread/);
  });

  it('keeps the new preview and order when conversation.read follows message.created', async () => {
    signedIn([summary(withCarol, carol, 0), summary(withBob, bob, 1)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);
    const arrived = message(withBob, bob.id, { body: 'brand new' });

    act(() => {
      fake.emit({ type: 'message.created', message: arrived });
      fake.emit({
        type: 'conversation.read',
        conversationId: withBob,
        upToSequence: arrived.sequence,
      });
    });

    const bobRow = await row(/Bob.*brand new/);
    expect(bobRow).not.toHaveAccessibleName(/unread/);
    expect(rowNames().indexOf('Bob')).toBeLessThan(rowNames().indexOf('carol'));
  });

  it('still counts a Message whose timestamp is older than the one pushed before it', async () => {
    // Concurrent senders: a Message's timestamp is taken before it wins its sequence.
    signedIn([summary(withBob, bob, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);

    act(() =>
      fake.emit({
        type: 'message.created',
        message: message(withBob, bob.id, { createdAt: AFTER }),
      }),
    );
    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
    act(() =>
      fake.emit({
        type: 'message.created',
        message: message(withBob, bob.id, { body: 'second', createdAt: AT }),
      }),
    );

    expect(await row(/Bob.*second/)).toHaveAccessibleName(/2 unread/);
  });
});

describe('A list response and the pushes around it', () => {
  it('keeps a Message pushed while the first load is in flight', async () => {
    const list = signedIn([]);
    list.holding = true;
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await waitFor(() => expect(list.held.length).toBe(1));

    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    await answer(list.held[0]!, [summary(withBob, bob, 0)]);

    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
  });

  it('keeps a Message pushed in flight when the response has not counted it', async () => {
    const list = signedIn([summary(withBob, bob, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);
    const respond = await reloadHeld(list, fake);

    const arrived = message(withBob, bob.id, { body: 'in flight' });
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    await answer(respond, [summary(withBob, bob, 0)]);

    expect(await row(/Bob.*in flight/)).toHaveAccessibleName(/1 unread/);
  });

  it('does not count again a Message pushed in flight that the response already counted', async () => {
    const list = signedIn([summary(withBob, bob, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);
    const respond = await reloadHeld(list, fake);

    const arrived = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    await answer(respond, [summary(withBob, bob, 1, arrived)]);

    expect(await row(new RegExp(`Bob.*${arrived.body}`))).toHaveAccessibleName(/1 unread/);
  });

  it('does not count again a Message pushed just after the response that counted it', async () => {
    const list = signedIn([summary(withBob, bob, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);
    const respond = await reloadHeld(list, fake);

    // Same timestamp for all three: only the sequence tells them apart.
    const older = message(withBob, bob.id);
    const newest = message(withBob, bob.id);
    await answer(respond, [summary(withBob, bob, 2, newest)]);
    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);

    act(() => fake.emit({ type: 'message.created', message: older }));
    act(() => fake.emit({ type: 'message.created', message: newest }));
    expect(await row(new RegExp(`Bob.*${newest.body}`))).toHaveAccessibleName(/2 unread/);

    // Past what the response reflected, Messages count again.
    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    expect(await row(/Bob/)).toHaveAccessibleName(/3 unread/);
  });

  it('counts a Message newer than the response even if its timestamp is older (concurrent senders)', async () => {
    // A Message's timestamp is taken before it wins its sequence.
    const last = { sequence: 5, body: 'won the lock first', createdAt: AFTER };
    signedIn([summary(withBob, bob, 1, last)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);

    const arrived = message(withBob, bob.id, { body: 'started first', createdAt: AT });
    act(() => fake.emit({ type: 'message.created', message: arrived }));

    expect(await row(/Bob.*started first/)).toHaveAccessibleName(/2 unread/);
  });

  it('counts a new Message with the same sender, text and timestamp as the last one', async () => {
    const last = { sequence: 5, body: 'ok', createdAt: AT };
    signedIn([summary(withBob, bob, 1, last)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);

    const again = message(withBob, bob.id, { body: 'ok', createdAt: AT });
    act(() => fake.emit({ type: 'message.created', message: again }));

    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);
  });

  it('asks the server when a conversation.read does not cover a newer Message the response already counted', async () => {
    const list = signedIn([summary(withBob, bob, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/Bob/);
    const respond = await reloadHeld(list, fake);

    const pushed = message(withBob, bob.id);
    const notYetPushed = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: pushed }));
    await answer(respond, [summary(withBob, bob, 2, notYetPushed)]);
    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);

    list.holding = false;
    list.current = [summary(withBob, bob, 1, notYetPushed)];
    act(() =>
      fake.emit({
        type: 'conversation.read',
        conversationId: withBob,
        upToSequence: pushed.sequence,
      }),
    );
    act(() => fake.emit({ type: 'message.created', message: notYetPushed }));

    await waitFor(async () => expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/));
  });

  it('clears the badge without asking when a conversation.read covers what the response counted', async () => {
    const list = signedIn([summary(withBob, bob, 2)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);

    act(() => fake.emit({ type: 'conversation.read', conversationId: withBob, upToSequence: 5 }));

    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);
    expect(list.fetches).toBe(1);
  });

  it('does not let an older response undo a conversation.read that landed in flight', async () => {
    const list = signedIn([summary(withBob, bob, 3)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    expect(await row(/Bob/)).toHaveAccessibleName(/3 unread/);
    const stale = await reloadHeld(list, fake);

    const arrived = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    expect(await row(/Bob/)).toHaveAccessibleName(/4 unread/);
    act(() =>
      fake.emit({
        type: 'conversation.read',
        conversationId: withBob,
        upToSequence: arrived.sequence,
      }),
    );
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);
    // The read restarted the load: the older answer is dropped and a newer one asked for.
    await waitFor(() => expect(list.held.length).toBe(2));
    await answer(stale, [summary(withBob, bob, 3)]);
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);

    await answer(list.held[1]!, [summary(withBob, bob, 0)]);
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);
  });
});

describe('A Message the open Conversation was expected to mark read', () => {
  it('shows as unread when the mark-read is cancelled by opening another Conversation', async () => {
    const list = signedIn([summary(withBob, bob, 0), summary(withCarol, carol, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await openBob();
    await waitFor(() => expect(list.fetches).toBe(1));

    const arrived = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);

    list.current = [summary(withBob, bob, 1, arrived), summary(withCarol, carol, 0)];
    await userEvent.setup().click(await row(/carol/));
    await screen.findByRole('heading', { name: 'carol' });

    await waitFor(async () => expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/));
    expect(list.marked).not.toContain(arrived.sequence);
  });

  it('shows as unread once the User leaves after the mark-read failed all its retries', async () => {
    const list = signedIn([summary(withBob, bob, 0), summary(withCarol, carol, 0)]);
    list.markReadStatus = 500;
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await openBob();
    await waitFor(() => expect(list.fetches).toBe(1));

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const arrived = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    // The first try and the retries at 1s, 3s and 9s, each answered before the next is due.
    for (let second = 0; second < 40 && list.marked.length < 4; second += 1) {
      await act(() => vi.advanceTimersByTimeAsync(1000));
    }
    expect(list.marked).toEqual(Array.from({ length: 4 }, () => arrived.sequence));
    vi.useRealTimers();
    // Still reading it: no badge, and nothing to ask the server yet.
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);
    expect(list.fetches).toBe(1);

    list.current = [summary(withBob, bob, 1, arrived), summary(withCarol, carol, 0)];
    await userEvent.setup().click(await row(/carol/));

    await waitFor(async () => expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/));
  });

  it('asks the server nothing on leaving when the conversation.read has arrived', async () => {
    const list = signedIn([summary(withBob, bob, 0), summary(withCarol, carol, 0)]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await openBob();
    await waitFor(() => expect(list.fetches).toBe(1));

    const arrived = message(withBob, bob.id);
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    await waitFor(() => expect(list.marked).toContain(arrived.sequence));
    act(() =>
      fake.emit({
        type: 'conversation.read',
        conversationId: withBob,
        upToSequence: arrived.sequence,
      }),
    );

    await userEvent.setup().click(await row(/carol/));
    await screen.findByRole('heading', { name: 'carol' });

    expect(list.fetches).toBe(1);
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);
  });
});
