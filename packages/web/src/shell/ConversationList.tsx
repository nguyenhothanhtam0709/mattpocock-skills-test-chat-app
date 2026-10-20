import type { ConversationSummary } from '@chat/contracts';
import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

type ListState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; list: ConversationSummary[] };

const SAME_DAY = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const OTHER_DAY = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Time of day for today's activity, the date otherwise. */
function activityLabel(iso: string): string {
  const date = new Date(iso);
  return (date.toDateString() === new Date().toDateString() ? SAME_DAY : OTHER_DAY).format(date);
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading conversations" className="grid gap-2 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-full" />
          <div className="grid flex-1 gap-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The User's Conversations, most recently active first (the server's order). Reloads whenever
 * `refreshKey` changes, e.g. after a Message is sent.
 */
export function ConversationList({
  selectedId,
  refreshKey,
  onSelect,
}: {
  selectedId: string | undefined;
  refreshKey: number;
  onSelect: (conversation: ConversationSummary) => void;
}) {
  const { listConversations } = useAuth();
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await listConversations(controller.signal);
      if (controller.signal.aborted) return;
      setState(
        result.ok
          ? { status: 'ready', list: result.conversations }
          : { status: 'error', error: result.error },
      );
    })();
    return () => controller.abort();
  }, [listConversations, refreshKey]);

  if (state.status === 'loading') return <ListSkeleton />;
  if (state.status === 'error') {
    return (
      <p role="alert" className="p-3 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.list.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquare />
          </EmptyMedia>
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>Messages you send and receive will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <SidebarMenu>
      {state.list.map((conversation) => (
        <SidebarMenuItem key={conversation.id}>
          <SidebarMenuButton
            size="lg"
            isActive={conversation.id === selectedId}
            onClick={() => onSelect(conversation)}
          >
            <Avatar className="size-9">
              <AvatarFallback>{conversation.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{conversation.name}</span>
                <time
                  dateTime={conversation.lastMessage.createdAt}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {activityLabel(conversation.lastMessage.createdAt)}
                </time>
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {conversation.lastMessage.preview}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
