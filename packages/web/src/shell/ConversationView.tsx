import {
  MESSAGE_BODY_MAX,
  MessageBodySchema,
  type Message as ChatMessage,
  type User,
  type UserSearchResult,
} from '@chat/contracts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { useRealtimeEvents } from '@/realtime/RealtimeProvider';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { Message, MessageContent, MessageFooter } from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';

/** Show the counter once the text is within this many characters of the limit. */
const COUNTER_THRESHOLD = MESSAGE_BODY_MAX - 500;

const dayKey = (iso: string): string => new Date(iso).toDateString();
const dayLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'full' });
const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' });

/** A Message the User composed that the server has not confirmed yet. */
interface Outgoing {
  clientMessageId: string;
  body: string;
  /** When it was composed; only used to place it in the day grouping. */
  createdAt: string;
  status: 'pending' | 'failed';
  error?: string;
}

interface Row {
  key: string;
  senderId: string;
  createdAt: string;
  body: string;
  outgoing?: Outgoing;
}

/** Reaching within this many pixels of the top counts as the top. */
const TOP_THRESHOLD = 48;

interface Entry {
  row: Row;
  /** Set on the first Message of a day: the divider rendered inside its item, above it. */
  day?: string;
  /** Continues the previous Message's run: same sender, same day. */
  continuesRun: boolean;
}

/**
 * One entry per Message, so that prepending older Messages never changes an existing item
 * (the scroller keeps the reader's place by tracking items). Runs are only styling.
 */
function toEntries(rows: Row[]): Entry[] {
  return rows.map((row, i) => {
    const prev = rows[i - 1];
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(row.createdAt);
    return {
      row,
      ...(newDay ? { day: row.createdAt } : {}),
      continuesRun: !newDay && prev!.senderId === row.senderId,
    };
  });
}

const bySequence = (a: ChatMessage, b: ChatMessage) => a.sequence - b.sequence;

/** Adds Messages to a list, replacing any already there, oldest first. */
const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  const ids = new Set(incoming.map((m) => m.id));
  return [...incoming, ...current.filter((m) => !ids.has(m.id))].sort(bySequence);
};

function Composer({ onSend }: { onSend: (body: string) => void }) {
  const [text, setText] = useState('');
  const length = [...text].length;
  const sendable = MessageBodySchema.safeParse(text).success;

  function submit() {
    if (!sendable) return;
    onSend(text);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 border-t p-3">
      <InputGroup>
        <InputGroupTextarea
          aria-label="Message"
          placeholder="Write a message"
          rows={1}
          className="max-h-40 min-h-10"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <InputGroupAddon align="block-end" className="p-2">
          {length >= COUNTER_THRESHOLD && (
            <InputGroupText className={length > MESSAGE_BODY_MAX ? 'text-destructive' : undefined}>
              {length} / {MESSAGE_BODY_MAX}
            </InputGroupText>
          )}
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-sm"
            aria-label="Send"
            disabled={!sendable}
            className="ml-auto"
          >
            <ArrowUp />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

/**
 * A Direct Conversation with `peer`. It starts without a Conversation ID: the first Message
 * is sent to the User and creates the Conversation, later ones go to it. Messages are shown
 * as text only (ADR-0002).
 */
export function ConversationView({
  user,
  peer,
  conversationId: initialConversationId,
  onSent,
}: {
  user: User;
  peer: UserSearchResult;
  /** Set when opening an existing Conversation: its newest Messages are loaded. */
  conversationId?: string | undefined;
  /** Called after each send with the Conversation's ID. */
  onSent?: (conversationId: string) => void;
}) {
  const { sendDirectMessage, sendMessage, messagesPage } = useAuth();
  // Only the Conversation this view was opened with is loaded; a later change of the prop is
  // just the first send reporting the Conversation it created.
  const [openedWith] = useState(initialConversationId);
  const [conversationId, setConversationId] = useState(openedWith);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const loadingOlder = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openedWith) return;
    const controller = new AbortController();
    void (async () => {
      const result = await messagesPage(openedWith, undefined, controller.signal);
      if (controller.signal.aborted || !result.ok) return;
      setHasMore(result.hasMore);
      setMessages((current) => mergeMessages(current, result.messages));
    })();
    return () => controller.abort();
  }, [openedWith, messagesPage]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!openedWith || !hasMore || !oldest || loadingOlder.current) return;
    loadingOlder.current = true;
    try {
      const result = await messagesPage(openedWith, oldest.sequence);
      if (!result.ok) return;
      setHasMore(result.hasMore);
      setMessages((current) => mergeMessages(current, result.messages));
    } finally {
      loadingOlder.current = false;
    }
  }, [openedWith, hasMore, messagesPage]);

  function onScroll(e: UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop <= TOP_THRESHOLD) void loadOlder();
  }

  // A page that does not fill the viewport can never be scrolled to its top: keep loading.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && viewport.clientHeight > 0 && viewport.scrollHeight <= viewport.clientHeight) {
      void loadOlder();
    }
  }, [messages, loadOlder]);

  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);

  useRealtimeEvents(
    useCallback(
      (event) => {
        if (event.type !== 'message.created') return;
        const { message } = event;
        // A Message from the peer starts the Conversation this view was opened without.
        const ours = conversationId
          ? message.conversationId === conversationId
          : message.senderId === peer.id;
        if (!ours) return;
        if (!conversationId) setConversationId(message.conversationId);
        setMessages((current) => mergeMessages(current, [message]));
        setOutgoing((current) =>
          current.filter((o) => o.clientMessageId !== message.clientMessageId),
        );
      },
      [conversationId, peer.id],
    ),
  );

  /** Sends (or re-sends) with the Outgoing's own client message ID, so a retry never duplicates. */
  async function transmit(item: Outgoing) {
    const { clientMessageId, body } = item;
    const result = conversationId
      ? await sendMessage(conversationId, { clientMessageId, body })
      : await sendDirectMessage({ recipientId: peer.id, clientMessageId, body });
    if (!result.ok) {
      setOutgoing((current) =>
        current.map((o) =>
          o.clientMessageId === clientMessageId
            ? { ...o, status: 'failed', error: result.error }
            : o,
        ),
      );
      return;
    }
    const id = result.conversation?.id ?? result.message.conversationId;
    setConversationId(id);
    onSent?.(id);
    setOutgoing((current) => current.filter((o) => o.clientMessageId !== clientMessageId));
    setMessages((current) =>
      [
        ...current.filter(
          (m) => m.id !== result.message.id && m.clientMessageId !== clientMessageId,
        ),
        result.message,
      ].sort(bySequence),
    );
  }

  function send(body: string) {
    const item: Outgoing = {
      clientMessageId: crypto.randomUUID(),
      body,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setOutgoing((current) => [...current, item]);
    void transmit(item);
  }

  function retry(item: Outgoing) {
    const pending: Outgoing = {
      clientMessageId: item.clientMessageId,
      body: item.body,
      createdAt: item.createdAt,
      status: 'pending',
    };
    setOutgoing((current) =>
      current.map((o) => (o.clientMessageId === item.clientMessageId ? pending : o)),
    );
    void transmit(pending);
  }

  const rows: Row[] = [
    ...messages.map((m) => ({
      key: m.clientMessageId,
      senderId: m.senderId,
      createdAt: m.createdAt,
      body: m.body,
    })),
    ...outgoing.map((o) => ({
      key: o.clientMessageId,
      senderId: user.id,
      createdAt: o.createdAt,
      body: o.body,
      outgoing: o,
    })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 items-center gap-2 border-b px-4">
        <h1 className="truncate text-base font-semibold">{peer.nickname ?? peer.username}</h1>
        {peer.nickname !== null && (
          <span className="truncate text-sm text-muted-foreground">@{peer.username}</span>
        )}
      </header>
      <div className="relative min-h-0 flex-1">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to {peer.nickname ?? peer.username}.
          </p>
        ) : (
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport ref={viewportRef} onScroll={onScroll}>
                <MessageScrollerContent className="p-4">
                  {toEntries(rows).map(({ row: m, day, continuesRun }) => (
                    <MessageScrollerItem
                      key={m.key}
                      messageId={m.key}
                      scrollAnchor
                      className={continuesRun ? '-mt-4' : undefined}
                    >
                      {day && (
                        <Marker variant="separator" className="mb-6">
                          <MarkerContent>{dayLabel(day)}</MarkerContent>
                        </Marker>
                      )}
                      <Message align={m.senderId === user.id ? 'end' : 'start'}>
                        <MessageContent>
                          <Bubble
                            variant={
                              m.outgoing?.status === 'failed'
                                ? 'destructive'
                                : m.outgoing || m.senderId !== user.id
                                  ? 'muted'
                                  : 'default'
                            }
                          >
                            <BubbleContent
                              className="whitespace-pre-wrap"
                              title={timeLabel(m.createdAt)}
                            >
                              {m.body}
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                        {m.outgoing?.status === 'failed' && (
                          <MessageFooter className="items-center gap-2">
                            <span role="alert" className="text-sm text-destructive">
                              {m.outgoing.error}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => retry(m.outgoing!)}
                            >
                              Retry
                            </Button>
                          </MessageFooter>
                        )}
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton>
                <ArrowDown />
                <span className="sr-only">Jump to latest</span>
              </MessageScrollerButton>
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>
      <Composer onSend={send} />
    </div>
  );
}
