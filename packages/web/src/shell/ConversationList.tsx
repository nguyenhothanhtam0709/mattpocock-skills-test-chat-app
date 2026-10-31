import type { ConversationSummary, Message } from '@chat/contracts';
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

/**
 * How long the open Conversation gets to confirm a mark-read (its 300ms debounce, the request and
 * the push back) before the list asks the server: the request may have failed.
 */
const MARK_READ_GRACE_MS = 5000;

interface PushedMessage {
  message: Message;
  /** Whether the Conversation was being read when it arrived, so it adds nothing to the count. */
  reading: boolean;
}

interface AwaitedRead {
  conversationId: string;
  sequence: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Whether an entry fresh from the server (a list response, `conversation.created`) already counts
 * a pushed Message: it is the entry's last Message ('same'), or older than it ('older', with more
 * of what the entry reflects still to come). The summary carries no sequence, so this goes by the
 * last Message's content and time. Times are only comparable against that fresh entry: they are
 * taken before a Message wins its sequence, so pushes among themselves can be out of order.
 */
function reflects(entry: ConversationSummary, message: Message): 'same' | 'older' | 'no' {
  const last = entry.lastMessage;
  if (!last) return 'no';
  const sent = Date.parse(message.createdAt);
  const newest = Date.parse(last.createdAt);
  if (sent < newest) return 'older';
  const same =
    sent === newest &&
    message.senderId === last.senderId &&
    previewOf(message.body) === last.preview;
  return same ? 'same' : 'no';
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
  const reload = useCallback(() => setPushedReloads((n) => n + 1), []);
  // The list as of the last push: two events can land before React renders either of them.
  const current = useRef<ConversationSummary[] | undefined>(undefined);
  const show = useCallback((list: ConversationSummary[]) => {
    current.current = list;
    setState({ status: 'ready', list });
  }, []);
  // The newest sequence pushed since the list was last loaded, per Conversation: what a
  // `conversation.read` must cover to clear the count without asking the server.
  const newestPushed = useRef(new Map<string, number>());
  // Conversations whose entry already moved past what the server last told us (see `reflects`).
  const pastSnapshot = useRef(new Set<string>());
  // Messages pushed while a list request is in flight, to replay onto its response.
  const inFlight = useRef<PushedMessage[] | undefined>(undefined);
  // The Message left uncounted because the open Conversation is expected to mark it read.
  const awaitedRead = useRef<AwaitedRead | undefined>(undefined);
  const stopAwaitingRead = useCallback(() => {
    clearTimeout(awaitedRead.current?.timer);
    awaitedRead.current = undefined;
  }, []);
  const onLoadedRef = useRef(onLoaded);
  useLayoutEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  /** The list with one pushed Message applied. Pushes come in sequence order per Conversation. */
  const applyMessage = useCallback(
    (list: ConversationSummary[], { message, reading }: PushedMessage): ConversationSummary[] => {
      const id = message.conversationId;
      newestPushed.current.set(id, Math.max(newestPushed.current.get(id) ?? 0, message.sequence));
      // Membership notes do not touch the preview or the order (spec: only Messages do).
      if (message.kind !== 'text') return list;
      const known = list.find((c) => c.id === id);
      if (!known) {
        // Not listed (e.g. the sender's other tab started it): the server knows the rest.
        reload();
        return list;
      }
      const fromOther = message.senderId !== userId;
      if (fromOther && reading) {
        stopAwaitingRead();
        awaitedRead.current = {
          conversationId: id,
          sequence: message.sequence,
          timer: setTimeout(() => {
            awaitedRead.current = undefined;
            reload();
          }, MARK_READ_GRACE_MS),
        };
      }
      const reflected = pastSnapshot.current.has(id) ? 'no' : reflects(known, message);
      if (reflected !== 'older') pastSnapshot.current.add(id);
      if (reflected !== 'no') return list;
      const updated = {
        ...known,
        unreadCount:
          fromOther && !reading
            ? Math.min(known.unreadCount + 1, UNREAD_COUNT_MAX)
            : known.unreadCount,
        lastMessage: {
          senderId: message.senderId,
          preview: previewOf(message.body),
          createdAt: message.createdAt,
        },
      };
      return [updated, ...list.filter((c) => c !== known)];
    },
    [userId, reload, stopAwaitingRead],
  );

  useEffect(() => {
    const controller = new AbortController();
    const pushes: PushedMessage[] = [];
    inFlight.current = pushes;
    void (async () => {
      const result = await listConversations(controller.signal);
      if (controller.signal.aborted) return;
      inFlight.current = undefined;
      if (!result.ok) {
        current.current = undefined;
        setState({ status: 'error', error: result.error });
        return;
      }
      newestPushed.current.clear();
      pastSnapshot.current.clear();
      stopAwaitingRead();
      onLoadedRef.current?.(result.conversations);
      show(pushes.reduce(applyMessage, result.conversations));
    })();
    return () => controller.abort();
  }, [listConversations, refreshKey, pushedReloads, applyMessage, show, stopAwaitingRead]);

  useEffect(() => stopAwaitingRead, [stopAwaitingRead]);

  // Moved away before the mark-read was confirmed: it may never be sent, so ask the server.
  useEffect(() => {
    if (!awaitedRead.current || awaitedRead.current.conversationId === readingId) return;
    stopAwaitingRead();
    reload();
  }, [readingId, reload, stopAwaitingRead]);

  useReconnected(reload);

  useRealtimeEvents(
    useCallback(
      (event) => {
        const list = current.current;
        if (event.type === 'conversation.created') {
          const { conversation } = event;
          // A response in flight may predate it; one asked for now cannot.
          if (inFlight.current) reload();
          if (!list) return;
          pastSnapshot.current.delete(conversation.id);
          // An ID already listed is replaced (a re-added Former Member's entry is stale).
          show([conversation, ...list.filter((c) => c.id !== conversation.id)]);
          return;
        }
        if (event.type === 'group.closed' || event.type === 'group.membership_ended') {
          // Both flip the entry to read-only; the server knows the rest.
          reload();
          return;
        }
        if (event.type === 'conversation.read') {
          const { conversationId, upToSequence } = event;
          const awaited = awaitedRead.current;
          if (awaited?.conversationId === conversationId && upToSequence >= awaited.sequence) {
            stopAwaitingRead();
          }
          // A response in flight may predate it; one asked for now cannot.
          if (inFlight.current) reload();
          // The User read on another tab or device (or this one). The event carries a
          // position, not a count: only one that covers everything known here clears it.
          const known = list?.find((c) => c.id === conversationId);
          if (!list || !known || known.unreadCount === 0) return;
          const newest = newestPushed.current.get(conversationId);
          if (newest === undefined || upToSequence < newest) {
            reload();
            return;
          }
          show(list.map((c) => (c === known ? { ...c, unreadCount: 0 } : c)));
          return;
        }
        if (event.type !== 'message.created') return;
        const { message } = event;
        const push = { message, reading: message.conversationId === readingId };
        inFlight.current?.push(push);
        if (list) show(applyMessage(list, push));
      },
      [readingId, applyMessage, reload, show, stopAwaitingRead],
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
