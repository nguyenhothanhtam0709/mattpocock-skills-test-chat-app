import { act, render, screen, waitFor, within } from '@testing-library/react';
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
  shareReadReceipts: true,
};
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const summary = {
  id: withBob,
  kind: 'direct' as const,
  name: 'Bob',
  members: [aliceMember, bob],
  isMember: true,
  closed: false,
  unreadCount: 0,
  lastMessage: { senderId: alice.id, preview: 'hi', createdAt: '2020-03-04T10:00:00Z' },
};

const message = (sequence: number, senderId: string) => {
  const n = String(sequence).padStart(4, '0');
  return {
    id: `0198a2b4-7c3e-7a52-9f31-5d2f4c1e${n}`,
    conversationId: withBob,
    senderId,
    sequence,
    clientMessageId: `0198a2b4-7c3e-7a52-9f31-5d2f4d1e${n}`,
    kind: 'text' as const,
    body: `message ${sequence}`,
    createdAt: '2020-03-05T10:00:00.000Z',
  };
};

/** Alice 1, Alice 2, Bob 3, Alice 4, Alice 5. */
const history = [
  message(1, alice.id),
  message(2, alice.id),
  message(3, bob.id),
  message(4, alice.id),
  message(5, alice.id),
];

/**
 * Signed in as Alice, with the Conversation with Bob. `GET /conversations/:id` answers with
 * whatever `receipt` holds at the time: Bob's Read Marker, or `undefined` to omit it.
 */
function signedIn(receipt: { current: number | undefined }) {
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () => HttpResponse.json({ conversations: [summary] })),
    http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
      HttpResponse.json({ messages: [...history].reverse(), hasMore: false }),
    ),
    http.get(`*/api/v1/conversations/${withBob}`, () =>
      HttpResponse.json({
        conversation: {
          id: withBob,
          kind: 'direct',
          members: [aliceMember, bob],
          ...(receipt.current === undefined ? {} : { readUpToSequence: receipt.current }),
        },
      }),
    ),
    http.put(`*/api/v1/conversations/${withBob}/read`, async ({ request }) =>
      HttpResponse.json(await request.json()),
    ),
  );
}

/** Opens the Conversation with Bob and waits for its newest Message. */
async function openBob() {
  await userEvent.setup().click(await screen.findByRole('button', { name: /Bob/ }));
  const viewport = await screen.findByRole('region', { name: /messages/i });
  await within(viewport).findByText('message 5');
  return viewport;
}

/** The Message the single "Seen" sits under. */
function seenUnder(viewport: HTMLElement) {
  const item = within(viewport)
    .getByText('Seen')
    .closest<HTMLElement>('[data-slot="message-scroller-item"]');
  return item && within(item).getByText(/^message \d+$/).textContent;
}

/** Long enough for a refetch that should not change anything to have answered. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('Read Receipts in a Direct Conversation', () => {
  it('shows "Seen" under the newest of my Messages at or before the other User\'s marker on open', async () => {
    signedIn({ current: 3 });
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    const viewport = await openBob();

    await waitFor(() => expect(seenUnder(viewport)).toBe('message 2'));
    expect(within(viewport).getAllByText('Seen')).toHaveLength(1);
  });

  it('moves "Seen" forward on conversation.receipt, and ignores other Conversations', async () => {
    signedIn({ current: 2 });
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    const viewport = await openBob();
    await waitFor(() => expect(seenUnder(viewport)).toBe('message 2'));

    act(() =>
      fake.emit({
        type: 'conversation.receipt',
        conversationId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b99',
        upToSequence: 5,
      }),
    );
    await settle();
    expect(seenUnder(viewport)).toBe('message 2');

    act(() =>
      fake.emit({ type: 'conversation.receipt', conversationId: withBob, upToSequence: 4 }),
    );

    await waitFor(() => expect(seenUnder(viewport)).toBe('message 4'));
    expect(within(viewport).getAllByText('Seen')).toHaveLength(1);
  });

  it('shows nothing when the response has no readUpToSequence', async () => {
    signedIn({ current: undefined });
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    const viewport = await openBob();
    await settle();

    expect(within(viewport).queryByText('Seen')).toBeNull();
  });

  it('shows nothing while the other User has read none of my Messages', async () => {
    signedIn({ current: 0 });
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    const viewport = await openBob();
    await settle();

    expect(within(viewport).queryByText('Seen')).toBeNull();
  });

  it('catches up on a receipt missed while disconnected, on reconnect', async () => {
    const receipt = { current: 2 as number | undefined };
    signedIn(receipt);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    const viewport = await openBob();
    await waitFor(() => expect(seenUnder(viewport)).toBe('message 2'));

    act(() => fake.disconnect());
    receipt.current = 5;
    act(() => fake.reconnect());

    await waitFor(() => expect(seenUnder(viewport)).toBe('message 5'));
  });
});
