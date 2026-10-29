"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "@/components/app-provider";
import { ModeBadge, StatusBadge, ToolBadge } from "@/components/badges";
import { CoachMarkdown } from "@/components/markdown";
import { formatDuration } from "@/lib/format";
import type {
  AuditEntry,
  ChatResponse,
  RateLimitInfo,
} from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: AuditEntry[];
  securityWarnings?: string[];
  error?: boolean;
}

type ChatApiResponse = ChatResponse & {
  error?: { code: string; message: string };
};

const DEMO_PROMPTS = [
  "Where did my money go this month?",
  "What is my balance and month-end forecast?",
  "Check this month's transactions for anything suspicious.",
  "Can you send $50 to my friend?",
] as const;

const LIVE_PROMPTS = [
  "Summarize this month's spending by category.",
  "What is my current sandbox balance?",
  "Which subscriptions show up in the last 30 days?",
  "Can you refund my last purchase?",
] as const;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatView() {
  const { demoMode, appendAudit } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [hasSent, setHasSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prompts = demoMode ? DEMO_PROMPTS : LIVE_PROMPTS;

  useEffect(() => {
    if (!hasSent && !sending) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending, hasSent]);

  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();

      if (!trimmed || sending) {
        return;
      }

      const history = messages
        .filter((message) => !message.error && message.content.trim())
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.content.slice(0, 4_000),
        }));

      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
      };

      setMessages((previous) => [...previous, userMessage]);
      setInput("");
      setSending(true);
      setHasSent(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: trimmed, history }),
        });

        const data = (await response.json()) as ChatApiResponse;
        appendAudit(data.auditLog ?? []);
        setRateLimit(data.rateLimit ?? null);

        const assistantMessage: ChatMessage = {
          id: newId(),
          role: "assistant",
          content:
            data.reply ||
            data.error?.message ||
            "The coach returned an empty response. No account data was changed.",
          toolCalls: data.toolCalls ?? [],
          securityWarnings: data.securityWarnings ?? [],
          error: !response.ok,
        };

        setMessages((previous) => [...previous, assistantMessage]);
      } catch {
        setMessages((previous) => [
          ...previous,
          {
            id: newId(),
            role: "assistant",
            content:
              "I could not reach the coach API. No money-moving action exists or was attempted. Check the server logs and try again.",
            error: true,
          },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [appendAudit, messages, sending],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function resetChat() {
    setMessages([]);
    setInput("");
    setRateLimit(null);
    setHasSent(false);
    inputRef.current?.focus();
  }

  return (
    <section className="surface overflow-hidden" aria-label="AI money coach chat">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pine/10 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-pine text-[11px] font-bold text-cream">
            MC
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-mint-strong" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight text-ink">
              Coach session
            </h2>
            <p className="text-[11px] text-ink-soft/70">
              Three read-only tools · no money movement
            </p>
          </div>
          <ModeBadge mode={demoMode ? "demo" : "paypal"} />
        </div>

        <div className="flex items-center gap-2">
          {rateLimit ? (
            <span
              className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${
                rateLimit.remaining === 0
                  ? "bg-coral-soft text-coral"
                  : "bg-cream-deep text-ink-soft"
              }`}
              title={`Resets ${new Date(rateLimit.resetAt).toLocaleString()}`}
            >
              {rateLimit.remaining}/{rateLimit.limit} requests left this hour
            </span>
          ) : null}
          <button
            type="button"
            onClick={resetChat}
            className="rounded-full border border-pine/15 bg-white px-3 py-1.5 text-xs font-semibold text-pine transition hover:border-pine/35"
          >
            New chat
          </button>
        </div>
      </div>

      <div className="min-h-[25rem] bg-cream/45 px-3 py-5 sm:px-5">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center py-6 text-center sm:py-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl border border-pine/10 bg-white text-pine shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                <path
                  d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3v-3A2.5 2.5 0 0 1 4 13.5v-7Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 8.5h8M8 11.5h5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <h3 className="mt-4 font-display text-2xl font-semibold text-ink">
              Ask where your money went.
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink-soft">
              The coach can read transactions and balances, then compute a
              spending summary in TypeScript. It cannot send, capture, refund,
              or change anything. Try one of these:
            </p>

            <div className="mt-5 grid w-full gap-2 text-left sm:grid-cols-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={sending}
                  className="group rounded-2xl border border-pine/10 bg-white/85 px-4 py-3 text-left text-sm text-ink-soft shadow-sm transition hover:-translate-y-0.5 hover:border-pine/25 hover:text-pine-deep hover:shadow-card"
                >
                  <span className="mr-1.5 text-pine/50 transition group-hover:text-pine">
                    ↗
                  </span>
                  {prompt}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11px] leading-5 text-ink-soft/65">
              {demoMode
                ? "Demo mode uses 25 seeded transactions, including a prompt-injection memo in DEMO-0011."
                : "Live mode reads the sandbox account configured on the server. No real money is involved."}
            </p>
          </div>
        ) : (
          <div
            className="mx-auto max-w-3xl space-y-5"
            aria-live="polite"
            aria-busy={sending}
          >
            {messages.map((message) => (
              <article key={message.id}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-3xl rounded-br-md bg-pine-deep px-4 py-3 text-sm leading-6 text-cream shadow-sm sm:max-w-[75%]">
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2.5 sm:gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pine/15 bg-white text-[10px] font-bold text-pine shadow-sm">
                      MC
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`rounded-3xl rounded-tl-md border px-4 py-3 shadow-sm ${
                          message.error
                            ? "border-coral/25 bg-coral-soft/70"
                            : "border-pine/10 bg-white"
                        }`}
                      >
                        {message.securityWarnings &&
                        message.securityWarnings.length > 0 ? (
                          <div className="mb-3 rounded-2xl border border-coral/25 bg-coral-soft px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-coral">
                              Security signal
                            </p>
                            <ul className="mt-1 space-y-1 text-xs leading-5 text-ink">
                              {message.securityWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <CoachMarkdown>{message.content}</CoachMarkdown>

                        {message.toolCalls && message.toolCalls.length > 0 ? (
                          <div className="mt-3 border-t border-pine/10 pt-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft/60">
                              Read-only tool calls
                            </p>
                            <ul className="mt-1.5 flex flex-wrap gap-1.5">
                              {message.toolCalls.map((call) => (
                                <li
                                  key={call.id}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-pine/10 bg-cream/60 px-1.5 py-1"
                                >
                                  <ToolBadge tool={call.tool} />
                                  <StatusBadge status={call.status} />
                                  <span className="pr-1 text-[10px] text-ink-soft/60">
                                    {formatDuration(call.durationMs)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-1 pl-1 text-[10px] text-ink-soft/45">
                        Tool reads are stored in your browser. Verify them on the
                        Audit log page.
                      </p>
                    </div>
                  </div>
                )}
              </article>
            ))}

            {sending ? (
              <div className="flex gap-2.5 sm:gap-3" role="status">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pine/15 bg-white text-[10px] font-bold text-pine shadow-sm">
                  MC
                </span>
                <div className="flex items-center gap-3 rounded-3xl rounded-tl-md border border-pine/10 bg-white px-4 py-3 shadow-sm">
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-pine-light" />
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-pine-light [animation-delay:180ms]" />
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-pine-light [animation-delay:360ms]" />
                  </span>
                  <span className="text-xs text-ink-soft">
                    Reading only what it is allowed to read…
                  </span>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-pine/10 bg-white/75 px-3 py-3 sm:px-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
          className="mx-auto max-w-3xl"
        >
          <label htmlFor="coach-message" className="sr-only">
            Message the coach
          </label>
          <div className="flex items-end gap-2 rounded-3xl border border-pine/15 bg-white p-2 shadow-sm transition focus-within:border-pine/35 focus-within:ring-4 focus-within:ring-mint">
            <textarea
              id="coach-message"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2_000}
              rows={2}
              placeholder={
                demoMode
                  ? "Ask about the seeded transactions, balance, or forecast…"
                  : "Ask about your PayPal sandbox transactions or balance…"
              }
              className="max-h-40 min-h-[3.2rem] flex-1 resize-y border-0 bg-transparent px-2 py-1.5 text-sm leading-6 text-ink outline-none placeholder:text-ink/35"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              className="btn-primary mb-0.5 h-10 w-10 shrink-0 rounded-full px-0 py-0"
              aria-label="Send message"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="m4.5 12 15-7-4.2 15-3.5-6.1L4.5 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m11.8 13.9 3.4-3.4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-ink-soft/60">
            <p>
              Read-only. Educational information, not financial advice. Memos
              are treated as untrusted data.
            </p>
            <p className="flex items-center gap-2">
              {input.length > 1_800 ? (
                <span className={input.length >= 2_000 ? "text-coral" : ""}>
                  {input.length}/2,000
                </span>
              ) : null}
              <span>Enter to send · Shift+Enter for a new line</span>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
