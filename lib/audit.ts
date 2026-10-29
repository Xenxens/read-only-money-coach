import { randomUUID } from "node:crypto";

import type {
  AuditEntry,
  AuditStatus,
  AuditTrigger,
  DataSource,
  JsonValue,
  ToolName,
} from "@/lib/types";

export function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return "[unserializable result]";
  }
}

export function createAuditEntry(input: {
  tool: ToolName;
  params: Record<string, unknown>;
  result: unknown;
  status: AuditStatus;
  durationMs: number;
  trigger: AuditTrigger;
  mode: DataSource;
  error?: string;
}): AuditEntry {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    tool: input.tool,
    params: toJsonValue(input.params) as Record<string, JsonValue>,
    result: toJsonValue(input.result),
    status: input.status,
    ...(input.error ? { error: input.error } : {}),
    durationMs: Math.max(0, Math.round(input.durationMs)),
    trigger: input.trigger,
    mode: input.mode,
    readOnly: true,
  };
}

export function safeErrorMessage(
  error: unknown,
  fallback = "Something went wrong while reading your PayPal data.",
): string {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 500);
  }

  return fallback;
}
