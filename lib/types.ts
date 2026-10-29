export const TOOL_NAMES = [
  "get_transactions",
  "get_balance",
  "summarize_spending",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type DataSource = "demo" | "paypal";

export type AuditTrigger = "chat" | "dashboard";

export type AuditStatus = "success" | "error";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AuditEntry {
  id: string;
  timestamp: string;
  tool: ToolName;
  params: Record<string, JsonValue>;
  result: JsonValue;
  status: AuditStatus;
  error?: string;
  durationMs: number;
  trigger: AuditTrigger;
  mode: DataSource;
  readOnly: true;
}

export interface SuspiciousMemo {
  transactionId: string;
  date: string;
  merchant: string;
  memo: string;
  reason: string;
}

export interface NormalizedTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  merchant: string;
  memo: string;
  description: string;
  status: string;
  eventCode: string;
  category: TransactionCategory;
  direction: "incoming" | "outgoing";
}

export type TransactionCategory =
  | "groceries"
  | "dining"
  | "subscriptions"
  | "transport"
  | "utilities"
  | "income"
  | "refund"
  | "other";

export const SPENDING_CATEGORIES = [
  "groceries",
  "dining",
  "subscriptions",
  "transport",
  "utilities",
  "other",
] as const;

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];

export interface CategoryTotal {
  category: SpendingCategory;
  amount: number;
  count: number;
  share: number;
}

export interface BalanceAccount {
  currency: string;
  primary: boolean;
  total: number;
  available: number;
  withheld: number;
}

export interface BalanceSummary {
  source: DataSource;
  asOfTime: string;
  lastRefreshTime: string | null;
  balances: BalanceAccount[];
}

export interface ForecastSummary {
  /** Projected total spending for the calendar month, in the summary currency. */
  amount: number;
  /** Average spending per elapsed calendar day this month. */
  averageDailySpend: number;
  /** Number of calendar days elapsed in the current UTC month. */
  daysElapsed: number;
  /** Total number of days in the current UTC month. */
  daysInMonth: number;
  asOfDate: string;
  method: string;
}

export interface SpendingSummary {
  source: DataSource;
  currency: "USD";
  period: {
    startDate: string;
    endDate: string;
  };
  totalSpent: number;
  totalIncome: number;
  totalRefunds: number;
  netCashFlow: number;
  expenseTransactionCount: number;
  transactionCount: number;
  byCategory: CategoryTotal[];
  topCategory: CategoryTotal | null;
  forecast: ForecastSummary;
  suspiciousMemos: SuspiciousMemo[];
  excludedCurrencyCount: number;
  generatedAt: string;
}

export interface TransactionQueryResult {
  source: DataSource;
  startDate: string;
  endDate: string;
  count: number;
  truncated: boolean;
  transactions: NormalizedTransaction[];
  suspiciousMemos: SuspiciousMemo[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface ChatResponse {
  reply: string;
  toolCalls: AuditEntry[];
  auditLog: AuditEntry[];
  mode: DataSource;
  securityWarnings: string[];
  rateLimit?: RateLimitInfo;
}

export interface DashboardResponse {
  mode: DataSource;
  balance: BalanceSummary;
  spending: SpendingSummary;
  generatedAt: string;
  auditLog: AuditEntry[];
  rateLimit?: RateLimitInfo;
}

export interface DemoModeResponse {
  demoMode: boolean;
  message: string;
  auditLog: AuditEntry[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
  reply: string;
  toolCalls: AuditEntry[];
  auditLog: AuditEntry[];
  rateLimit?: RateLimitInfo;
}

export interface TransactionDateRange {
  startDate: string;
  endDate: string;
}

export const DISCLAIMER =
  "This is educational information, not financial advice.";

export const FOOTER_DISCLAIMER =
  "Educational only. This is not financial advice.";
