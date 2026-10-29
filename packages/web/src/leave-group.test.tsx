import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const aliceMember = { id: alice.id, username: alice.username, nickname: alice.nickname };
const bob = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b61', username: 'bobby', nickname: 'Bob' };
const carol = { id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b62', username: 'carol', nickname: null };
const groupId = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b80';

function fakeAccessToken() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + 900;
  return `${encode({ alg: 'EdDSA' })}.${encode({ sub: alice.id, exp })}.signature`;
}

const groupOwnedBy = (ownerId: string, members: unknown[]) => ({
  id: groupId,
  kind: 'group' as const,
  name: 'Book Club',
  ownerId,
  members,
  closed: members.length === 0,
});

/** Signed in as Alice with a Group in the list; the server records leaves. */
function signedIn(initial: ReturnType<typeof groupOwnedBy>, isMember = true) {
  let current = initial;
  const left: string[] = [];
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: fakeAccessToken() })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () =>
      HttpResponse.json({
        conversations: [
          {
            ...current,
            isMember:
              isMember && current.members.some((m) => (m as { id: string }).id === alice.id),
            unreadCount: 0,
            lastMessage: null,
          },
        ],
      }),
    ),
    http.get(`*/api/v1/conversations/${groupId}`, () =>
      HttpResponse.json({
        conversation: {
          ...current,
          isMember: isMember && current.members.some((m) => (m as { id: string }).id === alice.id),
        },
      }),
    ),
    http.get(`*/api/v1/conversations/${groupId}/messages`, () =>
      HttpResponse.json({ messages: [], hasMore: false }),
    ),
    http.post(`*/api/v1/groups/${groupId}/leave`, () => {
      left.push(groupId);
      current = {
        ...current,
        members: current.members.filter((m) => (m as { id: string }).id !== alice.id),
        closed: current.members.length === 1,
      };
      return HttpResponse.json({ conversation: current });
    }),
  );
  return { left };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

async function openGroup(fake = fakeRealtime()) {
  render(<App createRealtime={() => fake.realtime} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /Book Club/ }));
  return { user, fake };
}

async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /group details/i }));
  return screen.findByRole('dialog', { name: /book club/i });
}

describe('leaving a Group', () => {
  it('lets a Member leave after confirming, and the view turns read-only', async () => {
    const { left } = signedIn(groupOwnedBy(bob.id, [aliceMember, bob]));
    const { user } = await openGroup();
    const sheet = await openDetails(user);

    await user.click(await within(sheet).findByRole('button', { name: /leave group/i }));
    const confirm = await screen.findByRole('alertdialog');
    expect(left).toEqual([]);
    await user.click(within(confirm).getByRole('button', { name: /^leave$/i }));

    expect(await screen.findByText(/no longer a member of this group/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
    expect(left).toEqual([groupId]);
    expect(within(sheet).queryByRole('button', { name: /leave group/i })).not.toBeInTheDocument();
  });

  it('stays a Member when the confirmation is cancelled', async () => {
    const { left } = signedIn(groupOwnedBy(bob.id, [aliceMember, bob]));
    const { user } = await openGroup();
    const sheet = await openDetails(user);

    await user.click(await within(sheet).findByRole('button', { name: /leave group/i }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: /cancel/i }));

    expect(left).toEqual([]);
    expect(screen.getByRole('textbox', { name: /message/i, hidden: true })).toBeInTheDocument();
  });

  it('shows the Closed Group view when the last Member leaves', async () => {
    signedIn(groupOwnedBy(alice.id, [aliceMember]));
    const { user } = await openGroup();
    const sheet = await openDetails(user);

    await user.click(await within(sheet).findByRole('button', { name: /leave group/i }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: /^leave$/i }));

    expect(await screen.findByText(/this group is closed/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
  });

  it('opens a Closed Group read-only, with no Leave action', async () => {
    signedIn(groupOwnedBy(alice.id, []), false);
    const { user } = await openGroup();

    expect(await screen.findByText(/this group is closed/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
    const sheet = await openDetails(user);
    expect(within(sheet).queryByRole('button', { name: /leave group/i })).not.toBeInTheDocument();
  });
});

describe('Members leaving, seen by the others', () => {
  it('shows "left" inline, keeps the count current and moves the Owner badge', async () => {
    signedIn(groupOwnedBy(bob.id, [aliceMember, bob, carol]));
    const { user, fake } = await openGroup();
    await screen.findByText('3 members');
    const sheet = await openDetails(user);
    await within(sheet).findByText('carol');

    act(() => fake.emit({ type: 'group.member_left', conversationId: groupId, member: bob }));
    act(() =>
      fake.emit({
        type: 'message.created',
        message: {
          id: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e9a01',
          conversationId: groupId,
          senderId: bob.id,
          sequence: 4,
          clientMessageId: '0198a2b4-7c3e-7a52-9f31-5d2f4d1e9a01',
          kind: 'member_left',
          body: '',
          subject: bob,
          createdAt: '2020-03-05T10:00:00.000Z',
        },
      }),
    );
    act(() =>
      fake.emit({ type: 'group.owner_changed', conversationId: groupId, ownerId: carol.id }),
    );

    expect(await screen.findByText('Bob left')).toBeInTheDocument();
    const items = within(sheet).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Alice'),
      expect.stringContaining('carol'),
    ]);
    expect(within(items[1]!).getByText('Owner')).toBeInTheDocument();
    expect(within(items[0]!).queryByText('Owner')).not.toBeInTheDocument();
  });

  it('turns the open view read-only, drops Leave, and reloads the list when group.membership_ended arrives', async () => {
    signedIn(groupOwnedBy(bob.id, [aliceMember, bob]));
    let listLoads = 0;
    let ended = false;
    server.use(
      http.get(`*/api/v1/conversations/${groupId}`, () =>
        HttpResponse.json({
          conversation: {
            ...groupOwnedBy(bob.id, ended ? [bob] : [aliceMember, bob]),
            isMember: !ended,
            closed: false,
          },
        }),
      ),
      http.get('*/api/v1/conversations', () => {
        listLoads += 1;
        const stillMember = listLoads === 1;
        return HttpResponse.json({
          conversations: [
            {
              ...groupOwnedBy(bob.id, stillMember ? [aliceMember, bob] : [bob]),
              isMember: stillMember,
              closed: false,
              unreadCount: 0,
              lastMessage: null,
            },
          ],
        });
      }),
    );
    const { user, fake } = await openGroup();
    const sheet = await openDetails(user);
    await within(sheet).findByRole('button', { name: /leave group/i });

    ended = true;
    act(() => fake.emit({ type: 'group.membership_ended', conversationId: groupId }));

    expect(await screen.findByText(/no longer a member of this group/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: /leave group/i })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(listLoads).toBe(2));
  });

  it('ignores group.membership_ended for another Group', async () => {
    signedIn(groupOwnedBy(bob.id, [aliceMember, bob]));
    const { fake } = await openGroup();
    await screen.findByRole('textbox', { name: /message/i });

    act(() =>
      fake.emit({
        type: 'group.membership_ended',
        conversationId: '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b99',
      }),
    );

    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
    expect(screen.queryByText(/no longer a member of this group/i)).not.toBeInTheDocument();
  });

  it('turns read-only when the Group is closed from another tab', async () => {
    signedIn(groupOwnedBy(alice.id, [aliceMember]));
    let closed = false;
    server.use(
      http.get(`*/api/v1/conversations/${groupId}`, () =>
        HttpResponse.json({
          conversation: {
            ...groupOwnedBy(alice.id, closed ? [] : [aliceMember]),
            isMember: !closed,
          },
        }),
      ),
    );
    const { fake } = await openGroup();
    await screen.findByRole('textbox', { name: /message/i });

    closed = true;
    act(() => fake.emit({ type: 'group.closed', conversationId: groupId }));

    expect(await screen.findByText(/this group is closed/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /message/i })).not.toBeInTheDocument();
  });
});
