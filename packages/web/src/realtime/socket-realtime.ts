import { RealtimeEventSchemas, type RealtimeEventName } from '@chat/contracts';
import { io, type Socket } from 'socket.io-client';
import parser from 'socket.io-msgpack-parser';
import type { RealtimeEvent, RealtimeEvents } from './events';

export interface SocketRealtimeOptions {
  /** Where the Socket.IO server is; the page's origin in the app. */
  url: string;
  /** Read at every (re)connection, because the access token is renewed. */
  getAccessToken: () => string | undefined;
}

/**
 * Socket.IO `RealtimeEvents`: WebSocket transport, MessagePack, authenticated with the access
 * token, reconnecting by itself. Connects with the first subscriber and closes after the last.
 * Each event is validated against the contracts; unknown or invalid ones are dropped and logged.
 */
export function createSocketRealtime({
  url,
  getAccessToken,
}: SocketRealtimeOptions): RealtimeEvents {
  const listeners = new Set<(event: RealtimeEvent) => void>();
  let socket: Socket | undefined;

  function connect(): Socket {
    const next = io(url, {
      parser,
      transports: ['websocket'],
      auth: (cb) => cb({ token: getAccessToken() }),
    });
    next.onAny((name: string, payload: unknown) => {
      if (!(name in RealtimeEventSchemas)) {
        console.warn(`Dropped unknown realtime event "${name}"`);
        return;
      }
      const parsed = RealtimeEventSchemas[name as RealtimeEventName].safeParse(payload);
      if (!parsed.success) {
        console.warn(`Dropped invalid realtime event "${name}"`, parsed.error.issues);
        return;
      }
      const event = { type: name, ...parsed.data } as RealtimeEvent;
      listeners.forEach((listener) => listener(event));
    });
    return next;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      socket ??= connect();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          socket?.close();
          socket = undefined;
        }
      };
    },
  };
}
