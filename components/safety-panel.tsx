const CAN_ITEMS = [
  "Read transactions",
  "Read balances",
  "Summarize spending",
] as const;

const CANNOT_ITEMS = [
  "Send money",
  "Create orders",
  "Capture payments",
  "Refund or reverse",
  "Payouts or invoices",
] as const;

export function SafetyPanel() {
  return (
    <section
      aria-label="Read-only capability boundary"
      className="border-b border-pine/10 bg-pine-deep text-cream"
    >
      <div className="page-shell grid min-w-0 gap-3 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-mint-strong/40 bg-mint/10 text-xs text-mint-strong">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M7 10V8a5 5 0 0 1 10 0v2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <rect
                x="4.5"
                y="10"
                width="15"
                height="10.5"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-mint-strong">
            Hard boundary
          </p>
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
            <span className="font-semibold uppercase tracking-[0.12em] text-mint-strong">
              Can
            </span>
            {CAN_ITEMS.map((item) => (
              <span
                key={item}
                className="whitespace-nowrap rounded-full border border-mint-strong/25 bg-mint/10 px-2.5 py-1 text-cream/90"
              >
                {item}
              </span>
            ))}
          </div>
          <span className="hidden h-5 w-px bg-cream/20 sm:block" aria-hidden="true" />
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
            <span className="font-semibold uppercase tracking-[0.12em] text-coral-soft">
              Cannot
            </span>
            {CANNOT_ITEMS.map((item) => (
              <span
                key={item}
                className="whitespace-nowrap rounded-full border border-cream/15 bg-white/5 px-2.5 py-1 text-cream/70 line-through decoration-coral/80 decoration-2"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <p className="hidden whitespace-nowrap rounded-full border border-mint-strong/25 bg-mint/10 px-3 py-1.5 text-[11px] font-semibold text-mint-strong xl:block">
          3 tools · 3 endpoints · 0 money-moving actions
        </p>
      </div>
    </section>
  );
}
