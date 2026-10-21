import * as argon2 from 'argon2';

/** The one place the password hashing settings live (registration and the dev seed share it). */
export const hashPassword = (password: string): Promise<string> =>
  argon2.hash(password, { type: argon2.argon2id });
