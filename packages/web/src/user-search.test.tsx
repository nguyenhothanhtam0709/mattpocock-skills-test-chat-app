import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { server } from './test/server';

const alice = {
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: 'Ali',
};

const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const bonnie = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b62', username: 'bonnie', nickname: null };

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

interface SearchCall {
  q: string | null;
  authorization: string | null;
}

/** Signed in as Alice; `GET /users/search` is recorded and answered by `respond`. */
async function openNewConversation(
  respond: (q: string) => Response | Promise<Response> = () => HttpResponse.json({ users: [] }),
) {
  const token = fakeAccessToken();
  const searches: SearchCall[] = [];
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/users/search', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      searches.push({ q, authorization: request.headers.get('authorization') });
      return respond(q ?? '');
    }),
  );
  render(<App />);
  await screen.findByText(/no conversations yet/i);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /new conversation/i }));
  const dialog = await screen.findByRole('dialog', { name: /new conversation/i });
  return { user, searches, token, dialog };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('new conversation: user search', () => {
  it('asks the server for matches and lists Username and Nickname', async () => {
    const { user, searches, token, dialog } = await openNewConversation(() =>
      HttpResponse.json({ users: [bob, bonnie] }),
    );

    await user.type(within(dialog).getByRole('combobox'), 'bo');

    const options = await within(dialog).findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Bob@bobby', 'bonnie']);
    expect(searches.at(-1)).toEqual({ q: 'bo', authorization: `Bearer ${token}` });
  });

  it('does not filter client-side: shows exactly what the server returned', async () => {
    const { user, dialog } = await openNewConversation(() =>
      HttpResponse.json({ users: [bonnie] }),
    );

    await user.type(within(dialog).getByRole('combobox'), 'zz');

    expect(await within(dialog).findByRole('option', { name: /bonnie/i })).toBeInTheDocument();
  });

  it('prompts to keep typing and does not call the API for fewer than 2 characters', async () => {
    const { user, searches, dialog } = await openNewConversation();

    await user.type(within(dialog).getByRole('combobox'), 'b');

    expect(within(dialog).getByText(/type at least 2 characters/i)).toBeInTheDocument();
    expect(searches).toEqual([]);
  });

  it('shows a loading state while the server answers', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { user, dialog } = await openNewConversation(async () => {
      await gate;
      return HttpResponse.json({ users: [bob] });
    });

    await user.type(within(dialog).getByRole('combobox'), 'bo');

    expect(await within(dialog).findByText(/searching/i)).toBeInTheDocument();
    release();
    expect(await within(dialog).findByRole('option', { name: /bobby/i })).toBeInTheDocument();
    expect(within(dialog).queryByText(/searching/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when nobody matches', async () => {
    const { user, dialog } = await openNewConversation();

    await user.type(within(dialog).getByRole('combobox'), 'nobody');

    expect(await within(dialog).findByText(/no users found/i)).toBeInTheDocument();
  });

  it('shows an error when the search fails, e.g. when rate limited', async () => {
    const { user, dialog } = await openNewConversation(() =>
      HttpResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        { status: 429 },
      ),
    );

    await user.type(within(dialog).getByRole('combobox'), 'bo');

    expect(await within(dialog).findByText(/too many searches/i)).toBeInTheDocument();
  });

  it('only shows results for the latest query', async () => {
    const { user, searches, dialog } = await openNewConversation((q) =>
      HttpResponse.json({ users: q === 'bo' ? [bob] : [bonnie] }),
    );
    const input = within(dialog).getByRole('combobox');

    await user.type(input, 'bo');
    await within(dialog).findByRole('option', { name: /bobby/i });
    await user.type(input, 'n');

    expect(await within(dialog).findByRole('option', { name: /bonnie/i })).toBeInTheDocument();
    await waitFor(() => expect(searches.at(-1)?.q).toBe('bon'));
    expect(within(dialog).queryByRole('option', { name: /bobby/i })).not.toBeInTheDocument();
  });
});
