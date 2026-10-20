/** Injection token for the active `TokenDenyList` adapter. */
export const TOKEN_DENY_LIST = Symbol('TOKEN_DENY_LIST');

/**
 * Access tokens that were revoked before their natural expiry. Adapters (Postgres today,
 * Redis later) must pass the shared contract suite in `token-deny-list.contract.ts`.
 */
export interface TokenDenyList {
  /** Denies `jti` until `expiresAt` (the token's own expiry); adding it again is harmless. */
  add(jti: string, expiresAt: Date): Promise<void>;
  /** True while `jti` is denied; entries past their expiry no longer count. */
  isDenied(jti: string): Promise<boolean>;
  /** Removes entries past their expiry; returns how many were removed. */
  sweepExpired(): Promise<number>;
}
