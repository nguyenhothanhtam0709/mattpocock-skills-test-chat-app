import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { server } from './test/server';

const alice = {
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: null,
  shareReadReceipts: true,
};
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const carol = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b62', username: 'carol', nickname: null };
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';
const withCarol = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b71';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };
const summaries = [
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
      preview: 'see you at noon',
      createdAt: '2020-03-04T10:00:00Z',
    },
  },
  {
    id: withCarol,
    kind: 'direct',
    name: 'carol',
    members: [aliceMember, carol],
    isMember: true,
    closed: false,
    unreadCount: 0,
    lastMessage: { senderId: alice.id, preview: 'thanks!', createdAt: '2020-03-03T10:00:00Z' },
  },
];

function signedIn() {
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
  );
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('Conversation list', () => {
  it('shows a skeleton while loading, then each Conversation in the server order', async () => {
    signedIn();
    server.use(
      http.get('*/api/v1/conversations', async () => {
        await delay(50);
        return HttpResponse.json({ conversations: summaries });
      }),
    );
    render(<App />);

    expect(
      await screen.findByRole('status', { name: /loading conversations/i }),
    ).toBeInTheDocument();

    const rows = await screen.findAllByRole('button', { name: /see you at noon|thanks!/ });
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Bob')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('see you at noon')).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/2020|Mar/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText('carol')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('thanks!')).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: /loading conversations/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no Conversations', async () => {
    signedIn();
    render(<App />);

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it('opens the Conversation and its Messages when one is selected', async () => {
    signedIn();
    server.use(
      http.get('*/api/v1/conversations', () => HttpResponse.json({ conversations: summaries })),
      http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
        HttpResponse.json({
          messages: [
            {
              id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c02',
              conversationId: withBob,
              senderId: bob.id,
              sequence: 2,
              clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8d02',
              body: 'see you at noon',
              createdAt: '2020-03-04T10:00:00.000Z',
            },
            {
              id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c01',
              conversationId: withBob,
              senderId: alice.id,
              sequence: 1,
              clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8d01',
              body: 'lunch?',
              createdAt: '2020-03-04T09:00:00.000Z',
            },
          ],
          hasMore: false,
        }),
      ),
    );
    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Bob.*see you at noon/i }));

    expect(await screen.findByRole('heading', { name: 'Bob' })).toBeInTheDocument();
    expect(await screen.findByText('lunch?')).toBeInTheDocument();
    expect(screen.getAllByText('see you at noon').length).toBeGreaterThan(1);
  });
});
