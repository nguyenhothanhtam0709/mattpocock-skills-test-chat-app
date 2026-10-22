import { render, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { server } from './test/server';

const alice = {
  id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60',
  username: 'Alice',
  email: 'alice@example.com',
  nickname: null,
};

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

function signedInSession() {
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
  );
}

describe('routing', () => {
  it('sends a signed-in User away from /login to the app shell', async () => {
    signedInSession();
    window.history.pushState({}, '', '/login');

    render(<App />);

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('shows the app shell for an unknown path when signed in', async () => {
    signedInSession();
    window.history.pushState({}, '', '/no/such/page');

    render(<App />);

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it('sends a signed-out visitor from an unknown path to /login', async () => {
    window.history.pushState({}, '', '/no/such/page');

    render(<App />);

    expect(await screen.findByLabelText(/username or email/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('replaces the redirecting entry in history, so Back does not loop', async () => {
    window.history.pushState({}, '', '/start');
    window.history.pushState({}, '', '/no/such/page');
    const before = window.history.length;

    render(<App />);
    await screen.findByLabelText(/username or email/i);

    expect(window.history.length).toBe(before);
  });

  it('redirects a signed-in User away from /login without adding a history entry', async () => {
    signedInSession();
    window.history.pushState({}, '', '/start');
    window.history.pushState({}, '', '/login');
    const before = window.history.length;

    render(<App />);
    await screen.findByText(/no conversations yet/i);

    expect(window.location.pathname).toBe('/');
    expect(window.history.length).toBe(before);
  });

  it('renders neither the login form nor the app shell while auth is loading', async () => {
    server.use(
      http.post('*/api/v1/auth/refresh', async () => {
        await delay(150);
        return HttpResponse.json({ accessToken: fakeAccessToken() });
      }),
      http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    );
    window.history.pushState({}, '', '/login');

    render(<App />);

    expect(screen.queryByLabelText(/username or email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no conversations yet/i)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');

    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});
