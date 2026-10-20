import type { ConversationCreatedEvent, MessageCreatedEvent } from '@chat/contracts';

/** An already-decoded, contracts-validated server push. */
export type RealtimeEvent =
  | ({ type: 'message.created' } & MessageCreatedEvent)
  | ({ type: 'conversation.created' } & ConversationCreatedEvent);

/**
 * Server-push events. The socket is receive-only (ADR-0001): everything the User does goes
 * over HTTP.
 */
export interface RealtimeEvents {
  /** Starts delivering events to `listener`; the returned function stops it. */
  subscribe(listener: (event: RealtimeEvent) => void): () => void;
}

/** Delivers nothing; used where no connection is wanted (e.g. tests that do not need one). */
export const noRealtime: RealtimeEvents = { subscribe: () => () => {} };
