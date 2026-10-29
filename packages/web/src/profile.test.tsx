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
  nickname: 'Ali' as string | null,
  shareReadReceipts: true,
};

/** A token shaped like the API's; the SPA only reads `exp`. */
function fakeAccessToken(secondsValid = 900) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + secondsValid;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

interface PatchCall {
  authorization: string | null;
  body: unknown;
}

interface PatchBody {
  nickname?: string | null;
  shareReadReceipts?: boolean;
}

/** Signed in as Alice; PATCH /users/me is recorded and answered by `respond`. */
async function openShell(
  nickname: string | null = 'Ali',
  respond: (body: PatchBody) => Response = (body) =>
    HttpResponse.json({ user: { ...alice, ...body } }),
  shareReadReceipts = true,
) {
  const token = fakeAccessToken();
  const patches: PatchCall[] = [];
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: token })),
    http.get('*/api/v1/users/me', () =>
      HttpResponse.json({ user: { ...alice, nickname, shareReadReceipts } }),
    ),
    http.patch('*/api/v1/users/me', async ({ request }) => {
      const body = (await request.json()) as PatchBody;
      patches.push({ authorization: request.headers.get('authorization'), body });
      return respond(body);
    }),
  );
  render(<App />);
  await screen.findByText(/no conversations yet/i);
  const user = userEvent.setup();
  return { user, patches, token };
}

async function openProfile(user: ReturnType<typeof userEvent.setup>, menuName: RegExp) {
  await user.click(screen.getByRole('button', { name: menuName }));
  await user.click(await screen.findByRole('menuitem', { name: /profile/i }));
  return screen.findByRole('dialog', { name: /profile/i });
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('profile', () => {
  it('shows the Username and email, read-only, and the current Nickname', async () => {
    const { user } = await openShell();

    const dialog = await openProfile(user, /ali\b/i);

    expect(within(dialog).getByText('Alice')).toBeInTheDocument();
    expect(within(dialog).getByText('alice@example.com')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/username/i)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/nickname/i)).toHaveValue('Ali');
  });

  it('saves a new Nickname and the User menu reflects it', async () => {
    const { user, patches, token } = await openShell();
    const dialog = await openProfile(user, /ali\b/i);

    const field = within(dialog).getByLabelText(/nickname/i);
    await user.clear(field);
    await user.type(field, '  Allie  ');
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('button', { name: /allie/i })).toBeInTheDocument();
    expect(patches).toEqual([{ authorization: `Bearer ${token}`, body: { nickname: 'Allie' } }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears the Nickname when the field is emptied; the menu falls back to the Username', async () => {
    const { user, patches } = await openShell();
    const dialog = await openProfile(user, /ali\b/i);

    await user.clear(within(dialog).getByLabelText(/nickname/i));
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('button', { name: /^al\s*alice$/i })).toBeInTheDocument();
    expect(patches.map((p) => p.body)).toEqual([{ nickname: null }]);
  });

  it('sets a first Nickname for a User who has none', async () => {
    const { user, patches } = await openShell(null);
    const dialog = await openProfile(user, /alice/i);
    expect(within(dialog).getByLabelText(/nickname/i)).toHaveValue('');

    await user.type(within(dialog).getByLabelText(/nickname/i), 'Ali');
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('button', { name: /ali\b/i })).toBeInTheDocument();
    expect(patches.map((p) => p.body)).toEqual([{ nickname: 'Ali' }]);
  });

  it('shows an inline error for a Nickname over 50 characters without calling the API', async () => {
    const { user, patches } = await openShell();
    const dialog = await openProfile(user, /ali\b/i);

    const field = within(dialog).getByLabelText(/nickname/i);
    await user.clear(field);
    await user.type(field, 'a'.repeat(51));
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await within(dialog).findByText(/1-50 characters/i)).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(patches).toEqual([]);
    expect(screen.getByRole('button', { name: /ali\b/i, hidden: true })).toBeInTheDocument();
  });

  it('shows an inline error when the server answers VALIDATION_FAILED and keeps the old Nickname', async () => {
    const { user } = await openShell('Ali', () =>
      HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed' } },
        { status: 400 },
      ),
    );
    const dialog = await openProfile(user, /ali\b/i);

    const field = within(dialog).getByLabelText(/nickname/i);
    await user.clear(field);
    await user.type(field, 'Bob');
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/nickname/i);
    expect(screen.getByRole('button', { name: /ali\b/i, hidden: true })).toBeInTheDocument();
  });

  it('shows a generic error when the request fails', async () => {
    const { user } = await openShell('Ali', () =>
      HttpResponse.json({ error: { code: 'INTERNAL', message: 'x' } }, { status: 500 }),
    );
    const dialog = await openProfile(user, /ali\b/i);

    await user.type(within(dialog).getByLabelText(/nickname/i), 'x');
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('discards unsaved edits when the dialog is closed', async () => {
    const { user, patches } = await openShell();
    let dialog = await openProfile(user, /ali\b/i);
    await user.type(within(dialog).getByLabelText(/nickname/i), 'zzz');
    await user.click(within(dialog).getByRole('button', { name: /close/i }));

    dialog = await openProfile(user, /ali\b/i);

    expect(within(dialog).getByLabelText(/nickname/i)).toHaveValue('Ali');
    expect(patches).toEqual([]);
  });

  it.each([
    ['on', true],
    ['off', false],
  ])('shows the Share read receipts switch %s when the setting is %s', async (_label, on) => {
    const { user } = await openShell('Ali', undefined, on);

    const dialog = await openProfile(user, /ali\b/i);

    const toggle = within(dialog).getByRole('switch', { name: /share read receipts/i });
    if (on) expect(toggle).toBeChecked();
    else expect(toggle).not.toBeChecked();
  });

  it('saves turning Share read receipts off, keeps the Nickname and remembers the new value', async () => {
    const { user, patches } = await openShell();
    let dialog = await openProfile(user, /ali\b/i);

    await user.click(within(dialog).getByRole('switch', { name: /share read receipts/i }));
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(patches.map((p) => p.body)).toEqual([{ nickname: 'Ali', shareReadReceipts: false }]);
    dialog = await openProfile(user, /ali\b/i);
    expect(within(dialog).getByRole('switch', { name: /share read receipts/i })).not.toBeChecked();
  });

  it('saves turning Share read receipts back on', async () => {
    const { user, patches } = await openShell('Ali', undefined, false);
    const dialog = await openProfile(user, /ali\b/i);

    await user.click(within(dialog).getByRole('switch', { name: /share read receipts/i }));
    await user.click(within(dialog).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(patches.map((p) => p.body)).toEqual([{ nickname: 'Ali', shareReadReceipts: true }]);
  });

  it('discards an unsaved switch change when the dialog is closed', async () => {
    const { user, patches } = await openShell();
    let dialog = await openProfile(user, /ali\b/i);
    await user.click(within(dialog).getByRole('switch', { name: /share read receipts/i }));
    await user.click(within(dialog).getByRole('button', { name: /close/i }));

    dialog = await openProfile(user, /ali\b/i);

    expect(within(dialog).getByRole('switch', { name: /share read receipts/i })).toBeChecked();
    expect(patches).toEqual([]);
  });
});
