import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { server } from './test/server';

const alice = {
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: null,
};
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const withBob = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b70';
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () =>
      HttpResponse.json({
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
              preview: 'hello',
              createdAt: '2020-03-04T10:00:00Z',
            },
          },
        ],
      }),
    ),
    http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
      HttpResponse.json({
        messages: [
          {
            id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e0001',
            conversationId: withBob,
            senderId: bob.id,
            sequence: 1,
            clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4d1e0001',
            body: 'hello',
            createdAt: '2020-03-04T10:00:00.000Z',
          },
        ],
        hasMore: false,
      }),
    ),
  );
});

describe('Conversation pane height', () => {
  // jsdom has no layout, so the cause of the unbounded message-scroller spacer (ticket 46) is
  // asserted at its source: the message scroller measures its viewport's height, so the app frame
  // must give the pane a definite height (not just a minimum) for the viewport to scroll within.
  it('is bounded to the viewport height so the message list scrolls instead of growing the page', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Bob.*hello/i }));
    await screen.findByRole('region', { name: /messages/i });

    const frame = document.querySelector('[data-slot="sidebar-wrapper"]');
    expect(frame).toHaveClass('h-svh');
  });
});
