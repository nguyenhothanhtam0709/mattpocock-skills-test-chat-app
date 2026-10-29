import type { ConversationSummary } from '@chat/contracts';
import { LAST_MESSAGE_PREVIEW_MAX, UNREAD_COUNT_MAX } from '@chat/contracts';
import { MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useReconnected, useRealtimeEvents } from '@/realtime/RealtimeProvider';
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

/** Whitespace collapsed, at most 100 characters: the same preview the server builds. */
const previewOf = (body: string): string =>
  [...body.trim().replace(/\s+/g, ' ')].slice(0, LAST_MESSAGE_PREVIEW_MAX).join('');

/** The Unread Count as the badge shows it; the server stops counting at the cap. */
const unreadLabel = (count: number): string =>
  count >= UNREAD_COUNT_MAX ? `${UNREAD_COUNT_MAX - 1}+` : String(count);

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
  userId,
  selectedId,
  readingId,
  refreshKey,
  onLoaded,
  onSelect,
}: {
  userId: string;
  selectedId: string | undefined;
  /**
   * The Conversation the User is reading right now: open, in a visible tab, at its latest
   * Message. New Messages there are seen as they arrive, so they add nothing to its count.
   */
  readingId: string | undefined;
  refreshKey: number;
  /** Called with every list the server returns (first load, reloads, reconnects). */
  onLoaded?: (list: ConversationSummary[]) => void;
  onSelect: (conversation: ConversationSummary) => void;
}) {
  const { listConversations } = useAuth();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [pushedReloads, setPushedReloads] = useState(0);
  // The newest sequence pushed since the list was last loaded, per Conversation: what a
  // `conversation.read` must cover to clear the count without asking the server.
  const newestPushed = useRef(new Map<string, number>());
  const onLoadedRef = useRef(onLoaded);
  useLayoutEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await listConversations(controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) {
        newestPushed.current.clear();
        onLoadedRef.current?.(result.conversations);
      }
      setState(
        result.ok
          ? { status: 'ready', list: result.conversations }
          : { status: 'error', error: result.error },
      );
    })();
    return () => controller.abort();
  }, [listConversations, refreshKey, pushedReloads]);

  useReconnected(() => setPushedReloads((n) => n + 1));

  const listed = state.status === 'ready' ? state.list : undefined;
  useRealtimeEvents(
    useCallback(
      (event) => {
        // Until the first load finishes, the fetch itself will include whatever was pushed.
        if (!listed) return;
        if (event.type === 'conversation.created') {
          const { conversation } = event;
          // An ID already listed is replaced (a re-added Former Member's entry is stale).
          setState({
            status: 'ready',
            list: [conversation, ...listed.filter((c) => c.id !== conversation.id)],
          });
          return;
        }
        if (event.type === 'group.closed' || event.type === 'group.membership_ended') {
          // Both flip the entry to read-only; the server knows the rest.
          setPushedReloads((n) => n + 1);
          return;
        }
        if (event.type === 'conversation.read') {
          // The User read on another tab or device (or this one). The event carries a
          // position, not a count: only one that covers everything known here clears it.
          const known = listed.find((c) => c.id === event.conversationId);
          if (!known || known.unreadCount === 0) return;
          const newest = newestPushed.current.get(event.conversationId);
          if (newest === undefined || event.upToSequence < newest) {
            setPushedReloads((n) => n + 1);
            return;
          }
          setState({
            status: 'ready',
            list: listed.map((c) => (c === known ? { ...c, unreadCount: 0 } : c)),
          });
          return;
        }
        if (event.type !== 'message.created') return;
        const { message } = event;
        newestPushed.current.set(
          message.conversationId,
          Math.max(newestPushed.current.get(message.conversationId) ?? 0, message.sequence),
        );
        // Membership notes do not touch the preview or the order (spec: only Messages do).
        if (message.kind !== 'text') return;
        const known = listed.find((c) => c.id === message.conversationId);
        if (!known) {
          // Not listed (e.g. the sender's other tab started it): the server knows the rest.
          setPushedReloads((n) => n + 1);
          return;
        }
        const unread =
          message.senderId !== userId && message.conversationId !== readingId
            ? Math.min(known.unreadCount + 1, UNREAD_COUNT_MAX)
            : known.unreadCount;
        const updated = {
          ...known,
          unreadCount: unread,
          lastMessage: {
            senderId: message.senderId,
            preview: previewOf(message.body),
            createdAt: message.createdAt,
          },
        };
        setState({ status: 'ready', list: [updated, ...listed.filter((c) => c !== known)] });
      },
      [listed, userId, readingId],
    ),
  );

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
                <span
                  className={
                    conversation.unreadCount > 0 ? 'truncate font-semibold' : 'truncate font-medium'
                  }
                >
                  {conversation.name}
                </span>
                {conversation.lastMessage && (
                  <time
                    dateTime={conversation.lastMessage.createdAt}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {activityLabel(conversation.lastMessage.createdAt)}
                  </time>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    conversation.unreadCount > 0
                      ? 'truncate text-xs font-medium text-foreground'
                      : 'truncate text-xs text-muted-foreground'
                  }
                >
                  {conversation.lastMessage?.preview ?? 'No messages yet'}
                </span>
                {conversation.unreadCount > 0 && (
                  <Badge className="h-4 min-w-4 px-1 tabular-nums">
                    <span aria-hidden>{unreadLabel(conversation.unreadCount)}</span>
                    <span className="sr-only">{` ${unreadLabel(conversation.unreadCount)} unread`}</span>
                  </Badge>
                )}
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
