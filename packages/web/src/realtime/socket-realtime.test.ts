// @vitest-environment node
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { createServer, type Server as HttpServer } from 'node:http';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeEvent } from './events';
import { server as mswServer } from '../test/server';
import { createSocketRealtime } from './socket-realtime';

// A real Socket.IO server for the client to talk to. `socket.io` is the API's dependency (via
// the approved Nest adapter), not this package's, so it is loaded from there.
const fromApi = createRequire(new URL('../../../api/package.json', import.meta.url));
const nestAdapter = createRequire(fromApi.resolve('@nestjs/platform-socket.io'));
interface TestServer {
  use(fn: (socket: { handshake: { auth: { token?: unknown } } }, next: () => void) => void): void;
  emit(event: string, payload: unknown): void;
  engine: { clientsCount: number };
  sockets: { sockets: Map<string, { conn: { close(): void } }> };
  close(): Promise<void>;
}
const { Server } = nestAdapter('socket.io') as {
  Server: new (http: HttpServer, options: object) => TestServer;
};
const parser = fromApi('socket.io-msgpack-parser');

const id = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60';
const message = {
  id,
  conversationId: id,
  senderId: id,
  sequence: 1,
  clientMessageId: id,
  body: 'hi',
  createdAt: '2030-01-01T00:00:00.000Z',
};

let http: HttpServer;
let io: TestServer;
let url: string;
let tokens: Array<unknown>;

// This test talks to a real local server; MSW would intercept the WebSocket.
beforeAll(() => {
  mswServer.close();
  mswServer.listen({ onUnhandledFrame: 'bypass' });
});

beforeEach(async () => {
  http = createServer();
  io = new Server(http, { transports: ['websocket'], parser });
  tokens = [];
  io.use((socket, next) => {
    tokens.push(socket.handshake.auth.token);
    next();
  });
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await io.close();
  vi.restoreAllMocks();
});

async function connected(realtime = createSocketRealtime({ url, getAccessToken: () => 'tok-1' })) {
  const events: RealtimeEvent[] = [];
  const unsubscribe = realtime.subscribe((event) => events.push(event));
  await vi.waitFor(() => expect(io.engine.clientsCount).toBe(1));
  return { events, unsubscribe };
}

describe('Socket.IO RealtimeEvents', () => {
  it('connects with the access token and delivers decoded, validated events', async () => {
    const { events, unsubscribe } = await connected();

    io.emit('message.created', { message });

    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toEqual({ type: 'message.created', message });
    expect(tokens).toEqual(['tok-1']);
    unsubscribe();
  });

  it('drops and logs invalid and unknown events', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { events, unsubscribe } = await connected();

    io.emit('message.created', { message: { ...message, sequence: 0 } });
    io.emit('conversation.created', { nonsense: true });
    io.emit('something.else', {});
    io.emit('message.created', { message });

    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({ type: 'message.created', message });
    expect(warn).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('reconnects after the connection drops, with the then-current access token', async () => {
    let token = 'tok-1';
    const { events, unsubscribe } = await connected(
      createSocketRealtime({ url, getAccessToken: () => token }),
    );
    token = 'tok-2';

    // Drops the transport (not a server-side disconnect, which clients do not retry).
    io.sockets.sockets.forEach((socket) => socket.conn.close());
    await vi.waitFor(() => expect(tokens).toEqual(['tok-1', 'tok-2']), { timeout: 10_000 });
    await vi.waitFor(() => expect(io.engine.clientsCount).toBe(1));
    io.emit('message.created', { message });

    await vi.waitFor(() => expect(events).toHaveLength(1));
    unsubscribe();
  }, 15_000);

  it('closes the connection when the last listener unsubscribes', async () => {
    const { unsubscribe } = await connected();

    unsubscribe();

    await vi.waitFor(() => expect(io.engine.clientsCount).toBe(0));
  });
});
