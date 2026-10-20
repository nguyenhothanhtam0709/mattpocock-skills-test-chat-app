import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { server } from './test/server';

describe('health page', () => {
  it('shows the API as healthy when the health endpoint reports ok', async () => {
    server.use(
      http.get('*/api/v1/health', () => HttpResponse.json({ status: 'ok', database: 'up' })),
    );

    render(<App />);

    expect(await screen.findByText('API healthy')).toBeInTheDocument();
  });

  it('shows the API as unavailable when the health endpoint reports an error', async () => {
    server.use(
      http.get('*/api/v1/health', () =>
        HttpResponse.json({ status: 'error', database: 'down' }, { status: 503 }),
      ),
    );

    render(<App />);

    expect(await screen.findByText('API unavailable')).toBeInTheDocument();
  });

  it('shows the API as unavailable when the request fails', async () => {
    server.use(http.get('*/api/v1/health', () => HttpResponse.error()));

    render(<App />);

    expect(await screen.findByText('API unavailable')).toBeInTheDocument();
  });
});
