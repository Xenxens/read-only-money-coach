"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useApp } from "@/components/app-provider";
import type { DemoModeResponse } from "@/lib/types";

type DemoResponse = DemoModeResponse & {
  error?: { code: string; message: string };
};

type Destination = "/chat" | "/dashboard";

export function StartActions() {
  const { appendAudit, updateDemoMode, toast } = useApp();
  const router = useRouter();
  const [pending, setPending] = useState<"demo" | "live" | null>(null);

  async function start(enabled: boolean, destination: Destination) {
    if (pending) {
      return;
    }

    setPending(enabled ? "demo" : "live");

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
      const data = (await response.json()) as DemoResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error?.message ?? "The data source could not be set.");
      }

      updateDemoMode(data.demoMode);
      appendAudit(data.auditLog);
      toast(data.message, "success");
      router.push(destination);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "The data source could not be set.",
        "error",
      );
      setPending(null);
    }
  }

  return (
    <div className="mt-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void start(true, "/chat")}
          disabled={pending !== null}
          className="btn-primary"
        >
          {pending === "demo" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/35 border-t-cream" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          Explore demo data
        </button>

        <button
          type="button"
          onClick={() => void start(false, "/dashboard")}
          disabled={pending !== null}
          className="btn-secondary"
        >
          {pending === "live" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-pine/20 border-t-pine" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M4 18.5V9.5M10 18.5V5.5M16 18.5v-6M22 18.5V7.5"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          )}
          Open live sandbox
        </button>
      </div>

      <p className="mt-3 max-w-lg text-xs leading-5 text-ink-soft/80">
        Demo mode needs no PayPal credentials. Live mode reads the sandbox
        account configured on the server; chat also needs an OpenAI API key.
        Switching modes never moves money.
      </p>
    </div>
  );
}
