import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  Database,
  Eraser,
  PackageSearch,
  Repeat2,
  Sparkles,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { describeError, loadConnectionString, sendChatQuery } from '../lib/api';
import { describeConnection } from '../lib/connections';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const GREETING: Message = {
  id: 'greeting',
  role: 'agent',
  content:
    "Semantic bridge established. Ask me to check stock, move inventory between locations, or raise a fulfillment order — in plain English.",
  timestamp: new Date(),
};

const SUGGESTIONS = [
  { icon: PackageSearch, label: 'Check stock', query: 'How many hex bolts do we have in total?' },
  { icon: Repeat2, label: 'Transfer stock', query: 'Transfer 25 units of SKU-CAM-4K from WH-LONDON to WH-LEEDS' },
  { icon: Database, label: 'Search products', query: 'Do we stock any security cameras?' },
  { icon: Sparkles, label: 'Create an order', query: 'Create an order for 12 units of SKU-CAM-4K' },
];

/** Renders the **bold** spans the agent uses without pulling in a markdown library. */
const renderContent = (content: string) =>
  content.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  );

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Copy control that confirms itself, so the click has visible feedback. */
const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; silently leave the button unchanged.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md p-1.5 text-ink-faint opacity-0 transition-all hover:bg-surface-sunken hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      aria-label={copied ? 'Copied' : 'Copy message'}
      title={copied ? 'Copied' : 'Copy message'}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [connectionString] = useState<string | null>(() => loadConnectionString());
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isTyping]);

  /** Grow the composer with its content instead of scrolling a one-line box. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const host = useMemo(() => describeConnection(connectionString), [connectionString]);

  const submitQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !connectionString || isTyping) return;

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-u`, role: 'user', content: trimmed, timestamp: new Date() },
      ]);
      setInput('');
      setIsTyping(true);

      try {
        const response = await sendChatQuery(connectionString, trimmed);
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: 'agent', content: response, timestamp: new Date() },
        ]);
      } catch (error) {
        console.error(error);
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-e`,
            role: 'agent',
            content: describeError(error),
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [connectionString, isTyping],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitQuery(input);
    }
  };

  const isDisabled = !connectionString;
  const hasConversation = messages.length > 1;

  return (
    <div className="flex h-full">
      {/* ------------------------------------------------------- Side rail */}
      <aside className="hidden w-[300px] flex-shrink-0 flex-col border-r border-line bg-surface/50 backdrop-blur-xl lg:flex">
        <div className="border-b border-line px-5 py-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="label">Connection</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[11px] font-semibold text-primary transition-opacity hover:opacity-70"
            >
              Switch
            </button>
          </div>
          {host ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 flex-shrink-0 text-primary" />
                <code className="truncate font-mono text-[12px] text-ink" title={host.database}>
                  {host.database}
                </code>
              </div>
              <code className="block truncate pl-[26px] font-mono text-[11px] text-ink-muted" title={host.server}>
                {host.server}
              </code>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {connectionString ? 'Custom connection' : 'Not connected'}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <p className="label mb-3">Try asking</p>
          <ul className="stagger space-y-2">
            {SUGGESTIONS.map(({ icon: Icon, label, query }, i) => (
              <li key={label} style={{ ['--i' as string]: i }} className="animate-fade-rise">
                <button
                  type="button"
                  onClick={() => void submitQuery(query)}
                  disabled={isDisabled || isTyping}
                  className="group w-full rounded-field border border-line bg-surface p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {label}
                    <ArrowRight className="ml-auto h-3 w-3 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-ink-muted">{query}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line p-4">
          <button
            type="button"
            onClick={() => setMessages([GREETING])}
            disabled={!hasConversation}
            className="btn-ghost w-full !py-2.5 text-[13px]"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear conversation
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------------- Thread */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-line px-5 py-4 md:px-8">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-primary-on">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-bold leading-tight">Inventory assistant</h1>
            <p className="text-[11px] text-ink-muted">
              {isTyping ? 'Reasoning over your schema…' : 'Ready'}
            </p>
          </div>
        </div>

        {isDisabled && (
          <div className="notice-warning m-5 mb-0 md:mx-8" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">No database is bridged yet</p>
              <p className="mt-0.5 opacity-90">Finish onboarding and the assistant will come online.</p>
            </div>
            <button onClick={() => navigate('/')} className="btn-quiet flex-shrink-0 !py-1 font-semibold">
              Start
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <article
                  key={msg.id}
                  className={`group flex animate-fade-rise gap-3.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] ${
                      isUser
                        ? 'border border-line bg-surface text-ink-muted'
                        : msg.isError
                          ? 'bg-danger/15 text-danger'
                          : 'bg-primary text-primary-on'
                    }`}
                    aria-hidden
                  >
                    {isUser ? (
                      <User className="h-4 w-4" />
                    ) : msg.isError ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </span>

                  <div className={`flex min-w-0 max-w-[min(100%,46rem)] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-card px-4 py-3 text-[14px] leading-relaxed ${
                        isUser
                          ? 'rounded-tr-sm bg-primary text-primary-on'
                          : msg.isError
                            ? 'rounded-tl-sm border border-danger/30 bg-danger-soft text-danger'
                            : 'rounded-tl-sm border border-line bg-surface text-ink shadow-soft'
                      }`}
                    >
                      {msg.isError && <p className="mb-1 font-semibold">Request failed</p>}
                      <p className="whitespace-pre-wrap break-words">{renderContent(msg.content)}</p>
                    </div>

                    <div className={`mt-1.5 flex items-center gap-1 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <time
                        dateTime={msg.timestamp.toISOString()}
                        className="font-mono text-[10px] text-ink-faint"
                      >
                        {formatTime(msg.timestamp)}
                      </time>
                      {!isUser && <CopyButton value={msg.content} />}
                    </div>
                  </div>
                </article>
              );
            })}

            {isTyping && (
              <div className="flex animate-fade-in gap-3.5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-on">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5 rounded-card rounded-tl-sm border border-line bg-surface px-4 py-4 shadow-soft">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-primary"
                      style={{ animationDelay: `${i * 160}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ------------------------------------------------------- Composer */}
        <div className="flex-shrink-0 border-t border-line bg-surface/60 px-5 py-4 backdrop-blur-xl md:px-8">
          <div className="mx-auto max-w-3xl">
            {!hasConversation && !isDisabled && (
              <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
                {SUGGESTIONS.slice(0, 2).map(({ icon: Icon, label, query }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => void submitQuery(query)}
                    disabled={isTyping}
                    className="chip hover:border-primary/50 hover:text-ink disabled:opacity-50"
                  >
                    <Icon className="h-3 w-3 text-primary" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitQuery(input);
              }}
              className="group relative flex items-end gap-2 rounded-card border border-line bg-surface p-2 shadow-soft transition-all duration-200 focus-within:border-primary focus-within:shadow-glow"
            >
              <label htmlFor="agent-input" className="sr-only">
                Ask the inventory agent
              </label>
              <textarea
                id="agent-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isDisabled ? 'Connect a database to begin…' : 'Ask about stock, transfers or orders…'
                }
                disabled={isTyping || isDisabled}
                className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping || isDisabled}
                className="btn-primary h-[44px] w-[44px] flex-shrink-0 !p-0"
                aria-label="Send message"
              >
                <CornerDownLeft className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-2 text-center text-[11px] text-ink-faint">
              <kbd className="rounded border border-line bg-surface-sunken px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{' '}
              to send ·{' '}
              <kbd className="rounded border border-line bg-surface-sunken px-1 py-0.5 font-mono text-[10px]">
                Shift + Enter
              </kbd>{' '}
              for a new line
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Chat;
