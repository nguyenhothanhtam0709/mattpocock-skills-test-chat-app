import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { server } from './test/server';
import { stubLayout, unstubLayout } from './test/layout';

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

const TOTAL = 25;

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

/** A Conversation of 25 Messages; the server pages newest first like the real endpoint. */
function openLongConversation() {
  const token = fakeAccessToken();
  const requests: URLSearchParams[] = [];
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
              sequence: 1,
              senderId: bob.id,
              preview: `message ${TOTAL}`,
              createdAt: '2020-03-04T10:00:00Z',
            },
          },
        ],
      }),
    ),
    http.get(`*/api/v1/conversations/${withBob}/messages`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const limit = Number(params.get('limit') ?? 10);
      const before = Number(params.get('before') ?? TOTAL + 1);
      const older = Array.from({ length: before - 1 }, (_, i) => before - 1 - i);
      return HttpResponse.json({
        messages: older.slice(0, limit).map(row),
        hasMore: older.length > limit,
      });
    }),
  );
  return requests;
}

async function openConversation() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Bob.*message 25/i }));
  const viewport = await screen.findByRole('region', { name: /messages/i });
  await screen.findAllByText('message 16');
  return { user, viewport };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
  stubLayout();
});

afterEach(() => {
  unstubLayout();
});

describe('History pagination', () => {
  it('loads the previous page when the user reaches the top, using before=', async () => {
    const requests = openLongConversation();
    const { viewport } = await openConversation();
    expect(screen.queryByText('message 15')).not.toBeInTheDocument();

    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);

    expect(await screen.findByText('message 15')).toBeInTheDocument();
    expect(requests.at(-1)?.get('before')).toBe('16');
    const texts = within(screen.getByRole('log'))
      .getAllByText(/^message \d+$/)
      .map((el) => el.textContent);
    expect(texts[0]).toBe('message 6');
    expect(texts.at(-1)).toBe('message 25');
  });

  it('keeps the Message the user was reading in place when older Messages are prepended', async () => {
    openLongConversation();
    const { viewport } = await openConversation();
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    const itemOf = (text: string) =>
      screen.getByText(text).closest<HTMLElement>('[data-message-id]')!;

    const before = itemOf('message 16').getBoundingClientRect().top;
    await screen.findByText('message 15');

    await waitFor(() => expect(itemOf('message 16').getBoundingClientRect().top).toBe(before));
    expect(viewport.scrollTop).toBeGreaterThan(0);
  });

  it('stops asking for older Messages once the whole history is loaded', async () => {
    const requests = openLongConversation();
    const { viewport } = await openConversation();

    for (const oldest of ['message 15', 'message 5']) {
      viewport.scrollTop = 0;
      fireEvent.scroll(viewport);
      await screen.findByText(oldest);
    }
    expect(requests.at(-1)?.get('before')).toBe('6');
    const asked = requests.length;

    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests).toHaveLength(asked);
  });

  it('jumps to the latest Message with the scroller button', async () => {
    openLongConversation();
    const { user, viewport } = await openConversation();
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    await screen.findByText('message 15');
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    await user.click(await screen.findByRole('button', { name: /jump to latest/i }));

    expect(scrollTo).toHaveBeenCalled();
  });
});
