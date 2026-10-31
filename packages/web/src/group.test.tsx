import { render, screen, within } from '@testing-library/react';
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
  shareReadReceipts: true,
};
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const carol = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b62', username: 'carol', nickname: null };
const groupId = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b80';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const group = {
  id: groupId,
  kind: 'group' as const,
  name: 'Book Club',
  ownerId: alice.id,
  members: [aliceMember, bob, carol],
  closed: false,
};

/** Signed in as Alice with the server recording what is created and sent. */
function signedIn() {
  const created: unknown[] = [];
  const sent: Array<{ url: string; body: { clientMessageId: string; body: string } }> = [];
  let listed: unknown[] = [];
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: fakeAccessToken() })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () => HttpResponse.json({ conversations: listed })),
    http.get('*/api/v1/users/search', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      return HttpResponse.json({ users: q === 'bo' ? [bob] : [carol] });
    }),
    http.post('*/api/v1/groups', async ({ request }) => {
      created.push(await request.json());
      listed = [{ ...group, isMember: true, unreadCount: 0, lastMessage: null }];
      return HttpResponse.json({ conversation: group }, { status: 201 });
    }),
    http.get(`*/api/v1/conversations/${groupId}/messages`, () =>
      HttpResponse.json({ messages: [], hasMore: false }),
    ),
    http.post(`*/api/v1/conversations/${groupId}/messages`, async ({ request }) => {
      const body = (await request.json()) as { clientMessageId: string; body: string };
      sent.push({ url: new URL(request.url).pathname, body });
      return HttpResponse.json(
        {
          message: {
            id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8c01',
            conversationId: groupId,
            senderId: alice.id,
            sequence: 1,
            clientMessageId: body.clientMessageId,
            body: body.body,
            createdAt: '2026-10-20T09:30:00.000Z',
          },
        },
        { status: 201 },
      );
    }),
  );
  return { created, sent };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

async function openNewGroupDialog() {
  render(<App />);
  await screen.findByText(/no conversations yet/i);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /new group/i }));
  const dialog = await screen.findByRole('dialog', { name: /new group/i });
  return { user, dialog };
}

describe('creating a Group', () => {
  it('creates a Group from a name and picked Members, then opens it and sends a Message', async () => {
    const { created, sent } = signedIn();
    const { user, dialog } = await openNewGroupDialog();

    await user.type(within(dialog).getByRole('textbox', { name: /group name/i }), '  Book Club ');
    await user.type(within(dialog).getByRole('combobox'), 'bo');
    await user.click(await within(dialog).findByRole('option', { name: /bobby/i }));
    await user.clear(within(dialog).getByRole('combobox'));
    await user.type(within(dialog).getByRole('combobox'), 'ca');
    await user.click(await within(dialog).findByRole('option', { name: /carol/i }));
    expect(within(dialog).getByText('Bob')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /create group/i }));

    expect(await screen.findByRole('heading', { name: 'Book Club' })).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(created).toEqual([{ name: 'Book Club', memberIds: [bob.id, carol.id] }]);
    expect(await screen.findByRole('button', { name: /Book Club/ })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /message/i }), 'welcome all{Enter}');

    expect(await screen.findByText('welcome all')).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      url: `/api/v1/conversations/${groupId}/messages`,
      body: { body: 'welcome all' },
    });
  });

  it('removes a chosen Member when its badge is dismissed', async () => {
    const { created } = signedIn();
    const { user, dialog } = await openNewGroupDialog();
    await user.type(within(dialog).getByRole('textbox', { name: /group name/i }), 'Book Club');
    await user.type(within(dialog).getByRole('combobox'), 'bo');
    await user.click(await within(dialog).findByRole('option', { name: /bobby/i }));

    await user.click(within(dialog).getByRole('button', { name: /remove bob/i }));
    await user.click(within(dialog).getByRole('button', { name: /create group/i }));

    await screen.findByRole('heading', { name: 'Book Club' });
    expect(created).toEqual([{ name: 'Book Club', memberIds: [] }]);
  });

  it('will not create a Group with a blank name', async () => {
    const { created } = signedIn();
    const { user, dialog } = await openNewGroupDialog();

    await user.type(within(dialog).getByRole('textbox', { name: /group name/i }), '   ');

    expect(within(dialog).getByRole('button', { name: /create group/i })).toBeDisabled();
    expect(created).toEqual([]);
  });
});

describe('a Group in the sidebar', () => {
  it('shows a Group without Messages by name and opens it with its Member count', async () => {
    signedIn();
    server.use(
      http.get('*/api/v1/conversations', () =>
        HttpResponse.json({
          conversations: [
            { ...group, isMember: true, closed: false, unreadCount: 0, lastMessage: null },
          ],
        }),
      ),
      http.get(`*/api/v1/conversations/${groupId}/messages`, () =>
        HttpResponse.json({ messages: [], hasMore: false }),
      ),
    );
    render(<App />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Book Club/ }));

    expect(await screen.findByRole('heading', { name: 'Book Club' })).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });
});
