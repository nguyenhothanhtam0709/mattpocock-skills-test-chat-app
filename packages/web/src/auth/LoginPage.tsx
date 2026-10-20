import { LoginForm } from '@/components/login-form';

export function LoginPage() {
  return (
    <main className="bg-background text-foreground flex min-h-svh items-center justify-center p-4">
      <LoginForm className="w-full max-w-sm" />
    </main>
  );
}
