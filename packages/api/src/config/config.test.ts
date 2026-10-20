import { describe, expect, it } from 'vitest';
import { testJwtKeys } from '../../test/keys.js';
import { createApp } from '../app.js';

const validConfig = { DATABASE_URL: 'postgres://chat:chat@127.0.0.1:1/chat', ...testJwtKeys };

describe('configuration', () => {
  it('refuses to boot when a required value is missing, naming the value', async () => {
    await expect(createApp({})).rejects.toThrow(/DATABASE_URL/);
  });

  it('refuses to boot when a value is invalid, naming the value', async () => {
    await expect(createApp({ ...validConfig, PORT: 'not-a-port' })).rejects.toThrow(/PORT/);
  });

  it('refuses to boot without a valid Ed25519 key pair, naming the value', async () => {
    await expect(createApp({ ...validConfig, JWT_PRIVATE_KEY: 'not a key' })).rejects.toThrow(
      /JWT_PRIVATE_KEY/,
    );
    await expect(createApp({ ...validConfig, JWT_PUBLIC_KEY: undefined })).rejects.toThrow(
      /JWT_PUBLIC_KEY/,
    );
  });

  it('refuses to boot when the SPA origin is not a URL origin', async () => {
    await expect(createApp({ ...validConfig, SPA_ORIGIN: 'nope' })).rejects.toThrow(/SPA_ORIGIN/);
  });

  it('refuses to boot when file logging is enabled without a valid frequency', async () => {
    await expect(
      createApp({ ...validConfig, LOG_FILE_ENABLED: 'true', LOG_FILE_FREQUENCY: 'weekly-ish' }),
    ).rejects.toThrow(/LOG_FILE_FREQUENCY/);
  });
});
