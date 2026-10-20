import { SearchUsersQuerySchema, type UserSearchResult } from '@chat/contracts';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 200;

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; users: UserSearchResult[] }
  | { status: 'error'; error: string };

/** Results for `query`, fetched from the server (no client-side filtering), latest query wins. */
function useUserSearch(query: string): SearchState {
  const { searchUsers } = useAuth();
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  useEffect(() => {
    if (!SearchUsersQuerySchema.safeParse({ q: query }).success) {
      setState({ status: 'idle' });
      return;
    }
    setState({ status: 'loading' });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchUsers(query, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setState(
          result.ok
            ? { status: 'done', users: result.users }
            : { status: 'error', error: result.error },
        );
      });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchUsers]);

  return state;
}

function NewConversationSearch({ onPick }: { onPick: (user: UserSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const state = useUserSearch(query);
  const users = state.status === 'done' ? state.users : [];

  function onKeyDown(e: KeyboardEvent) {
    if (users.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + users.length) % users.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = users[active];
      if (picked) onPick(picked);
    }
  }

  return (
    <div className="grid gap-2">
      <Input
        role="combobox"
        aria-expanded={users.length > 0}
        aria-controls={listId}
        aria-activedescendant={users.length > 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-label="Username"
        placeholder="Search by Username"
        autoComplete="off"
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <div className="min-h-24 text-sm">
        {state.status === 'idle' && (
          <p className="p-2 text-muted-foreground">Type at least 2 characters to search.</p>
        )}
        {state.status === 'loading' && (
          <p role="status" className="p-2 text-muted-foreground">
            Searching…
          </p>
        )}
        {state.status === 'error' && (
          <p role="alert" className="p-2 text-destructive">
            {state.error}
          </p>
        )}
        {state.status === 'done' && users.length === 0 && (
          <p className="p-2 text-muted-foreground">No users found.</p>
        )}
        <ul id={listId} role="listbox" aria-label="Matching users" className="grid gap-0.5">
          {users.map((u, i) => (
            <li
              key={u.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn(
                'flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5',
                i === active && 'bg-accent text-accent-foreground',
              )}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(u)}
            >
              {u.nickname !== null ? (
                <>
                  <span className="font-medium">{u.nickname}</span>
                  <span className="text-muted-foreground">@{u.username}</span>
                </>
              ) : (
                <span className="font-medium">{u.username}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Pick a User to talk to by typing the start of their Username. Results come from the server.
 * What happens after picking (starting the Direct Conversation) is a later ticket.
 */
export function NewConversationDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (user: UserSearchResult) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>Find a person by the start of their Username.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so closing discards the query. */}
        <NewConversationSearch onPick={onPick} />
      </DialogContent>
    </Dialog>
  );
}
