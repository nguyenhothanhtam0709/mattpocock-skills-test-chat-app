import type { ConversationMember, UserSearchResult } from '@chat/contracts';

/** What a view is showing: a Direct Conversation with a peer, or an existing Group. */
export type ConversationTarget =
  | { kind: 'direct'; peer: UserSearchResult }
  /** `isMember` is false for a Former Member, who can read their windows but not post. */
  | { kind: 'group'; name: string; memberCount: number; closed: boolean; isMember: boolean };

/** The name to show for a person: their nickname, else their username. */
export const displayName = (user: { nickname: string | null; username: string }): string =>
  user.nickname ?? user.username;

/** The Group target for anything that names a Group and lists its current Members. */
export const groupTarget = (
  group: { name: string; members: ConversationMember[]; closed: boolean },
  isMember: boolean,
): Extract<ConversationTarget, { kind: 'group' }> => ({
  kind: 'group',
  name: group.name,
  memberCount: group.members.length,
  closed: group.closed,
  isMember,
});
