import type { User } from '@chat/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchCurrentUser,
  login,
  logout,
  msUntilExpiry,
  refreshAccessToken,
  type LoginResult,
} from '@/api/auth';
import { updateNickname, type UpdateNicknameResult } from '@/api/profile';
import { searchUsers, type SearchUsersResult } from '@/api/users';

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: User };

interface AuthContextValue {
  state: AuthState;
  signIn(identifier: string, password: string): Promise<LoginResult>;
  /** Sets (or with `null` clears) the Nickname; on success the signed-in User is updated. */
  setNickname(nickname: string | null): Promise<UpdateNicknameResult>;
  /** Server-side Username-prefix search with the current access token. */
  searchUsers(q: string, signal?: AbortSignal): Promise<SearchUsersResult>;
  /** Ends the session on the server and signs out here. */
  logOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Refresh a minute before expiry; for very short-lived tokens, halfway through. */
function refreshDelay(accessToken: string): number {
  const remaining = msUntilExpiry(accessToken);
  return remaining > 120_000 ? remaining - 60_000 : Math.max(remaining / 2, 0);
}

/**
 * Owns the session. The access token lives only in this component's memory (a ref), is
 * obtained from the refresh cookie on load, and is renewed before it expires. Anything the
 * server refuses signs the User out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const accessTokenRef = useRef<string | undefined>(undefined);

  const signOut = useCallback(() => {
    clearTimeout(timer.current);
    accessTokenRef.current = undefined;
    setState({ status: 'signedOut' });
  }, []);

  const scheduleRefresh = useCallback(
    (accessToken: string) => {
      accessTokenRef.current = accessToken;
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const next = await refreshAccessToken();
        if (next === undefined) signOut();
        else scheduleRefresh(next);
      }, refreshDelay(accessToken));
    },
    [signOut],
  );

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const accessToken = await refreshAccessToken(controller.signal);
      const user = accessToken && (await fetchCurrentUser(accessToken, controller.signal));
      if (controller.signal.aborted) return;
      if (accessToken && user) {
        setState({ status: 'signedIn', user });
        scheduleRefresh(accessToken);
      } else {
        setState({ status: 'signedOut' });
      }
    })();
    return () => {
      controller.abort();
      clearTimeout(timer.current);
    };
  }, [scheduleRefresh]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const result = await login({ identifier, password });
      if (result.ok) {
        setState({ status: 'signedIn', user: result.user });
        scheduleRefresh(result.accessToken);
      }
      return result;
    },
    [scheduleRefresh],
  );

  const setNickname = useCallback(async (nickname: string | null) => {
    const accessToken = accessTokenRef.current;
    if (!accessToken) return { ok: false, error: 'You are signed out. Log in again.' } as const;
    const result = await updateNickname(accessToken, nickname);
    if (result.ok) setState({ status: 'signedIn', user: result.user });
    return result;
  }, []);

  const searchUsersByPrefix = useCallback(async (q: string, signal?: AbortSignal) => {
    const accessToken = accessTokenRef.current;
    if (!accessToken) return { ok: false, error: 'You are signed out. Log in again.' } as const;
    return searchUsers(accessToken, q, signal);
  }, []);

  const logOut = useCallback(async () => {
    const accessToken = accessTokenRef.current;
    signOut();
    if (accessToken) await logout(accessToken);
  }, [signOut]);

  const value = useMemo(
    () => ({ state, signIn, setNickname, searchUsers: searchUsersByPrefix, logOut }),
    [state, signIn, setNickname, searchUsersByPrefix, logOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
