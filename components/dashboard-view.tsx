"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "@/components/app-provider";
import {
  ModeBadge,
  StatusBadge,
  ToolBadge,
} from "@/components/badges";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatMonth,
  formatPercent,
} from "@/lib/format";
import type {
  AuditEntry,
  DashboardResponse,
  RateLimitInfo,
} from "@/lib/types";

type DashboardApiResponse = Partial<DashboardResponse> & {
  error?: { code: string; message: string };
  auditLog?: AuditEntry[];
  rateLimit?: RateLimitInfo;
};

interface DashboardError {
  message: string;
  code?: string;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface h-56 animate-pulse bg-white/50" />
        <div className="surface h-56 animate-pulse bg-white/50 lg:col-span-2" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface h-80 animate-pulse bg-white/50" />
        <div className="surface h-80 animate-pulse bg-white/50" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const {
    demoMode,
    updateDemoMode,
    appendAudit,
    toast,
  } = useApp();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<DashboardError | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/dashboard?source=${demoMode ? "demo" : "paypal"}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );
      const payload = (await response
        .json()
        .catch(() => null)) as DashboardApiResponse | null;

      if (currentRequest !== requestId.current) {
        return;
      }

      appendAudit(payload?.auditLog ?? []);

      if (
        !response.ok ||
        !payload ||
        payload.error ||
        !payload.balance ||
        !payload.spending
      ) {
        setData(null);
        setError({
          message:
            payload?.error?.message ??
            "The dashboard could not read the sandbox account.",
          code: payload?.error?.code,
        });
        return;
      }

      setData(payload as DashboardResponse);
    } catch {
      if (currentRequest === requestId.current) {
        setData(null);
        setError({
          message:
            "The dashboard API is unreachable. Check that the dev server is running, then retry.",
        });
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [appendAudit, demoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDemo() {
    if (switching) {
      return;
    }

    setSwitching(true);

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: true }),
      });
      const payload = (await response.json()) as {
        demoMode?: boolean;
        message?: string;
        error?: { message: string };
        auditLog?: AuditEntry[];
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error?.message ?? "Demo mode could not start.");
      }

      updateDemoMode(true);
      appendAudit(payload.auditLog ?? []);
      toast(payload.message ?? "Demo data enabled.", "success");
    } catch (caught) {
      toast(
        caught instanceof Error
          ? caught.message
          : "Demo mode could not start.",
        "error",
      );
    } finally {
      setSwitching(false);
    }
  }

  if (loading && !data) {
    return (
      <div>
        <DashboardHeader
          demoMode={demoMode}
          loading
          onRefresh={() => void load()}
          rateLimit={null}
        />
        <Skeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <DashboardHeader
          demoMode={demoMode}
          loading={loading}
          onRefresh={() => void load()}
          rateLimit={null}
        />
        <section className="surface border-coral/20 bg-coral-soft/45 p-6 sm:p-8">
          <span className="chip-coral">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" />
            {error.code ?? "READ_FAILED"}
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            The dashboard could not complete its read.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            {error.message}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-soft/70">
            Nothing was changed. In live mode, confirm the sandbox credentials
            and app scopes on the server. The seeded demo always works without
            PayPal credentials.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Retrying…" : "Retry read"}
            </button>
            <button
              type="button"
              onClick={() => void loadDemo()}
              disabled={switching}
              className="btn-secondary"
            >
              {switching ? "Loading demo…" : "Load demo data"}
            </button>
            <Link href="/audit" className="btn-ghost">
              Check the audit log
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { balance, spending } = data;
  const primary =
    balance.balances.find((item) => item.primary && item.currency === "USD") ??
    balance.balances.find((item) => item.primary) ??
    balance.balances[0] ??
    null;
  const primaryCurrency = primary?.currency ?? "USD";
  const spendingCurrency = spending.currency;
  const positiveCashFlow = spending.netCashFlow >= 0;
  const activeCategories = spending.byCategory.filter((item) => item.count > 0);
  const forecastProgress =
    spending.forecast.daysInMonth > 0
      ? spending.forecast.daysElapsed / spending.forecast.daysInMonth
      : 0;

  return (
    <div className="space-y-5">
      <DashboardHeader
        demoMode={demoMode}
        loading={loading}
        onRefresh={() => void load()}
        rateLimit={data.rateLimit ?? null}
        generatedAt={data.generatedAt}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface relative overflow-hidden p-5 sm:p-6" aria-labelledby="balance-heading">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-mint/70 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Sandbox balance</p>
                <h2 id="balance-heading" className="mt-1 font-display text-lg font-semibold text-ink">
                  What PayPal reports
                </h2>
              </div>
              <ModeBadge mode={data.mode} />
            </div>

            {primary ? (
              <>
                <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-pine-deep">
                  {formatCurrency(primary.total, primaryCurrency)}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-pine/10 pt-3 text-xs">
                  <div>
                    <dt className="text-ink-soft/65">Available</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {formatCurrency(primary.available, primaryCurrency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft/65">Withheld</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {formatCurrency(primary.withheld, primaryCurrency)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                PayPal returned no balance rows for this sandbox account.
              </p>
            )}

            <p className="mt-4 text-[11px] leading-5 text-ink-soft/65">
              As of {formatDateTime(balance.asOfTime)}.
              {balance.lastRefreshTime
                ? ` Last refreshed ${formatDateTime(balance.lastRefreshTime)}.`
                : ""}
            </p>

            {balance.balances.length > 1 ? (
              <ul className="mt-3 space-y-1.5 border-t border-pine/10 pt-3">
                {balance.balances.map((account) => (
                  <li
                    key={`${account.currency}-${account.primary}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-ink-soft">
                      {account.currency}
                      {account.primary ? " · primary" : ""}
                    </span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(account.total, account.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="surface p-5 sm:p-6 lg:col-span-2" aria-labelledby="spending-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Month to date</p>
              <h2 id="spending-heading" className="mt-1 font-display text-lg font-semibold text-ink">
                {formatMonth(spending.period.startDate)} spending
              </h2>
            </div>
            <span className="chip">
              {spending.period.startDate} → {spending.period.endDate}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="font-display text-5xl font-semibold tracking-tight text-ink">
                {formatCurrency(spending.totalSpent, spendingCurrency)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                across {spending.expenseTransactionCount} expense transactions
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-mint/60 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-pine-light">
                    Income
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pine-deep">
                    {formatCurrency(spending.totalIncome, spendingCurrency)}
                  </p>
                </div>
                <div className="rounded-2xl bg-cream-deep/70 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70">
                    Refunds
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {formatCurrency(spending.totalRefunds, spendingCurrency)}
                  </p>
                </div>
                <div
                  className={`rounded-2xl p-2.5 ${
                    positiveCashFlow ? "bg-mint/60" : "bg-coral-soft"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70">
                    Net flow
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      positiveCashFlow ? "text-pine-deep" : "text-coral"
                    }`}
                  >
                    {formatCurrency(spending.netCashFlow, spendingCurrency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-pine/10 bg-cream/60 p-4">
              <p className="eyebrow">Month-end projection</p>
              <p className="mt-1 font-display text-3xl font-semibold text-pine-deep">
                {formatCurrency(spending.forecast.amount, spendingCurrency)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                at{" "}
                {formatCurrency(
                  spending.forecast.averageDailySpend,
                  spendingCurrency,
                )}{" "}
                per day
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] font-medium text-ink-soft/70">
                  <span>
                    Day {spending.forecast.daysElapsed} of{" "}
                    {spending.forecast.daysInMonth}
                  </span>
                  <span>{formatPercent(forecastProgress)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-pine-light"
                    style={{
                      width: `${Math.min(100, forecastProgress * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-ink-soft/65">
                A projection, not a guarantee. Method is shown below.
              </p>
            </div>
          </div>
        </section>
      </div>

      {spending.suspiciousMemos.length > 0 ? (
        <section
          className="rounded-3xl border border-coral/30 bg-coral-soft/70 p-5 sm:p-6"
          aria-labelledby="injection-heading"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-lg text-white" aria-hidden="true">
              !
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-coral">
                Security signal · untrusted memo
              </p>
              <h2 id="injection-heading" className="mt-1 font-display text-xl font-semibold text-ink">
                Prompt-injection attempt detected and ignored
              </h2>
              <div className="mt-3 space-y-2">
                {spending.suspiciousMemos.map((memo) => (
                  <div
                    key={`${memo.transactionId}-${memo.memo}`}
                    className="rounded-2xl border border-coral/20 bg-white/80 p-3"
                  >
                    <p className="font-mono text-xs leading-6 text-ink">
                      &ldquo;{memo.memo}&rdquo;
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft/70">
                      {memo.merchant} · {memo.transactionId} · {memo.reason}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-ink-soft">
                The coach treated this text as data, not an instruction. No
                money-moving action exists or was attempted.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface p-5 sm:p-6" aria-labelledby="categories-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Category breakdown</p>
              <h2 id="categories-heading" className="mt-1 font-display text-lg font-semibold text-ink">
                Where it went
              </h2>
            </div>
            {spending.topCategory ? (
              <span className="chip-mint">
                Top: {titleCase(spending.topCategory.category)} ·{" "}
                {formatPercent(spending.topCategory.share)}
              </span>
            ) : null}
          </div>

          {activeCategories.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-cream/70 p-4 text-sm text-ink-soft">
              No USD spending transactions were found in this month.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {activeCategories.map((category) => (
                <li key={category.category}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">
                      {titleCase(category.category)}
                    </span>
                    <span className="text-xs text-ink-soft">
                      <strong className="font-semibold text-ink">
                        {formatCurrency(category.amount, spendingCurrency)}
                      </strong>{" "}
                      · {category.count} txn
                      {category.count === 1 ? "" : "s"} ·{" "}
                      {formatPercent(category.share)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-deep">
                    <div
                      className="h-full rounded-full bg-pine-light"
                      style={{
                        width: `${Math.max(2, category.share * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {spending.excludedCurrencyCount > 0 ? (
            <p className="mt-4 text-[11px] leading-5 text-ink-soft/65">
              {spending.excludedCurrencyCount} non-USD transaction
              {spending.excludedCurrencyCount === 1 ? " was" : "s were"}{" "}
              excluded from USD totals. They still appear in transaction reads.
            </p>
          ) : null}
        </section>

        <div className="space-y-4">
          <section className="surface p-5 sm:p-6" aria-labelledby="forecast-heading">
            <p className="eyebrow">Forecast</p>
            <h2 id="forecast-heading" className="mt-1 font-display text-lg font-semibold text-ink">
              How the projection works
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              {spending.forecast.method}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-pine/10 pt-3 text-xs">
              <div>
                <dt className="text-ink-soft/65">Elapsed UTC days</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  {spending.forecast.daysElapsed}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft/65">Days in month</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  {spending.forecast.daysInMonth}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-5 text-ink-soft/65">
              All arithmetic runs in TypeScript on integer cents. The language
              model receives the finished totals.
            </p>
          </section>

          <section className="surface p-5 sm:p-6" aria-labelledby="load-audit-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">This load</p>
                <h2 id="load-audit-heading" className="mt-1 font-display text-lg font-semibold text-ink">
                  Read-only calls
                </h2>
              </div>
              <Link href="/audit" className="text-xs font-semibold text-pine hover:underline">
                Full log →
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {data.auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-pine/10 bg-cream/45 px-2.5 py-2"
                >
                  <ToolBadge tool={entry.tool} />
                  <StatusBadge status={entry.status} />
                  <span className="text-[10px] text-ink-soft/60">
                    {formatDuration(entry.durationMs)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-5 text-ink-soft/65">
              Stored in this browser only. No database, no server-side history.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function DashboardHeader({
  demoMode,
  loading,
  onRefresh,
  rateLimit,
  generatedAt,
}: {
  demoMode: boolean;
  loading: boolean;
  onRefresh: () => void;
  rateLimit: RateLimitInfo | null;
  generatedAt?: string;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow">The month</p>
          <ModeBadge mode={demoMode ? "demo" : "paypal"} />
        </div>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Your money, in focus.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          One current-month view: what came in, what went out, and where it
          landed. Every number is read or computed server-side.
          {generatedAt ? ` Generated ${formatDateTime(generatedAt)}.` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {rateLimit ? (
          <span className="chip">
            {rateLimit.remaining}/{rateLimit.limit} requests left
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary text-xs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          >
            <path
              d="M20 6v5h-5M4 18v-5h5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.1 9a7 7 0 0 1 11.4-2.6L20 9M4 15l2.5 2.6A7 7 0 0 0 17.9 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {loading ? "Reading…" : "Refresh read"}
        </button>
      </div>
    </header>
  );
}
