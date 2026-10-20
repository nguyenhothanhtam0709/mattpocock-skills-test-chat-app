import { beforeEach, inject } from 'vitest';
import { truncateAllTables } from './database.js';

beforeEach(async () => {
  await truncateAllTables(inject('databaseUrl'));
});
