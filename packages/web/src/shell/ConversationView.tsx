import {
  MESSAGE_BODY_MAX,
  MessageBodySchema,
  type Message as ChatMessage,
  type User,
  type UserSearchResult,
} from '@chat/contracts';
import { ArrowUp } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
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
import { Message, MessageContent, MessageGroup } from '@/components/ui/message';
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

interface Run {
  /** Set on the first run of a day: the divider rendered above it. */
  day?: string;
  senderId: string;
  messages: ChatMessage[];
}

/** Consecutive Messages by one sender on one day form a run; each new day starts a run. */
function toRuns(messages: ChatMessage[]): Run[] {
  const runs: Run[] = [];
  for (const message of messages) {
    const last = runs.at(-1);
    const prev = last?.messages.at(-1);
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
    if (last && prev && !newDay && last.senderId === message.senderId) {
      last.messages.push(message);
    } else {
      runs.push({
        ...(newDay ? { day: message.createdAt } : {}),
        senderId: message.senderId,
        messages: [message],
      });
    }
  }
  return runs;
}

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
  const { sendDirectMessage, sendMessage, latestMessages } = useAuth();
  // Only the Conversation this view was opened with is loaded; a later change of the prop is
  // just the first send reporting the Conversation it created.
  const [openedWith] = useState(initialConversationId);
  const [conversationId, setConversationId] = useState(openedWith);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!openedWith) return;
    const controller = new AbortController();
    void (async () => {
      const result = await latestMessages(openedWith, controller.signal);
      if (controller.signal.aborted || !result.ok) return;
      setMessages((current) => {
        const loaded = new Set(result.messages.map((m) => m.id));
        return [...result.messages, ...current.filter((m) => !loaded.has(m.id))].sort(
          (a, b) => a.sequence - b.sequence,
        );
      });
    })();
    return () => controller.abort();
  }, [openedWith, latestMessages]);

  async function send(body: string): Promise<string | undefined> {
    const clientMessageId = crypto.randomUUID();
    const result = conversationId
      ? await sendMessage(conversationId, { clientMessageId, body })
      : await sendDirectMessage({ recipientId: peer.id, clientMessageId, body });
    if (!result.ok) return result.error;
    const id = result.conversation?.id ?? result.message.conversationId;
    setConversationId(id);
    onSent?.(id);
    setMessages((current) =>
      [...current.filter((m) => m.id !== result.message.id), result.message].sort(
        (a, b) => a.sequence - b.sequence,
      ),
    );
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
              <MessageScrollerViewport>
                <MessageScrollerContent className="p-4">
                  {toRuns(messages).flatMap((run) => [
                    ...(run.day
                      ? [
                          <MessageScrollerItem key={`day-${run.messages[0]!.id}`}>
                            <Marker variant="separator">
                              <MarkerContent>{dayLabel(run.day)}</MarkerContent>
                            </Marker>
                          </MessageScrollerItem>,
                        ]
                      : []),
                    <MessageScrollerItem
                      key={run.messages[0]!.id}
                      messageId={run.messages[0]!.id}
                      scrollAnchor
                    >
                      <MessageGroup>
                        {run.messages.map((m) => (
                          <Message key={m.id} align={m.senderId === user.id ? 'end' : 'start'}>
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
                        ))}
                      </MessageGroup>
                    </MessageScrollerItem>,
                  ])}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>
      <Composer onSend={send} />
    </div>
  );
}
