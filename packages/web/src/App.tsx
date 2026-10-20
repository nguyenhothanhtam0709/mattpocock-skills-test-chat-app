import { SignupPage } from '@/auth/SignupPage';
import { HealthPage } from '@/health/HealthPage';

/** No router yet: the signup page lives at /signup, everything else shows service status. */
export function App() {
  return window.location.pathname === '/signup' ? <SignupPage /> : <HealthPage />;
}
