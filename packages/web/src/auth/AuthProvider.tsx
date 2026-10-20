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
  msUntilExpiry,
  refreshAccessToken,
  type LoginResult,
} from '@/api/auth';

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: User };

interface AuthContextValue {
  state: AuthState;
  signIn(identifier: string, password: string): Promise<LoginResult>;
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

  const signOut = useCallback(() => {
    clearTimeout(timer.current);
    setState({ status: 'signedOut' });
  }, []);

  const scheduleRefresh = useCallback(
    (accessToken: string) => {
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

  const value = useMemo(() => ({ state, signIn }), [state, signIn]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
