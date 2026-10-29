import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { fakeRealtime } from './test/fake-realtime';
import { stubLayout, unstubLayout } from './test/layout';
import { server } from './test/server';

const alice = {
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: null,
};
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const carol = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b62', username: 'carol', nickname: null };
const dave = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b63', username: 'dave', nickname: null };
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';
const withCarol = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b71';
const withDave = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b72';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

type Peer = typeof bob | typeof carol | typeof dave;

const summary = (id: string, peer: Peer, preview: string, unreadCount: number) => ({
  id,
  kind: 'direct' as const,
  name: peer.nickname ?? peer.username,
  members: [aliceMember, peer],
  isMember: true,
  closed: false,
  unreadCount,
  lastMessage: { senderId: peer.id, preview, createdAt: '2020-03-04T10:00:00Z' },
});

/** Signed in as Alice; the list answers with whatever `conversations` holds at the time. */
function signedIn(conversations: { current: unknown[] }) {
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () =>
      HttpResponse.json({ conversations: conversations.current }),
    ),
  );
}

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
    createdAt: '2020-03-05T10:00:00.000Z',
    ...over,
  };
};

const row = (preview: RegExp) => screen.findByRole('button', { name: preview });

/** Hides or shows the tab the way the browser does: the visibility state, then the event. */
function setTabVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (visible ? 'visible' : 'hidden'),
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Opens the Conversation with Bob, whose history is empty. */
async function openBob() {
  server.use(
    http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
      HttpResponse.json({ messages: [], hasMore: false }),
    ),
  );
  await userEvent.setup().click(await row(/Bob/));
  await screen.findByRole('heading', { name: 'Bob' });
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('Unread badges in the Conversation list', () => {
  it('shows the Unread Count as a badge, "99+" at the cap, and nothing at 0', async () => {
    signedIn({
      current: [
        summary(withBob, bob, 'from bob', 3),
        summary(withCarol, carol, 'from carol', 100),
        summary(withDave, dave, 'from dave', 0),
      ],
    });
    render(<App />);

    expect(await row(/from bob/)).toHaveAccessibleName(/3 unread/);
    expect(await row(/from carol/)).toHaveAccessibleName(/99\+ unread/);
    expect(await row(/from dave/)).not.toHaveAccessibleName(/unread/);
  });

  it('adds one for each text Message from someone else, and none for the User’s own or a System Message', async () => {
    signedIn({ current: [summary(withBob, bob, 'from bob', 1)] });
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/from bob/);

    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);

    act(() => fake.emit({ type: 'message.created', message: message(withBob, alice.id) }));
    act(() =>
      fake.emit({
        type: 'message.created',
        message: message(withBob, bob.id, { kind: 'member_added', body: '', subject: carol }),
      }),
    );
    expect(await row(/Bob/)).toHaveAccessibleName(/2 unread/);

    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    expect(await row(/Bob/)).toHaveAccessibleName(/3 unread/);
  });

  it('adds nothing for the open Conversation while the tab is visible and at the latest Message, and counts again once the tab is hidden', async () => {
    signedIn({ current: [summary(withBob, bob, 'from bob', 0)] });
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await openBob();

    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    await screen.findAllByText(/message \d+/);
    expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/);

    act(() => setTabVisible(false));
    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);

    act(() => setTabVisible(true));
    act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
    await screen.findAllByText(/message \d+/);
    expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
  });

  it('counts Messages arriving in the open Conversation while the User is scrolled up, and stops once back at the latest', async () => {
    stubLayout();
    try {
      signedIn({ current: [summary(withBob, bob, 'from bob', 0)] });
      const history = Array.from({ length: 6 }, () => message(withBob, bob.id)).reverse();
      server.use(
        http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
          HttpResponse.json({ messages: history, hasMore: false }),
        ),
      );
      const fake = fakeRealtime();
      render(<App createRealtime={() => fake.realtime} />);
      await userEvent.setup().click(await row(/Bob/));
      const viewport = await screen.findByRole('region', { name: /messages/i });
      await screen.findByText(history[0]!.body);

      viewport.scrollTop = 0;
      fireEvent.scroll(viewport);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /jump to latest/i })).toHaveAttribute(
          'data-active',
          'true',
        ),
      );
      act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
      expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);

      viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
      fireEvent.scroll(viewport);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /jump to latest/i })).toHaveAttribute(
          'data-active',
          'false',
        ),
      );
      act(() => fake.emit({ type: 'message.created', message: message(withBob, bob.id) }));
      expect(await row(/Bob/)).toHaveAccessibleName(/1 unread/);
    } finally {
      unstubLayout();
    }
  });

  it('takes the counts from the server again after a reconnect', async () => {
    const list = { current: [summary(withBob, bob, 'from bob', 0)] };
    signedIn(list);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    expect(await row(/from bob/)).not.toHaveAccessibleName(/unread/);

    act(() => fake.disconnect());
    // Missed while the connection was down.
    list.current = [summary(withBob, bob, 'missed', 4)];
    act(() => fake.reconnect());

    expect(await row(/missed/)).toHaveAccessibleName(/4 unread/);
  });
});
