import type { Metadata } from "next";

import { ChatView } from "@/components/chat-view";

export const metadata: Metadata = {
  title: "AI coach",
  description:
    "Ask a read-only AI coach about PayPal sandbox transactions, balances, and spending forecasts.",
};

export default function ChatPage() {
  return (
    <div className="animate-fade-up">
      <header className="mb-6 max-w-3xl">
        <p className="eyebrow">The coach</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Ask. Understand. Don&apos;t move.
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink-soft sm:text-base">
          Plain-language budgeting help grounded in three read-only PayPal
          tools. The model never does the arithmetic, and it never has a way to
          send, capture, refund, or change anything.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="chip-mint">Automatic injection warning</span>
          <span className="chip">20 requests / hour / visitor</span>
          <span className="chip">Every call audited locally</span>
        </div>
      </header>

      <ChatView />
    </div>
  );
}
