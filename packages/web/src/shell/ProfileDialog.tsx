import { UpdateProfileRequestSchema, type User } from '@chat/contracts';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { setNickname } = useAuth();
  const [value, setValue] = useState(user.nickname ?? '');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // An empty (or all-whitespace) field clears the Nickname.
    const trimmed = value.trim();
    const parsed = UpdateProfileRequestSchema.safeParse({
      nickname: trimmed === '' ? null : value,
    });
    if (!parsed.success) {
      setError('Nickname must be 1-50 characters, without control characters.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const result = await setNickname(parsed.data.nickname);
      if (result.ok) onSaved();
      else setError(result.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <dl className="grid gap-1 text-sm">
        <dt className="text-muted-foreground">Username</dt>
        <dd className="font-medium">{user.username}</dd>
        <dt className="mt-2 text-muted-foreground">Email</dt>
        <dd className="font-medium">{user.email}</dd>
      </dl>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
          <Input
            id="nickname"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Optional"
            aria-invalid={error ? true : undefined}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Shows the User's Username and email and lets them set, change or clear their Nickname. */
export function ProfileDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Your Username is permanent. Your Nickname is optional.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so closing discards unsaved edits. */}
        <ProfileForm user={user} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
