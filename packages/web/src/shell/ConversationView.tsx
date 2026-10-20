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
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { Message, MessageContent } from '@/components/ui/message';
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

/** Reaching within this many pixels of the top counts as the top. */
const TOP_THRESHOLD = 48;

interface Entry {
  message: ChatMessage;
  /** Set on the first Message of a day: the divider rendered inside its item, above it. */
  day?: string;
  /** Continues the previous Message's run: same sender, same day. */
  continuesRun: boolean;
}

/**
 * One entry per Message, so that prepending older Messages never changes an existing item
 * (the scroller keeps the reader's place by tracking items). Runs are only styling.
 */
function toEntries(messages: ChatMessage[]): Entry[] {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
    return {
      message,
      ...(newDay ? { day: message.createdAt } : {}),
      continuesRun: !newDay && prev!.senderId === message.senderId,
    };
  });
}

const bySequence = (a: ChatMessage, b: ChatMessage) => a.sequence - b.sequence;

/** Adds Messages to a list, replacing any already there, oldest first. */
const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  const ids = new Set(incoming.map((m) => m.id));
  return [...incoming, ...current.filter((m) => !ids.has(m.id))].sort(bySequence);
};

function Composer({ onSend }: { onSend: (body: string) => Promise<string | undefined> }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const errorId = useId();
  const length = [...text].length;
  const sendable = MessageBodySchema.safeParse(text).success && !sending;

  async function submit() {
    if (!sendable) return;
    setSending(true);
    setError(undefined);
    const failure = await onSend(text);
    setSending(false);
    if (failure === undefined) setText('');
    else setError(failure);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 border-t p-3">
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <InputGroup>
        <InputGroupTextarea
          aria-label="Message"
          aria-describedby={error ? errorId : undefined}
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

  async function send(body: string): Promise<string | undefined> {
    const clientMessageId = crypto.randomUUID();
    const result = conversationId
      ? await sendMessage(conversationId, { clientMessageId, body })
      : await sendDirectMessage({ recipientId: peer.id, clientMessageId, body });
    if (!result.ok) return result.error;
    const id = result.conversation?.id ?? result.message.conversationId;
    setConversationId(id);
    onSent?.(id);
    setMessages((current) => mergeMessages(current, [result.message]));
    return undefined;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 items-center gap-2 border-b px-4">
        <h1 className="truncate text-base font-semibold">{peer.nickname ?? peer.username}</h1>
        {peer.nickname !== null && (
          <span className="truncate text-sm text-muted-foreground">@{peer.username}</span>
        )}
      </header>
      <div className="relative min-h-0 flex-1">
        {messages.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to {peer.nickname ?? peer.username}.
          </p>
        ) : (
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport ref={viewportRef} onScroll={onScroll}>
                <MessageScrollerContent className="p-4">
                  {toEntries(messages).map(({ message: m, day, continuesRun }) => (
                    <MessageScrollerItem
                      key={m.id}
                      messageId={m.id}
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
                          <Bubble variant={m.senderId === user.id ? 'default' : 'muted'}>
                            <BubbleContent
                              className="whitespace-pre-wrap"
                              title={timeLabel(m.createdAt)}
                            >
                              {m.body}
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
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
