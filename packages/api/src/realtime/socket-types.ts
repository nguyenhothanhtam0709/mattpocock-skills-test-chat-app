import type { IoAdapter } from '@nestjs/platform-socket.io';

// `socket.io` is a dependency of the Nest adapter, not of this package; its types are taken
// from the adapter's signatures rather than adding the package here.
export type IoServer = ReturnType<IoAdapter['createIOServer']>;
export type IoServerOptions = Parameters<IoAdapter['createIOServer']>[1];
export type IoSocket = Parameters<IoAdapter['bindClientDisconnect']>[0];
