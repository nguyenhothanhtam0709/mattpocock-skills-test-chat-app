import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { fakeRealtime } from './test/fake-realtime';
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
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';
const withCarol = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b71';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const summary = (
  id: string,
  peer: typeof bob | typeof carol,
  preview: string,
  createdAt: string,
) => ({
  id,
  kind: 'direct' as const,
  name: peer.nickname ?? peer.username,
  members: [aliceMember, { id: peer.id, username: peer.username, nickname: peer.nickname }],
  isMember: true,
  closed: false,
  unreadCount: 0,
  lastMessage: { senderId: peer.id, preview, createdAt },
});

const message = (over: Partial<Record<string, unknown>>) => ({
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c10',
  conversationId: withBob,
  senderId: bob.id,
  sequence: 3,
  clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8d10',
  kind: 'text',
  body: 'new one',
  createdAt: '2020-03-05T10:00:00.000Z',
  ...over,
});

function signedIn(conversations: unknown[]) {
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () => HttpResponse.json({ conversations })),
  );
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('real-time push in the SPA', () => {
  it('moves a Conversation to the top with the new preview when a Message arrives', async () => {
    signedIn([
      summary(withCarol, carol, 'older', '2020-03-04T10:00:00Z'),
      summary(withBob, bob, 'oldest', '2020-03-03T10:00:00Z'),
    ]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByRole('button', { name: /Bob.*oldest/ });

    act(() =>
      fake.emit({
        type: 'message.created',
        message: message({ body: '  hello\n  there  ' }),
      } as never),
    );

    const rows = await screen.findAllByRole('button', { name: /hello there|older/ });
    expect(within(rows[0]!).getByText('Bob')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('hello there')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('carol')).toBeInTheDocument();
  });

  it('adds a brand-new Conversation to the sidebar', async () => {
    signedIn([]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByText(/no conversations yet/i);

    act(() =>
      fake.emit({
        type: 'conversation.created',
        conversation: summary(withBob, bob, 'hi alice', '2020-03-05T10:00:00Z'),
      }),
    );

    expect(await screen.findByRole('button', { name: /Bob.*hi alice/ })).toBeInTheDocument();
    expect(screen.queryByText(/no conversations yet/i)).not.toBeInTheDocument();
  });

  it('does not duplicate a Conversation it already lists', async () => {
    signedIn([summary(withBob, bob, 'hi alice', '2020-03-05T10:00:00Z')]);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByRole('button', { name: /Bob/ });

    act(() =>
      fake.emit({
        type: 'conversation.created',
        conversation: summary(withBob, bob, 'hi alice', '2020-03-05T10:00:00Z'),
      }),
    );

    expect(screen.getAllByRole('button', { name: /Bob/ })).toHaveLength(1);
  });

  it('replaces a stale entry when conversation.created arrives for an ID already listed', async () => {
    const stale = {
      ...summary(withBob, bob, 'hi alice', '2020-03-05T10:00:00Z'),
      kind: 'group' as const,
      name: 'Book Club',
      members: [],
      isMember: false,
    };
    signedIn([stale]);
    server.use(
      http.get(`*/api/v1/conversations/${withBob}`, () =>
        HttpResponse.json({
          conversation: { ...stale, ownerId: bob.id, members: [aliceMember, bob], isMember: true },
        }),
      ),
      http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
        HttpResponse.json({ messages: [], hasMore: false }),
      ),
    );
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByRole('button', { name: /Book Club/ });

    act(() =>
      fake.emit({
        type: 'conversation.created',
        conversation: { ...stale, members: [aliceMember, bob], isMember: true },
      }),
    );

    await userEvent.setup().click(screen.getByRole('button', { name: /Book Club/ }));
    expect(await screen.findByRole('textbox', { name: /message/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Book Club/ })).toHaveLength(1);
  });

  it('reloads the list when a Message arrives for a Conversation it does not know', async () => {
    let listed: unknown[] = [];
    signedIn([]);
    server.use(
      http.get('*/api/v1/conversations', () => HttpResponse.json({ conversations: listed })),
    );
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByText(/no conversations yet/i);

    listed = [summary(withBob, bob, 'new one', '2020-03-05T10:00:00Z')];
    act(() => fake.emit({ type: 'message.created', message: message({}) } as never));

    expect(await screen.findByRole('button', { name: /Bob.*new one/ })).toBeInTheDocument();
  });

  it('appends an incoming Message to the open Conversation', async () => {
    signedIn([summary(withBob, bob, 'oldest', '2020-03-03T10:00:00Z')]);
    server.use(
      http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
        HttpResponse.json({
          messages: [
            message({ id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c01', sequence: 1, body: 'oldest' }),
          ],
          hasMore: false,
        }),
      ),
    );
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Bob.*oldest/ }));
    await screen.findByRole('heading', { name: 'Bob' });
    await screen.findAllByText('oldest');

    act(() =>
      fake.emit({ type: 'message.created', message: message({ body: 'just now' }) } as never),
    );
    act(() =>
      fake.emit({ type: 'message.created', message: message({ body: 'just now' }) } as never),
    );

    expect(await screen.findAllByText('just now')).toHaveLength(2); // bubble + sidebar preview
  });

  it('ignores a Message for a Conversation that is not open', async () => {
    signedIn([
      summary(withBob, bob, 'oldest', '2020-03-03T10:00:00Z'),
      summary(withCarol, carol, 'older', '2020-03-02T10:00:00Z'),
    ]);
    server.use(
      http.get(`*/api/v1/conversations/${withCarol}/messages`, () =>
        HttpResponse.json({ messages: [], hasMore: false }),
      ),
    );
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /carol.*older/ }));

    act(() =>
      fake.emit({ type: 'message.created', message: message({ body: 'for bob' }) } as never),
    );

    // Only the sidebar preview shows it; the open Conversation (carol) does not.
    expect(await screen.findAllByText('for bob')).toHaveLength(1);
  });

  it('stops listening when the User signs out', async () => {
    signedIn([]);
    server.use(http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })));
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByText(/no conversations yet/i);
    expect(fake.subscriberCount).toBeGreaterThan(0);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Alice/ }));
    await user.click(await screen.findByRole('menuitem', { name: /log out/i }));

    await screen.findByRole('button', { name: /log in|sign in/i }).catch(() => undefined);
    expect(fake.subscriberCount).toBe(0);
  });
});
