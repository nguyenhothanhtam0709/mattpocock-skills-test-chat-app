# Chat

A chat application where users exchange text messages, either one-to-one or within groups.

## Identity

**User**:
A registered person who can sign in and take part in Conversations.
_Avoid_: Account, member (when meaning a user in general), profile

**Username**:
A User's unique, public handle used to identify them to other Users.
_Avoid_: Handle, login

**Nickname**:
An optional, non-unique display name a User may set in addition to their Username.
_Avoid_: Display name, alias

## Conversations

**Conversation**:
A container of Messages exchanged among a fixed or changing set of Users; either a Direct Conversation or a Group.
_Avoid_: Chat, thread, room, channel

**Direct Conversation**:
A Conversation between exactly two distinct Users; at most one exists for any pair.
_Avoid_: DM thread, private chat

**Group**:
A named Conversation whose set of Members can change over time.
_Avoid_: Room, channel, group chat

**Closed Group**:
A Group that has no Members left; it can never receive new Messages or Members, and Former Members can still read their part of its history.
_Avoid_: Archived group, deleted group

**Member**:
A User who currently belongs to a Conversation and may send Messages to it.
_Avoid_: Participant, subscriber

**Owner**:
The single Member of a Group who may add and remove other Members.
_Avoid_: Admin, creator, moderator

**Former Member**:
A User who left or was removed from a Group and can still read the Messages sent while they were a Member.
_Avoid_: Ex-member, removed user

## Messaging

**Message**:
An immutable piece of plain text sent by a Member to exactly one Conversation.
_Avoid_: Post, chat

**System Message**:
A Message the system stores to record a membership change in a Group ("Bob was added", "Bob was removed", "Bob left", and "Bob is now the Owner" when the Owner leaves and ownership passes to Bob); it has a kind and a subject User, and takes a place in the sequence like any Message.
_Avoid_: Notification, event, note (as a stored thing)
