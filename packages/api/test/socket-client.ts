import type { AddressInfo } from 'node:net';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { io, type Socket } from 'socket.io-client';
import parser from 'socket.io-msgpack-parser';

/** Starts the app on a random local port and returns its base URL. */
export async function listenOnRandomPort(app: NestFastifyApplication): Promise<string> {
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

export interface TestSocket {
  socket: Socket;
  /** Every event received, in order, as `[name, payload]`. */
  received: Array<[string, unknown]>;
  /** Resolves with the next payload of `event` received after this call (or earlier, unread). */
  next(event: string): Promise<unknown>;
  close(): void;
}

const sockets = new Set<Socket>();

/** Closes every socket opened by `connectSocket` (call from `finally` or `afterEach`). */
export function closeAllSockets(): void {
  for (const socket of sockets) socket.close();
  sockets.clear();
}

/**
 * A real Socket.IO client with the MessagePack parser, WebSocket transport only, as the SPA
 * uses it. Rejects with the server's error message when the handshake is refused.
 */
export function connectSocket(url: string, accessToken: string | undefined): Promise<TestSocket> {
  const socket = io(url, {
    parser,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    auth: accessToken === undefined ? {} : { token: accessToken },
  });
  sockets.add(socket);
  const received: Array<[string, unknown]> = [];
  const waiting = new Map<string, Array<(payload: unknown) => void>>();
  socket.onAny((event: string, payload: unknown) => {
    received.push([event, payload]);
    for (const resolve of waiting.get(event)?.splice(0) ?? []) resolve(payload);
  });
  const handle: TestSocket = {
    socket,
    received,
    next: (event) =>
      new Promise((resolve) => {
        waiting.set(event, [...(waiting.get(event) ?? []), resolve]);
      }),
    close: () => socket.close(),
  };
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(handle));
    socket.once('connect_error', (error) => reject(error));
  });
}
