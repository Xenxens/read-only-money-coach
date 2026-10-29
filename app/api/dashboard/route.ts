import { NextResponse } from "next/server";

import { createAuditEntry, safeErrorMessage } from "@/lib/audit";
import { loadBalance, loadCurrentMonthSpending } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOrCreateVisitorId, isDemoMode } from "@/lib/session";
import type {
  AuditEntry,
  BalanceSummary,
  DashboardResponse,
  DataSource,
  RateLimitInfo,
  SpendingSummary,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function rateLimitReply(resetAt: string): string {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(resetAt));

  return `This dashboard has made 20 read-only requests in the last hour. Try again after ${time}.`;
}

function errorResponse(input: {
  status: number;
  code: string;
  message: string;
  mode: DataSource;
  auditLog?: AuditEntry[];
  rateLimit?: RateLimitInfo;
}): NextResponse<Record<string, unknown>> {
  return NextResponse.json(
    {
      error: { code: input.code, message: input.message },
      mode: input.mode,
      auditLog: input.auditLog ?? [],
      ...(input.rateLimit ? { rateLimit: input.rateLimit } : {}),
    },
    {
      status: input.status,
      headers: input.rateLimit
        ? {
            "Retry-After": String(
              Math.max(
                1,
                Math.ceil(
                  (new Date(input.rateLimit.resetAt).getTime() - Date.now()) /
                    1_000,
                ),
              ),
            ),
          }
        : undefined,
    },
  );
}

export async function GET(): Promise<
  NextResponse<DashboardResponse | Record<string, unknown>>
> {
  const demoMode = isDemoMode();
  const mode: DataSource = demoMode ? "demo" : "paypal";
  const visitorId = getOrCreateVisitorId();

  if (
    !demoMode &&
    (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
  ) {
    return errorResponse({
      status: 503,
      code: "PAYPAL_NOT_CONFIGURED",
      message: "PayPal sandbox credentials are not configured.",
      mode,
    });
  }

  const rate = checkRateLimit(visitorId);
  if (!rate.allowed) {
    return errorResponse({
      status: 429,
      code: "RATE_LIMITED",
      message: rateLimitReply(rate.info.resetAt),
      mode,
      rateLimit: rate.info,
    });
  }

  const auditLog: AuditEntry[] = [];
  const now = new Date();
  let balance: BalanceSummary;
  let spending: SpendingSummary;

  const balanceStartedAt = Date.now();
  try {
    balance = await loadBalance(mode);
    auditLog.push(
      createAuditEntry({
        tool: "get_balance",
        params: {},
        result: { ok: true, readOnly: true, ...balance },
        status: "success",
        durationMs: Date.now() - balanceStartedAt,
        trigger: "dashboard",
        mode,
      }),
    );
  } catch (error) {
    const message = safeErrorMessage(
      error,
      "The balance read did not complete.",
    );
    auditLog.push(
      createAuditEntry({
        tool: "get_balance",
        params: {},
        result: { ok: false, readOnly: true, error: message },
        status: "error",
        error: message,
        durationMs: Date.now() - balanceStartedAt,
        trigger: "dashboard",
        mode,
      }),
    );

    return errorResponse({
      status: 502,
      code: "BALANCE_READ_FAILED",
      message,
      mode,
      auditLog,
      rateLimit: rate.info,
    });
  }

  const spendingStartedAt = Date.now();
  try {
    spending = await loadCurrentMonthSpending(mode, now);
    auditLog.push(
      createAuditEntry({
        tool: "summarize_spending",
        params: {},
        result: { ok: true, readOnly: true, summary: spending },
        status: "success",
        durationMs: Date.now() - spendingStartedAt,
        trigger: "dashboard",
        mode,
      }),
    );
  } catch (error) {
    const message = safeErrorMessage(
      error,
      "The spending summary did not complete.",
    );
    auditLog.push(
      createAuditEntry({
        tool: "summarize_spending",
        params: {},
        result: { ok: false, readOnly: true, error: message },
        status: "error",
        error: message,
        durationMs: Date.now() - spendingStartedAt,
        trigger: "dashboard",
        mode,
      }),
    );

    return errorResponse({
      status: 502,
      code: "SPENDING_READ_FAILED",
      message,
      mode,
      auditLog,
      rateLimit: rate.info,
    });
  }

  const response: DashboardResponse = {
    mode,
    balance,
    spending,
    generatedAt: now.toISOString(),
    auditLog,
    rateLimit: rate.info,
  };

  return NextResponse.json(response);
}
