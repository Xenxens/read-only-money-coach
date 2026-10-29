import { categorizeTransaction } from "@/lib/categories";
import {
  chunkDateRange,
  toPayPalEnd,
  toPayPalStart,
  validateDateRange,
} from "@/lib/dates";
import type {
  BalanceAccount,
  BalanceSummary,
  NormalizedTransaction,
} from "@/lib/types";

/**
 * SAFETY BOUNDARY
 * --------------------------------------------------------------------------
 * This module deliberately contains only three PayPal operations:
 *   1. POST /v1/oauth2/token                 (getAccessToken)
 *   2. GET  /v1/reporting/transactions       (getTransactions)
 *   3. GET  /v1/reporting/balances           (getBalance)
 *
 * There is no Payments, Orders, Captures, Refunds, Payouts, Vault, Invoicing,
 * or Subscriptions code path anywhere in the application. The API base is
 * hard-coded to PayPal's sandbox host so this app cannot accidentally point at
 * a production merchant.
 */

const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";
const TOKEN_URL = `${PAYPAL_API_BASE}/v1/oauth2/token`;
const TRANSACTIONS_URL = `${PAYPAL_API_BASE}/v1/reporting/transactions`;
const BALANCES_URL = `${PAYPAL_API_BASE}/v1/reporting/balances`;

const REPORTING_SEARCH_SCOPE =
  "https://uri.paypal.com/services/reporting/search/read";
const REPORTING_BALANCES_SCOPE =
  "https://uri.paypal.com/services/reporting/balances/read";
const REQUIRED_READ_SCOPES = [
  REPORTING_SEARCH_SCOPE,
  REPORTING_BALANCES_SCOPE,
] as const;

const FORBIDDEN_SCOPE_PATTERNS = [
  /\/services\/payments(?:\/|$)/i,
  /\/services\/payouts?(?:\/|$)/i,
  /\/services\/invoicing(?:\/|$)/i,
  /\/services\/subscriptions(?:\/|$)/i,
  /\/services\/vault(?:\/|$)/i,
  /\/services\/disputes\/update/i,
  /\/services\/checkout(?:\/|$)/i,
  /\/v1\/payments(?:\/|$)/i,
  /\/v1\/payouts(?:\/|$)/i,
];

const PAGE_SIZE = 500;
const MAX_PAGES_PER_CHUNK = 40;

interface PayPalTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface PayPalMoney {
  currency_code?: string;
  value?: string;
}

interface PayPalTransactionInfo {
  transaction_id?: string;
  transaction_event_code?: string;
  transaction_initiation_date?: string;
  transaction_status?: string;
  transaction_subject?: string;
  transaction_note?: string;
  transaction_amount?: PayPalMoney;
}

interface PayPalPayerInfo {
  payer_name?: {
    given_name?: string;
    surname?: string;
    alternate_full_name?: string;
    full_name?: string;
  };
  business_name?: string;
  email_address?: string;
}

interface PayPalItemDetail {
  item_name?: string;
  item_description?: string;
}

interface PayPalTransactionDetail {
  transaction_info?: PayPalTransactionInfo;
  payer_info?: PayPalPayerInfo;
  cart_info?: {
    item_details?: PayPalItemDetail[];
  };
}

interface PayPalTransactionsResponse {
  transaction_details?: PayPalTransactionDetail[];
  total_items?: number;
  total_pages?: number;
  page?: number;
}

interface PayPalBalanceResponse {
  balances?: Array<{
    currency?: string;
    primary?: boolean;
    total_balance?: PayPalMoney;
    available_balance?: PayPalMoney;
    withheld_balance?: PayPalMoney;
  }>;
  as_of_time?: string;
  last_refresh_time?: string;
}

class PayPalReadOnlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayPalReadOnlyError";
  }
}

class PayPalApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
  }
}

let tokenCache: CachedToken | null = null;
let tokenRequest: Promise<string> | null = null;

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new PayPalReadOnlyError(
      "PayPal sandbox credentials are not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, or use demo mode.",
    );
  }

  return { clientId, clientSecret };
}

function assertTokenIsReadOnly(scopeValue: string | undefined): void {
  if (!scopeValue) {
    throw new PayPalReadOnlyError(
      "PayPal did not return token scopes, so live mode cannot verify the read-only boundary. Use demo mode or reconfigure the sandbox app.",
    );
  }

  const grantedScopes = new Set(
    scopeValue.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean),
  );

  const forbidden = [...grantedScopes].filter((scope) =>
    FORBIDDEN_SCOPE_PATTERNS.some((pattern) => pattern.test(scope)),
  );

  if (forbidden.length > 0) {
    throw new PayPalReadOnlyError(
      "PayPal issued this credential a write-capable scope. Live mode is blocked by the read-only guard. Create or reconfigure a sandbox app with only Transaction Search and balance-reading enabled, wait for the app scope change to take effect, then run `npm run prove:read-only` again.",
    );
  }

  const missing = REQUIRED_READ_SCOPES.filter(
    (scope) => !grantedScopes.has(scope),
  );

  if (missing.length > 0) {
    throw new PayPalReadOnlyError(
      "PayPal did not grant the required reporting scopes. Confirm that Transaction Search and balance reporting are enabled for this sandbox app, then try again after PayPal refreshes app scopes.",
    );
  }
}

async function fetchToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const authorization = Buffer.from(
    `${clientId}:${clientSecret}`,
    "utf8",
  ).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept-Language": "en_US",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | PayPalTokenResponse
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new PayPalApiError(
      `PayPal authentication failed (HTTP ${response.status}). Check the sandbox client ID and secret.`,
      response.status,
    );
  }

  assertTokenIsReadOnly(payload.scope);

  const expiresInSeconds =
    typeof payload.expires_in === "number" ? payload.expires_in : 300;
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, expiresInSeconds - 60) * 1_000,
  };

  return payload.access_token;
}

export async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  if (!tokenRequest) {
    tokenRequest = fetchToken().finally(() => {
      tokenRequest = null;
    });
  }

  return tokenRequest;
}

function parseMoney(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPayerName(payer: PayPalPayerInfo | undefined): string {
  if (!payer) {
    return "";
  }

  if (payer.business_name) {
    return payer.business_name;
  }

  if (payer.payer_name?.alternate_full_name) {
    return payer.payer_name.alternate_full_name;
  }

  if (payer.payer_name?.full_name) {
    return payer.payer_name.full_name;
  }

  const pieces = [
    payer.payer_name?.given_name,
    payer.payer_name?.surname,
  ].filter(Boolean);

  return pieces.join(" ");
}

function normalizeTransaction(
  detail: PayPalTransactionDetail,
): NormalizedTransaction | null {
  const info = detail.transaction_info;
  if (!info?.transaction_id || !info.transaction_initiation_date) {
    return null;
  }

  const itemName = detail.cart_info?.item_details?.[0]?.item_name ?? "";
  const itemDescription =
    detail.cart_info?.item_details?.[0]?.item_description ?? "";
  const payerName = formatPayerName(detail.payer_info);
  const merchant =
    itemName ||
    info.transaction_subject ||
    payerName ||
    detail.payer_info?.email_address ||
    "PayPal transaction";

  const amount = parseMoney(info.transaction_amount?.value);
  const base = {
    id: info.transaction_id,
    date: new Date(info.transaction_initiation_date).toISOString(),
    amount,
    currency: info.transaction_amount?.currency_code ?? "USD",
    merchant,
    memo: info.transaction_note ?? "",
    description: itemDescription || info.transaction_subject || "",
    status: info.transaction_status ?? "UNKNOWN",
    eventCode: info.transaction_event_code ?? "",
    direction: amount > 0 ? ("incoming" as const) : ("outgoing" as const),
  };

  return {
    ...base,
    category: categorizeTransaction(base),
  };
}

async function requestTransactionsPage(
  accessToken: string,
  params: URLSearchParams,
): Promise<PayPalTransactionsResponse> {
  const response = await fetch(`${TRANSACTIONS_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | PayPalTransactionsResponse
    | null;

  if (!response.ok || !payload) {
    throw new PayPalApiError(
      `PayPal Transaction Search failed (HTTP ${response.status}). Confirm that the app has Transaction Search enabled and that the sandbox account has recent transactions.`,
      response.status,
    );
  }

  return payload;
}

export async function getTransactions(
  startDate: string,
  endDate: string,
): Promise<NormalizedTransaction[]> {
  validateDateRange({ startDate, endDate });

  const accessToken = await getAccessToken();
  const chunks = chunkDateRange({ startDate, endDate });
  const transactions: NormalizedTransaction[] = [];

  for (const chunk of chunks) {
    let page = 1;
    let totalPages = 1;

    do {
      if (page > MAX_PAGES_PER_CHUNK) {
        throw new PayPalReadOnlyError(
          "PayPal returned too many pages for one date range. Narrow the dates and try again.",
        );
      }

      const params = new URLSearchParams({
        start_date: toPayPalStart(chunk.startDate),
        end_date: toPayPalEnd(chunk.endDate),
        page_size: String(PAGE_SIZE),
        page: String(page),
        fields: "all",
      });

      const payload = await requestTransactionsPage(accessToken, params);
      const details = payload.transaction_details ?? [];

      for (const detail of details) {
        const normalized = normalizeTransaction(detail);
        if (normalized) {
          transactions.push(normalized);
        }
      }

      totalPages =
        typeof payload.total_pages === "number" && payload.total_pages > 0
          ? payload.total_pages
          : 1;
      page += 1;
    } while (page <= totalPages);
  }

  const seen = new Set<string>();
  return transactions
    .filter((transaction) => {
      if (seen.has(transaction.id)) {
        return false;
      }
      seen.add(transaction.id);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function normalizeBalanceAccount(
  balance: NonNullable<PayPalBalanceResponse["balances"]>[number],
): BalanceAccount {
  return {
    currency: balance.currency ?? "USD",
    primary: Boolean(balance.primary),
    total: parseMoney(balance.total_balance?.value),
    available: parseMoney(balance.available_balance?.value),
    withheld: parseMoney(balance.withheld_balance?.value),
  };
}

export async function getBalance(): Promise<BalanceSummary> {
  const accessToken = await getAccessToken();
  const response = await fetch(BALANCES_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | PayPalBalanceResponse
    | null;

  if (!response.ok || !payload) {
    throw new PayPalApiError(
      `PayPal balance read failed (HTTP ${response.status}). Confirm that balance reporting is enabled for the sandbox app.`,
      response.status,
    );
  }

  return {
    source: "paypal",
    asOfTime:
      payload.as_of_time ?? payload.last_refresh_time ?? new Date().toISOString(),
    lastRefreshTime: payload.last_refresh_time ?? null,
    balances: (payload.balances ?? []).map(normalizeBalanceAccount),
  };
}
