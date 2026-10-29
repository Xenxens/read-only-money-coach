import { categorizeTransaction } from "@/lib/categories";
import { findSuspiciousMemos } from "@/lib/safety";
import type {
  CategoryTotal,
  DataSource,
  ForecastSummary,
  NormalizedTransaction,
  SpendingCategory,
  SpendingSummary,
} from "@/lib/types";
import { SPENDING_CATEGORIES } from "@/lib/types";

const REPORTING_CURRENCY = "USD";

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function toDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function getCurrentMonthRange(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

export function summarizeSpending(
  transactions: NormalizedTransaction[],
  options: { now?: Date; source: DataSource },
): SpendingSummary {
  const now = options.now ?? new Date();
  const { startDate, endDate } = getCurrentMonthRange(now);
  const daysElapsed = Math.max(1, now.getUTCDate());
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const currentMonth = transactions.filter((transaction) => {
    const key = toDateKey(transaction.date);
    return key >= startDate && key <= endDate;
  });

  const inReportingCurrency = currentMonth.filter(
    (transaction) => transaction.currency === REPORTING_CURRENCY,
  );
  const excludedCurrencyCount =
    currentMonth.length - inReportingCurrency.length;

  const categoryCents = new Map<SpendingCategory, number>();
  const categoryCounts = new Map<SpendingCategory, number>();
  for (const category of SPENDING_CATEGORIES) {
    categoryCents.set(category, 0);
    categoryCounts.set(category, 0);
  }

  let totalSpentCents = 0;
  let totalIncomeCents = 0;
  let totalRefundCents = 0;
  let expenseTransactionCount = 0;

  for (const transaction of inReportingCurrency) {
    const category = categorizeTransaction(transaction);
    const cents = toCents(transaction.amount);

    if (category === "income") {
      totalIncomeCents += cents;
      continue;
    }

    if (category === "refund") {
      totalRefundCents += cents;
      continue;
    }

    if (cents < 0) {
      const absolute = Math.abs(cents);
      totalSpentCents += absolute;
      expenseTransactionCount += 1;
      categoryCents.set(
        category,
        (categoryCents.get(category) ?? 0) + absolute,
      );
      categoryCounts.set(
        category,
        (categoryCounts.get(category) ?? 0) + 1,
      );
    }
  }

  const byCategory: CategoryTotal[] = SPENDING_CATEGORIES.map((category) => {
    const amount = fromCents(categoryCents.get(category) ?? 0);
    return {
      category,
      amount,
      count: categoryCounts.get(category) ?? 0,
      share:
        totalSpentCents > 0
          ? Math.round(((categoryCents.get(category) ?? 0) / totalSpentCents) * 10_000) /
            10_000
          : 0,
    };
  }).sort((a, b) => b.amount - a.amount);

  const topCategory = byCategory.find((item) => item.amount > 0) ?? null;
  const averageDailyCents = Math.round(totalSpentCents / daysElapsed);
  const forecastCents = Math.round(
    (totalSpentCents / daysElapsed) * daysInMonth,
  );

  const forecast: ForecastSummary = {
    amount: fromCents(forecastCents),
    averageDailySpend: fromCents(averageDailyCents),
    daysElapsed,
    daysInMonth,
    asOfDate: endDate,
    method:
      "Current-month spending so far ÷ elapsed UTC calendar days × days in this month.",
  };

  return {
    source: options.source,
    currency: REPORTING_CURRENCY,
    period: { startDate, endDate },
    totalSpent: fromCents(totalSpentCents),
    totalIncome: fromCents(totalIncomeCents),
    totalRefunds: fromCents(totalRefundCents),
    netCashFlow: fromCents(
      totalIncomeCents + totalRefundCents - totalSpentCents,
    ),
    expenseTransactionCount,
    transactionCount: inReportingCurrency.length,
    byCategory,
    topCategory,
    forecast,
    suspiciousMemos: findSuspiciousMemos(currentMonth),
    excludedCurrencyCount,
    generatedAt: now.toISOString(),
  };
}
