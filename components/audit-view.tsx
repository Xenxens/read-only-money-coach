"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useApp } from "@/components/app-provider";
import { ModeBadge, StatusBadge, ToolBadge, ToolLabel } from "@/components/badges";
import { formatDateTime, formatDuration } from "@/lib/format";
import {
  TOOL_NAMES,
  type AuditStatus,
  type DataSource,
  type ToolName,
} from "@/lib/types";

type ModeFilter = "all" | DataSource;
type StatusFilter = "all" | AuditStatus;
type ToolFilter = "all" | ToolName;

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-pine text-cream shadow-sm"
          : "border border-pine/10 bg-white/70 text-ink-soft hover:border-pine/25 hover:text-pine-deep"
      }`}
    >
      {children}
    </button>
  );
}

export function AuditView() {
  const { entries, clearAudit, hydrated, toast } = useApp();
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toolFilter, setToolFilter] = useState<ToolFilter>("all");

  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (modeFilter === "all" || entry.mode === modeFilter) &&
          (statusFilter === "all" || entry.status === statusFilter) &&
          (toolFilter === "all" || entry.tool === toolFilter),
      ),
    [entries, modeFilter, statusFilter, toolFilter],
  );

  const successCount = entries.filter((entry) => entry.status === "success").length;
  const errorCount = entries.filter((entry) => entry.status === "error").length;
  const toolCount = new Set(entries.map((entry) => entry.tool)).size;

  function exportJson() {
    const payload = {
      application: "Read-Only Money Coach",
      exportedAt: new Date().toISOString(),
      storage: "browser localStorage",
      disclaimer: "Educational only. This is not financial advice.",
      entryCount: entries.length,
      entries,
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `read-only-money-coach-audit-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast(`Exported ${entries.length} audit entries.`, "success");
    } catch {
      toast("The audit log could not be exported in this browser.", "error");
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
      toast("Audit log copied to the clipboard.", "success");
    } catch {
      toast("Clipboard access is unavailable. Use Export JSON instead.", "error");
    }
  }

  function clearLog() {
    if (
      !window.confirm(
        "Clear every audit entry stored in this browser? This cannot be undone.",
      )
    ) {
      return;
    }

    clearAudit();
    toast("Local audit log cleared.", "success");
  }

  return (
    <div className="space-y-5">
      <section className="surface p-5 sm:p-6" aria-label="Audit summary">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="eyebrow">Stored reads</p>
            <p className="mt-1 font-display text-3xl font-semibold text-pine-deep">
              {entries.length}
            </p>
          </div>
          <div>
            <p className="eyebrow">Successful</p>
            <p className="mt-1 font-display text-3xl font-semibold text-pine">
              {successCount}
            </p>
          </div>
          <div>
            <p className="eyebrow">Errors</p>
            <p className={`mt-1 font-display text-3xl font-semibold ${errorCount > 0 ? "text-coral" : "text-ink-soft/50"}`}>
              {errorCount}
            </p>
          </div>
          <div>
            <p className="eyebrow">Distinct tools</p>
            <p className="mt-1 font-display text-3xl font-semibold text-pine-deep">
              {toolCount}
              <span className="ml-1 text-sm font-normal text-ink-soft/60">
                of 3
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-pine/10 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportJson}
              disabled={entries.length === 0}
              className="btn-secondary text-xs"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => void copyJson()}
              disabled={entries.length === 0}
              className="btn-ghost text-xs"
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={clearLog}
              disabled={entries.length === 0}
              className="btn-ghost text-xs text-coral hover:bg-coral-soft"
            >
              Clear local log
            </button>
          </div>
          <p className="text-[11px] text-ink-soft/60">
            Newest first · capped at 250 entries · stored only in this browser
          </p>
        </div>
      </section>

      <section className="surface p-4 sm:p-5" aria-label="Audit filters">
        <div className="grid gap-3 lg:grid-cols-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft/60">
              Mode
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterButton
                active={modeFilter === "all"}
                onClick={() => setModeFilter("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={modeFilter === "demo"}
                onClick={() => setModeFilter("demo")}
              >
                Demo
              </FilterButton>
              <FilterButton
                active={modeFilter === "paypal"}
                onClick={() => setModeFilter("paypal")}
              >
                Live sandbox
              </FilterButton>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft/60">
              Tool
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterButton
                active={toolFilter === "all"}
                onClick={() => setToolFilter("all")}
              >
                All
              </FilterButton>
              {TOOL_NAMES.map((tool) => (
                <FilterButton
                  key={tool}
                  active={toolFilter === tool}
                  onClick={() => setToolFilter(tool)}
                >
                  {tool}
                </FilterButton>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft/60">
              Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterButton
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={statusFilter === "success"}
                onClick={() => setStatusFilter("success")}
              >
                Success
              </FilterButton>
              <FilterButton
                active={statusFilter === "error"}
                onClick={() => setStatusFilter("error")}
              >
                Error
              </FilterButton>
            </div>
          </div>
        </div>

        <p className="mt-3 border-t border-pine/10 pt-3 text-[11px] text-ink-soft/60">
          Showing {filtered.length} of {entries.length} entries.
        </p>
      </section>

      {!hydrated ? (
        <div className="surface p-6" aria-busy="true">
          <div className="h-4 w-44 animate-pulse rounded-full bg-pine/10" />
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-pine/5" />
          <p className="mt-3 text-xs text-ink-soft/60">
            Loading the audit log from this browser…
          </p>
        </div>
      ) : entries.length === 0 ? (
        <section className="surface p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-pine">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path
                d="M8 5h8M8 9h8M8 13h5M6 3h12a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            No reads on the record yet.
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-soft">
            Open the dashboard or ask the coach a question. Every balance,
            transaction, and spending read is appended here with its exact
            parameters and result.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className="btn-primary">
              Load the dashboard
            </Link>
            <Link href="/chat" className="btn-secondary">
              Ask the coach
            </Link>
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <section className="surface p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-ink">
            No entries match these filters.
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            There are {entries.length} entries in the full log.
          </p>
          <button
            type="button"
            onClick={() => {
              setModeFilter("all");
              setStatusFilter("all");
              setToolFilter("all");
            }}
            className="btn-secondary mt-4 text-xs"
          >
            Reset filters
          </button>
        </section>
      ) : (
        <ol className="space-y-3" aria-label="Audit entries">
          {filtered.map((entry) => (
            <li key={entry.id} className="surface overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
                <ToolBadge tool={entry.tool} />
                <StatusBadge status={entry.status} />
                <ModeBadge mode={entry.mode} />
                <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-soft/70">
                  {entry.trigger}
                </span>
                <span className="ml-auto text-[11px] text-ink-soft/60">
                  {formatDateTime(entry.timestamp)} ·{" "}
                  {formatDuration(entry.durationMs)}
                </span>
              </div>

              <div className="border-t border-pine/10 bg-cream/35 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-soft/65">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-pine-deep">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint-strong" aria-hidden="true" />
                    readOnly: true
                  </span>
                  <span>
                    <ToolLabel tool={entry.tool} /> · trigger {entry.trigger}
                  </span>
                  <span className="break-all font-mono text-[10px]">
                    {entry.id}
                  </span>
                </div>

                {entry.error ? (
                  <p className="mt-2 rounded-xl border border-coral/20 bg-coral-soft/70 px-3 py-2 text-xs text-ink">
                    {entry.error}
                  </p>
                ) : null}

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <details className="rounded-xl border border-pine/10 bg-white/80">
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-pine-deep">
                      Parameters
                    </summary>
                    <pre className="max-h-48 overflow-auto border-t border-pine/10 p-3 font-mono text-[10px] leading-5 text-ink-soft">
                      {JSON.stringify(entry.params, null, 2)}
                    </pre>
                  </details>
                  <details className="rounded-xl border border-pine/10 bg-white/80">
                    <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-pine-deep">
                      Result
                    </summary>
                    <pre className="max-h-64 overflow-auto border-t border-pine/10 p-3 font-mono text-[10px] leading-5 text-ink-soft">
                      {JSON.stringify(entry.result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <section className="rounded-2xl border border-pine/10 bg-white/50 p-4 text-[11px] leading-5 text-ink-soft/70">
        <p>
          <strong className="font-semibold text-ink">Demo-grade storage.</strong>{" "}
          This audit log lives in React state and browser localStorage. It is
          never sent to a database. Clearing site data, using another browser,
          or opening a different device starts a new log. The category cache and
          the 20-per-hour rate limit are in-memory server state and reset when
          the serverless instance recycles or the app redeploys.
        </p>
        <p className="mt-1">
          The audit log records read-only tool calls. It never contains API
          keys, OAuth tokens, or full secrets.
        </p>
      </section>
    </div>
  );
}
