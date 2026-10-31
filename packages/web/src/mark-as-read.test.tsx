import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const summary = (preview: string, unreadCount: number) => ({
  id: withBob,
  kind: 'direct' as const,
  name: 'Bob',
  members: [aliceMember, bob],
  isMember: true,
  closed: false,
  unreadCount,
  lastMessage: { senderId: bob.id, preview, createdAt: '2020-03-04T10:00:00Z' },
});

let nextSequence = 1;
const message = (senderId: string = bob.id) => {
  const sequence = nextSequence++;
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

/**
 * Signed in as Alice. The list answers with whatever `list` holds at the time (and counts its
 * fetches), Bob's history with `history`, and every mark-read is recorded and answered.
 */
function signedIn(
  list: { current: unknown[] },
  history: ReturnType<typeof message>[] = [],
  /** Answers each mark-read; the default accepts it. */
  answer: (upToSequence: number) => Response = (upToSequence) =>
    HttpResponse.json({ upToSequence }),
) {
  const token = fakeAccessToken();
  const marked: number[] = [];
  const fetches = { count: 0 };
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () => {
      fetches.count += 1;
      return HttpResponse.json({ conversations: list.current });
    }),
    http.get(`*/api/v1/conversations/${withBob}/messages`, () =>
      HttpResponse.json({ messages: [...history].reverse(), hasMore: false }),
    ),
    http.put(`*/api/v1/conversations/${withBob}/read`, async ({ request }) => {
      const { upToSequence } = (await request.json()) as { upToSequence: number };
      marked.push(upToSequence);
      return answer(upToSequence);
    }),
  );
  return { marked, fetches };
}

const row = (name: RegExp) => screen.findByRole('button', { name });

/** Hides or shows the tab the way the browser does: the visibility state, then the event. */
function setTabVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (visible ? 'visible' : 'hidden'),
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Opens the Conversation with Bob and waits for its newest Message; returns the viewport. */
async function openBob(lastBody: string) {
  await userEvent.setup().click(await row(/Bob/));
  const viewport = await screen.findByRole('region', { name: /messages/i });
  await within(viewport).findByText(lastBody);
  return viewport;
}

/** Long enough for a debounced mark-read to have gone out, had it been due. */
const pastDebounce = () => new Promise((resolve) => setTimeout(resolve, 600));

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('Marking a Conversation as read', () => {
  it('sends the highest sequence on screen once the open Conversation is at its latest Message in a visible tab', async () => {
    const history = [message(), message(), message()];
    const { marked } = signedIn({ current: [summary('message 3', 3)] }, history);
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    await openBob('message 3');

    await waitFor(() => expect(marked).toEqual([history[2]!.sequence]));
  });

  it('sends nothing while the tab is hidden, and marks what arrived meanwhile once it is visible again', async () => {
    const history = [message()];
    const { marked } = signedIn({ current: [summary('message', 1)] }, history);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    act(() => setTabVisible(false));
    await openBob(history[0]!.body);

    const arrived = message();
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    await screen.findAllByText(arrived.body);
    await pastDebounce();
    expect(marked).toEqual([]);

    act(() => setTabVisible(true));

    await waitFor(() => expect(marked).toEqual([arrived.sequence]));
  });

  it('marks each Message that arrives while the User is at the latest Message', async () => {
    const history = [message()];
    const { marked } = signedIn({ current: [summary('message', 0)] }, history);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await openBob(history[0]!.body);
    await waitFor(() => expect(marked).toEqual([history[0]!.sequence]));

    const arrived = message();
    act(() => fake.emit({ type: 'message.created', message: arrived }));

    await waitFor(() => expect(marked).toEqual([history[0]!.sequence, arrived.sequence]));
  });

  it('sends nothing while scrolled up, and marks the latest Message after jumping to it', async () => {
    stubLayout();
    try {
      const history = Array.from({ length: 6 }, () => message());
      const { marked } = signedIn({ current: [summary('message', 6)] }, history);
      render(<App createRealtime={() => fakeRealtime().realtime} />);
      const viewport = await openBob(history[5]!.body);

      // Scrolled up before the debounced mark-read went out: it is called off.
      viewport.scrollTop = 0;
      fireEvent.scroll(viewport);
      const jump = screen.getByRole('button', { name: /jump to latest/i });
      await waitFor(() => expect(jump).toHaveAttribute('data-active', 'true'));
      await pastDebounce();
      expect(marked).toEqual([]);

      await userEvent.setup().click(jump);

      await waitFor(() => expect(marked).toEqual([history[5]!.sequence]));
    } finally {
      unstubLayout();
    }
  });
});

describe('Marking read when things go wrong or do not apply', () => {
  it('retries a mark-read that failed with a server error', async () => {
    const history = [message()];
    let calls = 0;
    const { marked } = signedIn({ current: [summary('message', 1)] }, history, (upToSequence) =>
      ++calls === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json({ upToSequence }),
    );
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    await openBob(history[0]!.body);

    await waitFor(() => expect(marked).toHaveLength(2), { timeout: 4000 });
    expect(marked).toEqual([history[0]!.sequence, history[0]!.sequence]);
  });

  it('retries a failed mark-read once the connection is back', async () => {
    const history = [message()];
    let failing = true;
    const { marked } = signedIn({ current: [summary('message', 1)] }, history, (upToSequence) =>
      failing ? new HttpResponse(null, { status: 429 }) : HttpResponse.json({ upToSequence }),
    );
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await openBob(history[0]!.body);
    await waitFor(() => expect(marked).toHaveLength(1));

    failing = false;
    act(() => fake.disconnect());
    act(() => fake.reconnect());

    await waitFor(() => expect(marked).toHaveLength(2));
  });

  it('does not retry a mark-read the server refused', async () => {
    const history = [message()];
    const { marked } = signedIn({ current: [summary('message', 1)] }, history, () =>
      HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
    );
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    await openBob(history[0]!.body);
    await waitFor(() => expect(marked).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(marked).toHaveLength(1);
  });

  it('stays unread when a Message arrives while the User reads older history', async () => {
    stubLayout();
    try {
      const history = Array.from({ length: 6 }, () => message());
      const { marked } = signedIn({ current: [summary('message', 6)] }, history);
      const fake = fakeRealtime();
      render(<App createRealtime={() => fake.realtime} />);
      const viewport = await openBob(history[5]!.body);
      await waitFor(() => expect(marked).toEqual([history[5]!.sequence]));
      viewport.scrollTop = 0;
      fireEvent.scroll(viewport);
      const jump = screen.getByRole('button', { name: /jump to latest/i });
      await waitFor(() => expect(jump).toHaveAttribute('data-active', 'true'));

      const arrived = message();
      act(() => fake.emit({ type: 'message.created', message: arrived }));
      await within(viewport).findByText(arrived.body);
      await pastDebounce();

      expect(viewport.scrollTop).toBe(0);
      expect(marked).toEqual([history[5]!.sequence]);
    } finally {
      unstubLayout();
    }
  });

  it('sends nothing for a Group the User is no longer a Member of', async () => {
    const group = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b90';
    const token = fakeAccessToken();
    const marked: number[] = [];
    const sent = message();
    sent.conversationId = group;
    server.use(
      http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
      http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
      http.get('*/api/v1/conversations', () =>
        HttpResponse.json({
          conversations: [
            {
              id: group,
              kind: 'group',
              name: 'Old crew',
              members: [],
              isMember: false,
              closed: false,
              unreadCount: 0,
              lastMessage: {
                senderId: bob.id,
                preview: 'message',
                createdAt: '2020-03-04T10:00:00Z',
              },
            },
          ],
        }),
      ),
      http.get(`*/api/v1/conversations/${group}/messages`, () =>
        HttpResponse.json({ messages: [sent], hasMore: false }),
      ),
      http.put(`*/api/v1/conversations/${group}/read`, async ({ request }) => {
        const { upToSequence } = (await request.json()) as { upToSequence: number };
        marked.push(upToSequence);
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      }),
    );
    render(<App createRealtime={() => fakeRealtime().realtime} />);

    await userEvent.setup().click(await row(/Old crew/));
    const viewport = await screen.findByRole('region', { name: /messages/i });
    await within(viewport).findByText(sent.body);
    await pastDebounce();

    expect(marked).toEqual([]);
  });
});

describe('conversation.read from another tab or device', () => {
  it('clears the badge when it covers the newest Message this tab knows of', async () => {
    const { fetches } = signedIn({ current: [summary('message', 2)] });
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/2 unread/);
    const arrived = message();
    act(() => fake.emit({ type: 'message.created', message: arrived }));
    await row(/3 unread/);
    const fetched = fetches.count;

    act(() =>
      fake.emit({
        type: 'conversation.read',
        conversationId: withBob,
        upToSequence: arrived.sequence,
      }),
    );

    await waitFor(async () => expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/));
    expect(fetches.count).toBe(fetched);
  });

  it('takes the count from the server when it does not cover the newest Message this tab knows of', async () => {
    const list = { current: [summary('message', 2)] };
    signedIn(list);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/2 unread/);
    const first = message();
    const second = message();
    act(() => fake.emit({ type: 'message.created', message: first }));
    act(() => fake.emit({ type: 'message.created', message: second }));
    await row(/4 unread/);
    // Another tab read up to the first of them.
    list.current = [summary('message', 1)];

    act(() =>
      fake.emit({
        type: 'conversation.read',
        conversationId: withBob,
        upToSequence: first.sequence,
      }),
    );

    expect(await row(/1 unread/)).toBeInTheDocument();
  });

  it('takes the count from the server when this tab knows no newer Message than the list it loaded', async () => {
    const list = { current: [summary('message', 3)] };
    signedIn(list);
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await row(/3 unread/);
    list.current = [summary('message', 0)];

    act(() => fake.emit({ type: 'conversation.read', conversationId: withBob, upToSequence: 1 }));

    await waitFor(async () => expect(await row(/Bob/)).not.toHaveAccessibleName(/unread/));
  });
});
