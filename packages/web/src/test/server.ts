import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * Network-level HTTP mock for the SPA seam; tests add handlers with `server.use(...)`.
 * By default nobody is signed in: the refresh cookie is missing, so refreshing answers 401.
 */
export const server = setupServer(
  http.post('*/api/v1/auth/refresh', () =>
    HttpResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } },
      { status: 401 },
    ),
  ),
);
