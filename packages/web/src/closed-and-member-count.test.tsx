import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
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

/** What the server says about the Group right now; tests change it between calls. */
interface ServerGroup {
  members: unknown[];
  closed: boolean;
  isMember: boolean;
}

function serverWith(state: ServerGroup) {
  const group = () => ({
    id: groupId,
    kind: 'group' as const,
    name: 'Book Club',
    ownerId: bob.id,
    members: state.members,
    closed: state.closed,
  });
  server.use(
    http.post('*/api/v1/auth/refresh', () => HttpResponse.json({ accessToken: fakeAccessToken() })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ user: alice })),
    http.get('*/api/v1/conversations', () =>
      HttpResponse.json({
        conversations: [{ ...group(), isMember: state.isMember, lastMessage: null }],
      }),
    ),
    http.get(`*/api/v1/conversations/${groupId}`, () =>
      HttpResponse.json({ conversation: group() }),
    ),
    http.get(`*/api/v1/conversations/${groupId}/messages`, () =>
      HttpResponse.json({ messages: [], hasMore: false }),
    ),
  );
}

async function openGroup() {
  const fake = fakeRealtime();
  render(<App createRealtime={() => fake.realtime} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: /Book Club/ }));
  return { user, fake };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('the closed flag', () => {
  it('shows the closed explanation when the server says closed, whatever the Member list holds', async () => {
    serverWith({ members: [bob], closed: true, isMember: false });
    await openGroup();

    expect(await screen.findByText(/this group is closed/i)).toBeInTheDocument();
  });

  it('tells a Former Member of an open Group they are no longer a member, even with no Members listed', async () => {
    serverWith({ members: [], closed: false, isMember: false });
    await openGroup();

    expect(
      await screen.findByText(/you are no longer a member of this group/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/this group is closed/i)).not.toBeInTheDocument();
  });
});

describe('the Member count', () => {
  it('is re-synced from the server on reconnect', async () => {
    const state: ServerGroup = { members: [aliceMember, bob], closed: false, isMember: true };
    serverWith(state);
    const { fake } = await openGroup();
    await screen.findByText('2 members');

    fake.disconnect();
    state.members = [aliceMember, bob, carol];
    act(() => fake.reconnect());

    expect(await screen.findByText('3 members')).toBeInTheDocument();
  });

  it('does not count a Member twice when group.member_added arrives after a reload', async () => {
    const state: ServerGroup = {
      members: [aliceMember, bob, carol],
      closed: false,
      isMember: true,
    };
    serverWith(state);
    const { fake } = await openGroup();
    await screen.findByText('3 members');

    act(() => fake.emit({ type: 'group.member_added', conversationId: groupId, member: carol }));

    await screen.findByRole('textbox', { name: /message/i });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByText('3 members')).toBeInTheDocument();
  });

  it('follows the server when a Member is added', async () => {
    const state: ServerGroup = { members: [aliceMember, bob], closed: false, isMember: true };
    serverWith(state);
    const { fake } = await openGroup();
    await screen.findByText('2 members');

    state.members = [aliceMember, bob, carol];
    act(() => fake.emit({ type: 'group.member_added', conversationId: groupId, member: carol }));

    expect(await screen.findByText('3 members')).toBeInTheDocument();
  });
});

describe('being re-added', () => {
  it('gives a Former Member the composer back when they are added again', async () => {
    const state: ServerGroup = { members: [bob], closed: false, isMember: false };
    serverWith(state);
    const { fake } = await openGroup();
    await screen.findByText(/you are no longer a member of this group/i);

    state.members = [aliceMember, bob];
    state.isMember = true;
    act(() =>
      fake.emit({ type: 'group.member_added', conversationId: groupId, member: aliceMember }),
    );

    expect(await screen.findByRole('textbox', { name: /message/i })).toBeInTheDocument();
    expect(screen.queryByText(/no longer a member/i)).not.toBeInTheDocument();
  });

  it('gives the composer back after leaving and being added again', async () => {
    const state: ServerGroup = { members: [aliceMember, bob], closed: false, isMember: true };
    serverWith(state);
    const { fake } = await openGroup();
    await screen.findByRole('textbox', { name: /message/i });

    state.members = [bob];
    state.isMember = false;
    act(() => fake.emit({ type: 'group.membership_ended', conversationId: groupId }));
    await screen.findByText(/no longer a member of this group/i);
    // Let the list reload that the event triggers finish, so its answer cannot land later.
    await new Promise((resolve) => setTimeout(resolve, 50));

    state.members = [aliceMember, bob];
    state.isMember = true;
    act(() =>
      fake.emit({ type: 'group.member_added', conversationId: groupId, member: aliceMember }),
    );

    expect(await screen.findByRole('textbox', { name: /message/i })).toBeInTheDocument();
  });
});
