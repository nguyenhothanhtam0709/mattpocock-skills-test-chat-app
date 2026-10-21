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
const groupId = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b80';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

/** Signed in as Alice, who sees a Group she is no longer a Member of, with one readable Message. */
function formerMemberOf(isMember: boolean) {
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: fakeAccessToken() })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () =>
      HttpResponse.json({
        conversations: [
          {
            id: groupId,
            kind: 'group',
            name: 'Book Club',
            members: [bob],
            isMember,
            closed: false,
            lastMessage: {
              senderId: bob.id,
              preview: 'see you all',
              createdAt: '2026-10-20T09:30:00.000Z',
            },
          },
        ],
      }),
    ),
    http.get(`*/api/v1/conversations/${groupId}/messages`, () =>
      HttpResponse.json({
        messages: [
          {
            id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c03',
            conversationId: groupId,
            senderId: bob.id,
            sequence: 2,
            clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c04',
            kind: 'member_removed',
            body: '',
            subject: { id: alice.id, username: alice.username, nickname: alice.nickname },
            createdAt: '2026-10-20T09:31:00.000Z',
          },
          {
            id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c01',
            conversationId: groupId,
            senderId: bob.id,
            sequence: 1,
            clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c02',
            body: 'see you all',
            createdAt: '2026-10-20T09:30:00.000Z',
          },
        ],
        hasMore: false,
      }),
    ),
  );
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('a Group the User is a Former Member of', () => {
  it('shows what they could read and replaces the composer with an explanation', async () => {
    formerMemberOf(false);
    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Book Club/ }));

    expect(await screen.findByText('see you all', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('Alice was removed')).toBeInTheDocument();
    expect(screen.getByText(/you are no longer a member of this group/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^send$/i })).not.toBeInTheDocument();
  });

  it('keeps the composer for a current Member', async () => {
    formerMemberOf(true);
    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Book Club/ }));

    expect(await screen.findByRole('textbox', { name: /message/i })).toBeInTheDocument();
    expect(screen.queryByText(/no longer a member/i)).not.toBeInTheDocument();
  });
});
