import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { fakeRealtime } from './test/fake-realtime';
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

beforeEach(() => {
  window.history.pushState({}, '', '/');
  const token = fakeAccessToken();
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () => HttpResponse.json({ conversations: [] })),
  );
});

describe('session revocation in the SPA', () => {
  it('clears auth state and returns to the login page on session.revoked', async () => {
    const fake = fakeRealtime();
    render(<App createRealtime={() => fake.realtime} />);
    await screen.findByText(/no conversations yet/i);
    await vi.waitFor(() => expect(fake.subscriberCount).toBeGreaterThan(0));

    act(() => fake.emit({ type: 'session.revoked' }));

    expect(await screen.findByRole('button', { name: /log ?in/i })).toBeVisible();
    expect(window.location.pathname).toBe('/login');
  });
});
