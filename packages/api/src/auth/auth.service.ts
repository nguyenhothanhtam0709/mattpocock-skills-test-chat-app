import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ErrorCode, type RegisterResponse } from '@chat/contracts';
import * as argon2 from 'argon2';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { DomainException } from '../common/all-exceptions.filter.js';
import { PG_POOL } from '../db/database.module.js';
import { users } from '../db/schema.js';

export interface NewUser {
  username: string;
  email: string;
  password: string;
  nickname?: string | undefined;
}

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  private readonly db: NodePgDatabase;

  constructor(@Inject(PG_POOL) pool: Pool) {
    this.db = drizzle(pool);
  }

  async register(input: NewUser): Promise<RegisterResponse> {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      const [row] = await this.db
        .insert(users)
        .values({
          id: uuidv7(),
          username: input.username,
          email: input.email,
          passwordHash,
          nickname: input.nickname ?? null,
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          nickname: users.nickname,
        });
      return { user: row! };
    } catch (error) {
      throw translateUniqueViolation(error) ?? error;
    }
  }
}

/**
 * Uniqueness is decided by the database constraints (race-free); the violated constraint
 * tells which field was taken. Only the constraint name is used, never pg's `detail`
 * (which contains the offending value).
 */
function translateUniqueViolation(error: unknown): DomainException | undefined {
  const { code, constraint } = (error as { code?: string; constraint?: string } | null) ?? {};
  const cause = (error as { cause?: unknown } | null)?.cause;
  if (code !== UNIQUE_VIOLATION && cause) return translateUniqueViolation(cause);
  if (code !== UNIQUE_VIOLATION) return undefined;
  if (constraint === 'users_username_lower_unique') {
    return new DomainException(
      ErrorCode.USERNAME_TAKEN,
      HttpStatus.CONFLICT,
      'Username is already taken',
    );
  }
  if (constraint === 'users_email_lower_unique') {
    return new DomainException(
      ErrorCode.EMAIL_TAKEN,
      HttpStatus.CONFLICT,
      'Email is already registered',
    );
  }
  return undefined;
}
