import { SignupForm } from '@/components/signup-form';

export function SignupPage() {
  return (
    <main className="bg-background text-foreground flex min-h-svh items-center justify-center p-4">
      <SignupForm className="w-full max-w-sm" />
    </main>
  );
}
