import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { LoginPage } from '@/auth/LoginPage';
import { SignupPage } from '@/auth/SignupPage';
import { HealthPage } from '@/health/HealthPage';
import { RealtimeProvider, type CreateRealtime } from '@/realtime/RealtimeProvider';
import { noRealtime } from '@/realtime/events';
import { navigate, usePath } from '@/router';
import { AppShell } from '@/shell/AppShell';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * No router library yet. `/signup` and `/health` are public; `/login` is for signed-out
 * Users; everything else is the app shell, which signed-out Users are sent away from.
 */
function Routes() {
  const path = usePath();
  const { state } = useAuth();
  const signedIn = state.status === 'signedIn';
  const signedOut = state.status === 'signedOut';
  const isPublic = path === '/signup' || path === '/health';

  useEffect(() => {
    if (signedOut && !isPublic && path !== '/login') navigate('/login');
    if (signedIn && path === '/login') navigate('/');
  }, [signedIn, signedOut, isPublic, path]);

  if (path === '/signup') return <SignupPage />;
  if (path === '/health') return <HealthPage />;
  if (state.status === 'loading') return null;
  if (state.status === 'signedIn') return path === '/login' ? null : <AppShell user={state.user} />;
  return path === '/login' ? <LoginPage /> : null;
}

const noConnection: CreateRealtime = () => noRealtime;

/** `createRealtime` is how server push is connected; without it nothing is pushed. */
export function App({ createRealtime = noConnection }: { createRealtime?: CreateRealtime }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeProvider create={createRealtime}>
          <Routes />
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
