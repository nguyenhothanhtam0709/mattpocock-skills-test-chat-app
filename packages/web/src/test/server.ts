import { setupServer } from 'msw/node';

/** Network-level HTTP mock for the SPA seam; tests add handlers with `server.use(...)`. */
export const server = setupServer();
