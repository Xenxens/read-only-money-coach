import { summarizeSpending } from "@/lib/analytics";
import { getCurrentMonthRange } from "@/lib/analytics";
import {
  getDemoBalance,
  getDemoTransactionsInRange,
} from "@/lib/demo-data";
import { validateDateRange } from "@/lib/dates";
import { getBalance, getTransactions } from "@/lib/paypal";
import { findSuspiciousMemos } from "@/lib/safety";
import type {
  BalanceSummary,
  DataSource,
  SpendingSummary,
  TransactionQueryResult,
} from "@/lib/types";

/**
 * Central read-only data gate. Demo mode never touches PayPal. Live mode can
 * reach only the three exported functions in lib/paypal.ts, which in turn can
 * reach only the token, transaction-search, and balances endpoints.
 */

export function dataSourceFor(demoMode: boolean): DataSource {
  return demoMode ? "demo" : "paypal";
}

export async function loadTransactions(
  startDate: string,
  endDate: string,
  mode: DataSource,
  now: Date = new Date(),
  maxDays?: number,
): Promise<TransactionQueryResult> {
  validateDateRange({ startDate, endDate }, { now, maxDays });

  const transactions =
    mode === "demo"
      ? getDemoTransactionsInRange(startDate, endDate, now)
      : await getTransactions(startDate, endDate);

  return {
    source: mode,
    startDate,
    endDate,
    count: transactions.length,
    truncated: false,
    transactions,
    suspiciousMemos: findSuspiciousMemos(transactions),
  };
}

export async function loadBalance(mode: DataSource): Promise<BalanceSummary> {
  return mode === "demo" ? getDemoBalance() : getBalance();
}

export async function loadCurrentMonthSpending(
  mode: DataSource,
  now: Date = new Date(),
): Promise<SpendingSummary> {
  const { startDate, endDate } = getCurrentMonthRange(now);

  const transactions =
    mode === "demo"
      ? getDemoTransactionsInRange(startDate, endDate, now)
      : await getTransactions(startDate, endDate);

  return summarizeSpending(transactions, { now, source: mode });
}
