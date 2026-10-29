import Link from "next/link";

import { FOOTER_DISCLAIMER } from "@/lib/types";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-pine/10 bg-white/45">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold text-ink">
            Read-Only Money Coach
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">
            An educational budgeting coach for one PayPal sandbox account. It
            reads transaction history and balances, then explains the numbers.
            It cannot move money.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-pine/15 bg-mint/60 px-3 py-1.5 text-xs font-semibold text-pine-deep">
            <span className="h-2 w-2 rounded-full bg-pine-light" aria-hidden="true" />
            Read-only by construction
          </p>
        </div>

        <div>
          <p className="eyebrow">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>
              <Link className="hover:text-pine" href="/chat">
                AI coach
              </Link>
            </li>
            <li>
              <Link className="hover:text-pine" href="/dashboard">
                Spending dashboard
              </Link>
            </li>
            <li>
              <Link className="hover:text-pine" href="/audit">
                Client-side audit log
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Safety</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>3 AI tools, all read-only</li>
            <li>OAuth scope guard fails closed</li>
            <li>No payments, orders, captures, refunds, or payouts</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-pine/10">
        <div className="page-shell flex flex-col gap-2 py-5 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-ink">{FOOTER_DISCLAIMER}</p>
          <p>
            Built for the PayPal AI Hackathon. PayPal sandbox only · no real
            money involved.
          </p>
        </div>
      </div>
    </footer>
  );
}
