import { NextResponse } from "next/server";
import { z } from "zod";

import { isDemoMode, setDemoMode } from "@/lib/session";
import type { DemoModeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  enabled: z.boolean(),
});

function demoMessage(enabled: boolean): string {
  return enabled
    ? "Demo data loaded: 25 seeded transactions and a fixed sandbox balance. No PayPal account is connected."
    : "Demo data cleared. The next read will use the live PayPal sandbox credentials configured on the server.";
}

export async function GET(): Promise<NextResponse<DemoModeResponse>> {
  const demoMode = isDemoMode();

  return NextResponse.json({
    demoMode,
    message: demoMessage(demoMode),
    auditLog: [],
  });
}

export async function POST(
  request: Request,
): Promise<NextResponse<DemoModeResponse | Record<string, unknown>>> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "The request body must be valid JSON.",
        },
        demoMode: isDemoMode(),
        message: "The demo mode change was not applied.",
        auditLog: [],
      },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: 'Send { "enabled": true } or { "enabled": false }.',
        },
        demoMode: isDemoMode(),
        message: "The demo mode change was not applied.",
        auditLog: [],
      },
      { status: 400 },
    );
  }

  setDemoMode(parsed.data.enabled);

  return NextResponse.json({
    demoMode: parsed.data.enabled,
    message: demoMessage(parsed.data.enabled),
    auditLog: [],
  });
}
