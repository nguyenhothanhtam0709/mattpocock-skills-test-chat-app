import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  shareReadReceipts: true,
};

/** A token shaped like the API's; the SPA only reads `exp`. */
function fakeAccessToken(secondsValid = 900) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + secondsValid;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

function errorResponse(status: number, code: string) {
  return HttpResponse.json({ error: { code, message: code } }, { status });
}

function mockLogin(respond: (body: Record<string, unknown>) => Response) {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.post('*/api/v1/auth/login', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return respond(body);
    }),
  );
  return bodies;
}

function mockMe(
  user: typeof alice | (Omit<typeof alice, 'nickname'> & { nickname: null }) = alice,
) {
  const authorizations: (string | null)[] = [];
  server.use(
    http.get('*/api/v1/users/me', ({ request }) => {
      authorizations.push(request.headers.get('authorization'));
      return HttpResponse.json({ user });
    }),
  );
  return authorizations;
}

async function signIn(identifier = 'alice', password = 'correct horse battery') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/username or email/i), identifier);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole('button', { name: /^log ?in$/i }));
  return user;
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('signed-out visitor', () => {
  it('is redirected to the login page', async () => {
    render(<App />);

    expect(await screen.findByLabelText(/username or email/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(screen.queryByText(/no conversations/i)).not.toBeInTheDocument();
  });

  it('offers neither forgot-password nor social login', async () => {
    render(<App />);
    await screen.findByLabelText(/username or email/i);

    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google|github|apple/i)).not.toBeInTheDocument();
  });
});

describe('login', () => {
  it('signs in with a Username or email and lands in the app shell', async () => {
    const bodies = mockLogin(() =>
      HttpResponse.json({ accessToken: fakeAccessToken(), user: alice }),
    );
    mockMe();
    render(<App />);
    await screen.findByLabelText(/username or email/i);

    await signIn('Alice@Example.com');

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(bodies).toEqual([
      { identifier: 'Alice@Example.com', password: 'correct horse battery' },
    ]);
  });

  it('shows the generic error for a wrong password and stays on the login page', async () => {
    mockLogin(() => errorResponse(401, 'INVALID_CREDENTIALS'));
    render(<App />);
    await screen.findByLabelText(/username or email/i);

    await signIn('alice', 'wrong password');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid.*(username|email).*password/i,
    );
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.queryByText(/no conversations/i)).not.toBeInTheDocument();
  });

  it('tells the visitor when too many attempts were made', async () => {
    mockLogin(() => errorResponse(429, 'RATE_LIMITED'));
    render(<App />);
    await screen.findByLabelText(/username or email/i);

    await signIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many/i);
  });
});

describe('session', () => {
  it('keeps the User signed in across a reload by refreshing on load', async () => {
    const authorizations = mockMe();
    const token = fakeAccessToken();
    server.use(http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })));

    render(<App />);

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(authorizations).toEqual([`Bearer ${token}`]);
  });

  it('sends a signed-in User away from the login page', async () => {
    mockMe();
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({ accessToken: fakeAccessToken() }),
      ),
    );
    window.history.pushState({}, '', '/login');

    render(<App />);

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('refreshes silently before the access token expires', async () => {
    let refreshes = 0;
    mockMe();
    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: fakeAccessToken(2) });
      }),
    );

    render(<App />);
    await screen.findByText(/no conversations yet/i);

    await waitFor(() => expect(refreshes).toBeGreaterThanOrEqual(2), { timeout: 4000 });
    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it('returns to the login page when a scheduled refresh is refused', async () => {
    let refreshes = 0;
    mockMe();
    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        refreshes += 1;
        return refreshes === 1
          ? HttpResponse.json({ accessToken: fakeAccessToken(2) })
          : errorResponse(401, 'UNAUTHENTICATED');
      }),
    );

    render(<App />);
    await screen.findByText(/no conversations yet/i);

    expect(
      await screen.findByLabelText(/username or email/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});

describe('app shell', () => {
  async function openShell(
    user: typeof alice | (Omit<typeof alice, 'nickname'> & { nickname: null }) = alice,
  ) {
    mockMe(user);
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({ accessToken: fakeAccessToken() }),
      ),
    );
    render(<App />);
    await screen.findByText(/select a conversation/i);
  }

  it("shows the User's Nickname in the User menu", async () => {
    await openShell();

    expect(screen.getByRole('button', { name: /ali\b/i })).toBeInTheDocument();
  });

  it('falls back to the Username when there is no Nickname', async () => {
    await openShell({ ...alice, nickname: null });

    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument();
  });

  it('switches between light and dark theme from the User menu', async () => {
    await openShell();
    const user = userEvent.setup();
    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: /ali\b/i }));
    await user.click(await screen.findByRole('menuitem', { name: /dark theme/i }));
    expect(document.documentElement).toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: /ali\b/i }));
    await user.click(await screen.findByRole('menuitem', { name: /light theme/i }));
    expect(document.documentElement).not.toHaveClass('dark');
  });

  describe('Log out', () => {
    const logOut = async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /ali\b/i }));
      await user.click(await screen.findByRole('menuitem', { name: /log out/i }));
    };

    it('ends the session on the server and returns to the login page', async () => {
      const authorizations: (string | null)[] = [];
      server.use(
        http.post('*/api/v1/auth/logout', ({ request }) => {
          authorizations.push(request.headers.get('authorization'));
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await openShell();

      await logOut();

      expect(await screen.findByLabelText(/username or email/i)).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
      expect(screen.queryByText(/no conversations/i)).not.toBeInTheDocument();
      expect(authorizations).toHaveLength(1);
      expect(authorizations[0]).toMatch(/^Bearer .+\..+\..+$/);
    });

    it('returns to the login page even when the server cannot be reached', async () => {
      server.use(http.post('*/api/v1/auth/logout', () => HttpResponse.error()));
      await openShell();

      await logOut();

      expect(await screen.findByLabelText(/username or email/i)).toBeInTheDocument();
    });

    it('does not bring the User back on the next load', async () => {
      server.use(http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })));
      await openShell();
      await logOut();
      await screen.findByLabelText(/username or email/i);
      server.use(
        http.post('*/api/v1/auth/refresh', () =>
          HttpResponse.json(
            { error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
            { status: 401 },
          ),
        ),
      );
      window.history.pushState({}, '', '/');

      cleanup();
      render(<App />);

      expect(await screen.findByLabelText(/username or email/i)).toBeInTheDocument();
    });
  });

  it('remembers the chosen theme across reloads', async () => {
    window.localStorage.setItem('theme', 'dark');

    await openShell();

    expect(document.documentElement).toHaveClass('dark');
  });

  it('is a slide-over sheet on mobile', async () => {
    window.innerWidth = 500;
    await openShell();
    const user = userEvent.setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));

    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByText(/no conversations yet/i)).toBeInTheDocument();
    window.innerWidth = 1024;
  });
});
