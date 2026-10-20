import { describe, expect, it } from 'vitest';
import { SearchUsersQuerySchema, SearchUsersResponseSchema } from './user.js';

describe('SearchUsersQuerySchema', () => {
  it.each(['al', 'Ali', 'a_b', '50%', 'a'.repeat(32)])('accepts %j', (q) => {
    expect(SearchUsersQuerySchema.parse({ q }).q).toBe(q);
  });

  it.each([
    ['one character', 'a'],
    ['empty', ''],
    ['33 characters', 'a'.repeat(33)],
    ['a control character', 'a\u0000b'],
  ])('rejects %s', (_name, q) => {
    expect(SearchUsersQuerySchema.safeParse({ q }).success).toBe(false);
  });

  it('rejects a missing q', () => {
    expect(SearchUsersQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('SearchUsersResponseSchema', () => {
  const id = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60';

  it('accepts ID, Username and Nickname only', () => {
    const body = { users: [{ id, username: 'Alice', nickname: null }] };
    expect(SearchUsersResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects a result carrying an email', () => {
    const body = { users: [{ id, username: 'Alice', nickname: null, email: 'a@example.com' }] };
    expect(SearchUsersResponseSchema.safeParse(body).success).toBe(false);
  });
});
