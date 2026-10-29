"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useApp } from "@/components/app-provider";
import type { DemoModeResponse } from "@/lib/types";

type DemoResponse = DemoModeResponse & {
  error?: { code: string; message: string };
};

export function ModeSwitch() {
  const { demoMode, updateDemoMode, appendAudit, toast } = useApp();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function changeMode(enabled: boolean) {
    if (pending || enabled === demoMode) {
      return;
    }

    setPending(true);

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
        throw new Error(
          data.error?.message ?? "The data source could not be changed.",
        );
      }

      updateDemoMode(data.demoMode);
      appendAudit(data.auditLog);
      toast(data.message, "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "The data source could not be changed.",
        "error",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="inline-flex shrink-0 items-center rounded-full border border-pine/15 bg-white/70 p-1 text-xs font-semibold shadow-sm"
      role="group"
      aria-label="Data source"
      aria-busy={pending}
    >
      <button
        type="button"
        onClick={() => void changeMode(true)}
        disabled={pending}
        aria-pressed={demoMode}
        title="Use 25 seeded transactions and a fixed balance. No PayPal account is contacted."
        className={`rounded-full px-3 py-1.5 transition ${
          demoMode
            ? "bg-pine text-cream shadow-sm"
            : "text-pine-soft hover:bg-pine/5"
        }`}
      >
        Demo
      </button>
      <button
        type="button"
        onClick={() => void changeMode(false)}
        disabled={pending}
        aria-pressed={!demoMode}
        title="Read the live PayPal sandbox account configured on the server."
        className={`rounded-full px-3 py-1.5 transition ${
          !demoMode
            ? "bg-gold-soft text-ink shadow-sm"
            : "text-pine-soft hover:bg-pine/5"
        }`}
      >
        Live sandbox
      </button>
    </div>
  );
}
