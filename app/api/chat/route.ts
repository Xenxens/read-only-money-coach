import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { safeErrorMessage } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildSystemPrompt,
  ensureDisclaimer,
  ensureInjectionWarning,
} from "@/lib/prompt";
import { getOrCreateVisitorId, isDemoMode } from "@/lib/session";
import { buildSecurityWarnings } from "@/lib/safety";
import { createReadOnlyTools, type ToolContext } from "@/lib/tools";
import {
  DISCLAIMER,
  type AuditEntry,
  type ChatResponse,
  type DataSource,
  type RateLimitInfo,
  type SuspiciousMemo,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4_000),
      }),
    )
    .max(10)
    .optional()
    .default([]),
});

function errorResponse(input: {
  status: number;
  code: string;
  message: string;
  reply: string;
  mode: DataSource;
  auditLog?: AuditEntry[];
  rateLimit?: RateLimitInfo;
}) {
  const reply = input.reply.includes(DISCLAIMER)
    ? input.reply
    : `${input.reply} ${DISCLAIMER}`;

  return NextResponse.json(
    {
      error: { code: input.code, message: input.message },
      reply,
      toolCalls: input.auditLog ?? [],
      auditLog: input.auditLog ?? [],
      mode: input.mode,
      securityWarnings: [],
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

function rateLimitReply(resetAt: string): string {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(resetAt));

  return `You've reached the demo limit of 20 requests per hour. Please try again after ${time}. The coach is still strictly read-only. ${DISCLAIMER}`;
}

export async function POST(
  request: Request,
): Promise<NextResponse<ChatResponse | Record<string, unknown>>> {
  const demoMode = isDemoMode();
  const mode: DataSource = demoMode ? "demo" : "paypal";
  getOrCreateVisitorId();

  if (!process.env.OPENAI_API_KEY) {
    return errorResponse({
      status: 503,
      code: "OPENAI_NOT_CONFIGURED",
      message: "OPENAI_API_KEY is not configured.",
      reply:
        "The AI coach needs an OpenAI API key. Add OPENAI_API_KEY to .env.local, or load demo data after configuring the key. No account data was read.",
      mode,
    });
  }

  if (
    !demoMode &&
    (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
  ) {
    return errorResponse({
      status: 503,
      code: "PAYPAL_NOT_CONFIGURED",
      message: "PayPal sandbox credentials are not configured.",
      reply:
        "Live PayPal mode is not configured yet. Add the sandbox credentials to .env.local, or use Load demo data to explore the coach with seeded transactions.",
      mode,
    });
  }

  const visitorId = getOrCreateVisitorId();
  const rate = checkRateLimit(visitorId);

  if (!rate.allowed) {
    return errorResponse({
      status: 429,
      code: "RATE_LIMITED",
      message: "20 requests per visitor per hour.",
      reply: rateLimitReply(rate.info.resetAt),
      mode,
      rateLimit: rate.info,
    });
  }

  let parsedBody: z.infer<typeof requestSchema>;
  try {
    const rawBody: unknown = await request.json();
    const parsed = requestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return errorResponse({
        status: 400,
        code: "INVALID_REQUEST",
        message: "The chat message is empty or too long.",
        reply:
          "Please send a message between 1 and 2,000 characters. I can analyze your read-only PayPal data or explain what I cannot do.",
        mode,
        rateLimit: rate.info,
      });
    }

    parsedBody = parsed.data;
  } catch {
    return errorResponse({
      status: 400,
      code: "INVALID_JSON",
      message: "The request body must be valid JSON.",
      reply: "I couldn't read that request. Please try sending your message again.",
      mode,
      rateLimit: rate.info,
    });
  }

  const now = new Date();
  const toolContext: ToolContext = {
    mode,
    now,
    auditLog: [],
    securityFindings: [],
  };
  const tools = createReadOnlyTools(toolContext);
  const messages: CoreMessage[] = [
    ...parsedBody.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: parsedBody.message },
  ];

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(now),
      messages,
      tools,
      maxSteps: 6,
      temperature: 0.2,
      maxTokens: 900,
      maxRetries: 1,
    });

    let reply = ensureInjectionWarning(
      result.text,
      toolContext.securityFindings,
    );
    reply = ensureDisclaimer(reply);

    const response: ChatResponse = {
      reply,
      toolCalls: toolContext.auditLog,
      auditLog: toolContext.auditLog,
      mode,
      securityWarnings: buildSecurityWarnings(toolContext.securityFindings),
      rateLimit: rate.info,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[chat] generation failed", error);

    const friendly = safeErrorMessage(
      error,
      "The AI coach could not complete that request.",
    );

    let reply =
      "The AI coach could not complete that request. No money-moving action exists or was attempted. Please try again.";
    if (friendly.includes("PayPal issued") || friendly.includes("read-only")) {
      reply = `${friendly} No money-moving action exists or was attempted.`;
    }

    return errorResponse({
      status: 502,
      code: "COACH_UNAVAILABLE",
      message: friendly,
      reply,
      mode,
      auditLog: toolContext.auditLog,
      rateLimit: rate.info,
    });
  }
}
