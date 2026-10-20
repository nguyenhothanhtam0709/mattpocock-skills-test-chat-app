import {
  MESSAGE_BODY_MAX,
  MessageBodySchema,
  type Message as ChatMessage,
  type User,
  type UserSearchResult,
} from '@chat/contracts';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '@/auth/AuthProvider';
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
import { Message, MessageContent, MessageFooter, MessageGroup } from '@/components/ui/message';
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

interface Run {
  /** Set on the first run of a day: the divider rendered above it. */
  day?: string;
  senderId: string;
  messages: Row[];
}

/** Consecutive Messages by one sender on one day form a run; each new day starts a run. */
function toRuns(messages: Row[]): Run[] {
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

  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);

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
      ].sort((a, b) => a.sequence - b.sequence),
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
              <MessageScrollerViewport>
                <MessageScrollerContent className="p-4">
                  {toRuns(rows).flatMap((run) => [
                    ...(run.day
                      ? [
                          <MessageScrollerItem key={`day-${run.messages[0]!.key}`}>
                            <Marker variant="separator">
                              <MarkerContent>{dayLabel(run.day)}</MarkerContent>
                            </Marker>
                          </MessageScrollerItem>,
                        ]
                      : []),
                    <MessageScrollerItem
                      key={run.messages[0]!.key}
                      messageId={run.messages[0]!.key}
                      scrollAnchor
                    >
                      <MessageGroup>
                        {run.messages.map((m) => (
                          <Message key={m.key} align={m.senderId === user.id ? 'end' : 'start'}>
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
