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
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const row = (sequence: number) => ({
  id: `0198a2b4-7c3e-7a52-9f31-5d2f4c1e${String(sequence).padStart(4, '0')}`,
  conversationId: withBob,
  senderId: bob.id,
  sequence,
  clientMessageId: `0198a2b4-7c3e-7a52-9f31-5d2f4d1e${String(sequence).padStart(4, '0')}`,
  body: `message ${sequence}`,
  createdAt: '2020-03-04T10:00:00.000Z',
});

/** The server holds Messages 1..`total.n`; `after` pages are capped at two to force paging. */
function openConversation() {
  const total = { n: 2 };
  const requests: URLSearchParams[] = [];
  let conversationLoads = 0;
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () => {
      conversationLoads += 1;
      return HttpResponse.json({
        conversations: [
          {
            id: withBob,
            kind: 'direct',
            name: 'Bob',
            members: [aliceMember, bob],
            isMember: true,
            closed: false,
            unreadCount: 0,
            lastMessage: {
              senderId: bob.id,
              preview: `message ${total.n}`,
              createdAt: '2020-03-04T10:00:00Z',
            },
          },
        ],
      });
    }),
    http.get(`*/api/v1/conversations/${withBob}/messages`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const after = params.get('after');
      if (after !== null) {
        const newer = Array.from(
          { length: total.n - Number(after) },
          (_, i) => Number(after) + 1 + i,
        );
        return HttpResponse.json({
          messages: newer.slice(0, 2).map(row),
          hasMore: newer.length > 2,
        });
      }
      const all = Array.from({ length: total.n }, (_, i) => total.n - i);
      return HttpResponse.json({ messages: all.map(row), hasMore: false });
    }),
  );
  return { total, requests, conversationLoads: () => conversationLoads };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('reconnect gap-fill', () => {
  it('shows an alert while disconnected and hides it when reconnected', async () => {
    openConversation();
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByRole('button', { name: /Bob/ });
    expect(screen.queryByText(/connection lost/i)).not.toBeInTheDocument();

    act(() => fake.disconnect());
    expect(await screen.findByText(/connection lost/i)).toBeInTheDocument();

    act(() => fake.reconnect());
    await waitFor(() => expect(screen.queryByText(/connection lost/i)).not.toBeInTheDocument());
  });

  it('fills Messages missed while disconnected exactly once and refreshes the sidebar', async () => {
    const fakeServer = openConversation();
    const fake = fakeRealtime();
    const user = userEvent.setup();
    render(<App createRealtime={() => fake.realtime} />);
    await user.click(await screen.findByRole('button', { name: /Bob/ }));
    const thread = await screen.findByRole('region', { name: /messages/i });
    await within(thread).findByText('message 2');
    const loadsBefore = fakeServer.conversationLoads();

    act(() => fake.disconnect());
    fakeServer.total.n = 5;
    act(() => fake.reconnect());
    // A push for a Message the fetch also returns.
    act(() => fake.emit({ type: 'message.created', message: row(5) } as never));

    await within(thread).findByText('message 3');
    await within(thread).findByText('message 4');
    await waitFor(() =>
      expect(fakeServer.requests.filter((p) => p.has('after')).map((p) => p.get('after'))).toEqual([
        '2',
        '4',
      ]),
    );
    expect(within(thread).getAllByText('message 5')).toHaveLength(1);
    expect(within(thread).getAllByText('message 3')).toHaveLength(1);
    expect(within(thread).getAllByText('message 4')).toHaveLength(1);
    await waitFor(() => expect(fakeServer.conversationLoads()).toBeGreaterThan(loadsBefore));
  });
});
